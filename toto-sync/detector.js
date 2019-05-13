import getUserMedia from 'get-user-media-promise';
import Spectrum from 'spectrum-analyzer';

export default class Detector {
    constructor(context, time) {
        this.context = context;
        this.time = time;
        this.stream = null;
        this.recorder = null;
        this.oscillator = null;
        this.export = null;

        this.margins = [500 / 1000, 500 / 1000];
        this.beeplen = 50 / 1000;
        this.beepstep = 100 / 1000;

        this.samplerate = this.context.sampleRate;
        this.winsize = 1024;
        this.winstep = 32;
        this.minvolume = -10;
        this.peaksize = this.beeplen * this.samplerate / this.winstep;
        this.accuracy = this.peaksize / 2;
        this.kernel = this.makeKernel();

        this.freqs = [24, 28, 32, 36, 40, 44, 48].map(x => x * this.samplerate / this.winsize);
        this.config = {noiseSuppression: false, echoCancellation: false};
        try { getUserMedia({audio: this.config}).then(s => s.getAudioTracks().map(x => x.stop())); }
        catch (err) { console.warn('[D] INITIAL MIC REQUEST FAILED:', err) }
    }

    schedule(count, start) {
        if (count > this.freqs.length) console.error('[D] TOO MANY DEVICES');
        count = Math.min(count, this.freqs.length);
        let detfreqs = this.freqs.slice(0, count);
        let time = start + this.margins[0];
        let configs = [];
        for (let i = 0; i < count; i++) {
            configs.push({
                start: start,
                beep: true,
                record: false,
                beeptime: time,
                beepfreq: this.freqs[i],
                detfreqs: detfreqs,
            });
            time += this.beepstep;
        }
        configs.map(x => x.end = time + this.margins[1]);
        return configs;
    }

    async prepare(config) {
        console.log('[D] BEGIN PREPARING AT:', new Date().getTime());
        if (!config.record) {
            console.debug('[D] RECORDING NOT NEEDED');
            console.log('[D] DONE PREPARING AT:', new Date().getTime());
            return;
        }
        try {
            console.debug('[D] REQUESTING MIC AT:', new Date().getTime());
            this.stream = await getUserMedia({audio: this.config});
            console.debug('[D] ACQUIRED MIC AT:', new Date().getTime());
        } catch (err) {
            console.warn('[D] FAILED TO ACQUIRE MIC:', err);
            return;
        }
        this.recorder = new MediaRecorder(this.stream);
        let resolve = null;
        this.recorder.done = new Promise(r => resolve = r);
        this.recorder.ondataavailable = async e => {
            console.debug('[D] ACTUALLY STOPPED AT:', new Date().getTime());
            console.debug('[D] RECORDING FINISHED');
            console.debug('[D] RECORDED DATA:', e);
            let reader = new FileReader();
            let promise = new Promise(r => reader.onloadend = () => r(reader.result));
            reader.readAsArrayBuffer(e.data);
            let data = await promise;
            if (data.byteLength === 0) {
                console.error('[!!!] GOT EMPTY RECORDING');
                resolve(null);
            }
            let buffer = await this.context.decodeAudioData(data);
            let silence = buffer.getChannelData(0).findIndex(x => x !== 0);
            console.debug('[D] LENGTH OF INITIAL SILENCE:', silence);
            this.recorder = null;
            this.export = {
                signal: buffer.getChannelData(0),
                samplerate: buffer.sampleRate,
                beeplen: this.beeplen,
                detfreqs: this.freqs,
            };
            resolve(buffer);
        };
        console.log('[D] DONE PREPARING AT:', new Date().getTime());
    }

    async sync(config) {
        console.log('[D] BEGIN SYNCING AT:', new Date().getTime());
        if (config.beep) this.beep(config.beepfreq, config.beeptime);
        if (!config.record || !this.recorder) return null;
        console.log('[D] RECORDING...');
        console.debug('[D] STARTING RECORDER AT:', new Date().getTime());
        this.recorder.start();
        setTimeout(() => {
            console.debug('[D] STOPPING RECORDER AT:', new Date().getTime());
            this.recorder.stop()
        }, (config.end - this.time()) * 1000);
        let buffer = await this.recorder.done;
        if (buffer === null) return null;
        let signal = buffer.getChannelData(0);
        let beeps = config.detfreqs.map(freq => this.detect(signal, freq));
        this.stream.getAudioTracks().map(x => x.stop());
        return beeps;
    }

    beep(freq, time) {
        console.log('[D] SCHEDULING BEEP AT:', new Date().getTime());
        this.oscillator = this.context.createOscillator();
        this.oscillator.connect(this.context.destination);
        this.oscillator.frequency.setValueAtTime(freq, 0);
        this.oscillator.type = 'sine';
        let offset = time - this.time();
        console.log('[D] SECONDS BEFORE BEEP:', offset);
        if (offset < 0) console.error('[!!!] TOO LATE');
        let start = this.context.currentTime + offset;
        this.oscillator.start(start);
        this.oscillator.stop(start + this.beeplen);
    }

    detect(signal, freq) {
        let spectrum = new Spectrum(this.winsize);
        let realindex = freq * this.winsize / this.samplerate;
        let index = Math.floor(realindex);
        let mixratio = realindex - index;
        let volume = [];

        for (let i = 0; i < signal.length - this.winsize; i += this.winstep) {
            spectrum.appendData(signal.slice(i, i + this.winsize));
            spectrum.recompute();
            let left = Math.log10(spectrum.power[index]) * (1 - mixratio);
            let right = Math.log10(spectrum.power[index + 1]) * mixratio;
            volume.push(left + right);
        }

        let smoothed = this.smooth(volume);
        let threshold = this.binsearch(smoothed);
        let beep = this.extract(volume, threshold);
        console.log('[D] ANALYZE FREQ:', freq);
        console.log('[D] THRESHOLD:', threshold);
        console.log('[D] EXTRACTED BEEP:', beep);
        return beep;
    }

    makeKernel() {
        let mean = this.peaksize / 2;
        let sigma = this.peaksize / 4;
        let gauss = i => (
            1 / (sigma * Math.sqrt(2 * Math.PI)) *
            Math.exp(-Math.pow(i - mean, 2) / (2 * sigma * sigma))
        );
        let kernel = new Array(this.peaksize).fill(0).map((x, i) => gauss(i));
        let sum = kernel.reduce((a, b) => a + b, 0);
        return kernel.map(x => x / sum);
    }

    smooth(volume) {
        let extended = new Array(volume.length + this.peaksize).fill(this.minvolume);
        extended.splice(Math.floor(this.peaksize / 2), volume.length, ...volume);
        let result = new Array(volume.length);
        for (let i = 0; i < volume.length; i++) {
            let sum = 0;
            for (let j = 0; j < this.peaksize; j++) {
                sum += this.kernel[j] * extended[i + j];
            }
            result[i] = sum;
        }
        return result;
    }

    binsearch(volume) {
        let left = this.minvolume;
        let right = 0;
        while (right - left > 0.01) {
            let mid = left + (right - left) / 2;
            let peaks = volume.map(x => x > mid);
            if (this.check(peaks)) left = mid;
            else right = mid;
        }
        return left;
    }

    check(peaks) {
        let first = null;
        let last = null;
        let found = false;
        let prev = false;
        for (let i = 0; i < peaks.length; i++) {
            if (found && peaks[i]) return true;
            if (!found && !prev && peaks[i]) first = i;
            if (prev && !peaks[i]) last = i;
            found = (first !== null) && (last !== null);
            prev = peaks[i];
        }
        if (first === last) first = last = 0;
        return (last - first) >= 1;
    }

    extract(volume, threshold) {
        let first = volume.findIndex(x => x > threshold);
        let last = volume.length - volume.slice().reverse().findIndex(x => x > threshold);
        console.log('[D] PEAK WIDTH:', last - first);
        console.log('[D] EXPECTED:', this.peaksize, '\u00B1', this.accuracy);
        if (Math.abs(this.peaksize - (last - first)) > this.accuracy) return null;
        return (first + last) / 2 * this.winstep / this.samplerate;
    }
}
