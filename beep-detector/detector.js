import Spectrum from 'spectrum-analyzer';

export default class Detector {
    constructor(samplerate, beeplen) {
        this.samplerate = samplerate;
        this.beeplen = beeplen;
        this.export = null;

        this.winsize = 1024;
        this.winstep = 32;
        this.minvolume = -10;
        this.peaksize = this.beeplen * this.samplerate / this.winstep;
        this.accuracy = this.peaksize / 2;
        this.kernel = this.makeKernel();
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
        console.debug('[D] ANALYZE FREQ:', freq);
        console.debug('[D] THRESHOLD:', threshold);
        console.debug('[D] EXTRACTED BEEP:', beep);
        this.export = {threshold, volume, smoothed};
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
        let extended = new Float32Array(volume.length + this.peaksize).fill(-Infinity);
        extended.set(volume, Math.floor(this.peaksize / 2));
        let result = new Float32Array(volume.length);
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
        console.log('PEAK WIDTH:', last - first);
        if (Math.abs(this.peaksize - (last - first)) > this.accuracy) return null;
        return Math.floor((first + last) / 2);
    }
}
