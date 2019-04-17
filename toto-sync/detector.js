import getUserMedia from 'get-user-media-promise';
import Spectrum from 'spectrum-analyzer';

export default class Detector {
    constructor(context) {
        this.context = context;
        this.stream = null;
        this.recorder = null;
        this.oscillator = null;

        this.samplerate = this.context.sampleRate;
        this.freqs = [843, 937, 1031, 1125];
        this.margin = 500 / 1000;
        this.beeplen = 50 / 1000;
        this.beepstep = 100 / 1000;
        this.winsize = 1024;
        this.winstep = 32;
        this.accuracy = 10;
        this.peaksize = this.beeplen * this.samplerate / this.winstep;
        this.config = {noiseSuppression: false, echoCancellation: false};
        getUserMedia({audio: this.config}).then(s => s.getAudioTracks().map(x => x.stop()));
    }

    async prepare() {
        console.log('PREPARING MIC..');
        this.stream = await getUserMedia({audio: this.config});
        this.recorder = new MediaRecorder(this.stream);
        let resolve = null;
        this.recorder.done = new Promise(r => resolve = r);
        this.recorder.ondataavailable = async e => {
            let reader = new FileReader();
            let promise = new Promise(r => reader.onloadend = () => r(reader.result));
            reader.readAsArrayBuffer(e.data);
            let buffer = await this.context.decodeAudioData(await promise);
            resolve(buffer);
        }
    }

    schedule(count, start) {
        if (count > this.freqs.length) console.error('TOO MANY DEVICES');
        count = Math.min(count, this.freqs.length);
        let duration = this.margin * 2 + count * this.beepstep;
        let detfreqs = this.freqs.slice(0, count);
        let time = start + this.margin;
        let configs = [];
        for (let i = 0; i < count; i++) {
            configs.push({
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
        console.log('RECORDING...');
        this.recorder.start();
        setTimeout(() => this.recorder.stop(), config.duration * 1000);
        this.beep(config.beepfreq, config.beeptime);
        let buffer = await this.recorder.done;
        let signal = buffer.getChannelData(0);
        let beeps = config.detfreqs.map(freq => this.analyze(signal, freq));
        console.log('DETECTION RESULT:', beeps);
        this.stream.getAudioTracks().map(x => x.stop());
        return beeps;
    }

    beep(freq, time) {
        this.oscillator = this.context.createOscillator();
        this.oscillator.connect(this.context.destination);
        this.oscillator.frequency.setValueAtTime(freq, 0);
        this.oscillator.type = 'sine';
        this.oscillator.start(time);
        this.oscillator.stop(time + this.beeplen);
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
            let left = Math.log10(spectrum.power[index] * (1 - mixratio));
            let right = Math.log10(spectrum.power[index + 1] * mixratio);
            volume.push((left + right) / 2);
        }

        let threshold = this.binsearch(volume);
        let peaks = volume.map(x => x > threshold);
        let beep = this.extract(peaks);
        // console.log('ANALYZE FREQ:', freq);
        // console.log('THRESHOLD:', threshold);
        // console.log('EXTRACTED BEEP:', beep);
        return beep;
    }

    binsearch(volume) {
        let left = -12;
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
        let first = null;
        let last = null;
        let found = false;
        let prev = null;
        for (let i = 0; i < peaks.length; i++) {
            if (found && peaks[i]) return null;
            if (!prev && peaks[i]) first = i;
            if (prev && !peaks[i]) last = i;
            found = (first !== null) && (last !== null);
            prev = peaks[i];
        }
        let error = Math.abs(this.peaksize - (last - first));
        if (error > this.accuracy) return null;
        return first * this.winstep / this.samplerate;
    }
}
