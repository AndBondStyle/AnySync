import Spectrum from 'spectrum-analyzer';

export default class Detector {
    constructor(samplerate, beeplen) {
        this.samplerate = samplerate;
        this.beeplen = beeplen;
        this.export = null;

        this.accuracy = 10;
        this.winsize = 1024;
        this.winstep = 32;
        this.peaksize = this.beeplen * this.samplerate / this.winstep;
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

        let threshold = this.binsearch(volume);
        let peaks = volume.map(x => x > threshold);
        let beep = this.extract(peaks);
        console.debug('[D] ANALYZE FREQ:', freq);
        console.debug('[D] THRESHOLD:', threshold);
        console.debug('[D] EXTRACTED BEEP:', beep);
        this.export = {threshold, volume};
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
        let first = null;
        let last = null;
        let found = false;
        let prev = false;
        peaks.push(false);
        for (let i = 0; i < peaks.length; i++) {
            if (found && peaks[i]) console.warn('[D] FOUND EXTRA PEAK');
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
