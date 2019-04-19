import getUserMedia from 'get-user-media-promise';
import Spectrum from 'spectrum-analyzer';

export default class Detector {
    constructor(context, time) {
        this.context = context;
        this.time = time;
        this.stream = null;
        this.recorder = null;
        this.oscillator = null;

        this.samplerate = this.context.sampleRate;
        this.margins = [500 / 1000, 1000 / 1000];
        this.beeplen = 50 / 1000;
        this.beepstep = 100 / 1000;
        this.winsize = 1024;
        this.winstep = 32;
        this.accuracy = 10;
        this.freqs = [24, 28, 32, 36, 40, 44, 48].map(x => x * this.samplerate / this.winsize);
        this.peaksize = this.beeplen * this.samplerate / this.winstep;
        this.config = {noiseSuppression: false, echoCancellation: false};
        try { getUserMedia({audio: this.config}).then(s => s.getAudioTracks().map(x => x.stop())); }
        catch (err) { console.warn('[D] INITIAL MIC REQUEST FAILED:', err) }
    }

    async prepare() {
        console.log('[D] PREPARING...');
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
            console.debug('[!!!] ACTUALLY STOPPED AT:', new Date().getTime());
            console.debug('[D] RECORDING FINISHED');
            console.debug('[D] RECORDED DATA:', e);
            let reader = new FileReader();
            let promise = new Promise(r => reader.onloadend = () => r(reader.result));
            reader.readAsArrayBuffer(e.data);
            let data = await promise;
            console.debug('[D] READER DATA:', data);
            let buffer = await this.context.decodeAudioData(data);
            console.debug('[D] BUFFER:', buffer);
            let silence = buffer.getChannelData(0).findIndex(x => x !== 0);
            console.debug('[D] LENGTH OF INITIAL SILENCE:', silence);
            this.recorder = null;
            resolve(buffer);
        }
    }

    schedule(count, start) {
        if (count > this.freqs.length) console.error('[D] TOO MANY DEVICES');
        count = Math.min(count, this.freqs.length);
        let duration = this.margins[0] + this.margins[1] + count * this.beepstep;
        let detfreqs = this.freqs.slice(0, count);
        let time = start + this.margins[0];
        let configs = [];
        for (let i = 0; i < count; i++) {
            configs.push({
                beep: true,
                record: false,
                beeptime: time,
                beepfreq: this.freqs[i],
                duration: duration,
                detfreqs: detfreqs,
            })
            time += this.beepstep;
        }
        return configs;
    }

    async sync(config) {
        console.log('[D] SYNCING...');
        if (config.beep) this.beep(config.beepfreq, config.beeptime);
        if (!config.record || !this.recorder) return null;
        console.log('[D] RECORDING...');
        console.debug('[!!!] STARTING RECORDER AT:', new Date().getTime());
        this.recorder.start();
        setTimeout(() => {
            console.debug('[!!!] STOPPING RECORDER AT:', new Date().getTime());
            this.recorder.stop()
        }, config.duration * 1000
        );
        let buffer = await this.recorder.done;
        let signal = buffer.getChannelData(0);
        let beeps = config.detfreqs.map(freq => this.analyze(signal, freq));
        console.debug('[D] DETECTION RESULT:', beeps);
        this.stream.getAudioTracks().map(x => x.stop());
        return beeps;
    }

    beep(freq, time) {
        this.oscillator = this.context.createOscillator();
        this.oscillator.connect(this.context.destination);
        this.oscillator.frequency.setValueAtTime(freq, 0);
        this.oscillator.type = 'sine';
        console.log('[D] SECONDS BEFORE BEEP:', time - this.time());
        let start = this.context.currentTime + time - this.time();
        this.oscillator.start(start);
        this.oscillator.stop(start + this.beeplen);
    }

    analyze(signal, freq) {
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

        let threshold = this.binsearch(volume);
        let peaks = volume.map(x => x > threshold);
        let beep = this.extract(peaks);
        console.debug('[D] ANALYZE FREQ:', freq);
        console.debug('[D] THRESHOLD:', threshold);
        console.debug('[D] EXTRACTED BEEP:', beep);
        return beep;
    }

    binsearch(volume) {
        let left = -20;
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
        for (let i = 0; i < peaks.length; i++) {
            if (!peaks[i]) continue;
            if (first === null) first = i;
            last = i;
        }
        if (first === last) first = last = 0;
        return (last - first) >= this.peaksize;
    }

    extract(peaks) {
        console.log(peaks);
        let first = null;
        let last = null;
        let found = false;
        let prev = false;
        peaks.push(false);
        for (let i = 0; i < peaks.length; i++) {
            if (found && peaks[i]) console.debug('[D] FOUND EXTRA PEAK (!!!)');
            if (!found && !prev && peaks[i]) first = i;
            if (prev && !peaks[i]) last = i;
            found = (first !== null) && (last !== null);
            prev = peaks[i];
        }
        if (!found) return null;
        let error = Math.abs(this.peaksize - (last - first));
        if (error > this.accuracy) {
            console.debug('[D] FAILED TO EXTRACT BEEP DUE TO ACCURACY ERROR');
            console.debug('[D] RISING EDGE:', first);
            console.debug('[D] FALLING EDGE:', last);
            console.debug('[D] PEAK WIDTH:', (last - first));
            console.debug('[D] EXPECTED WIDTH:', this.peaksize);
            return null;
        }
        return (first + last) / 2 * this.winstep / this.samplerate;
    }
}
