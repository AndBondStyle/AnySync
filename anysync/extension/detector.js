import Spectrum from 'spectrum-analyzer';

export default class Detector {
    constructor(samplerate) {
        this.samplerate = samplerate;

        this.beeplen = 50;
        this.winsize = 1024;
        this.winstep = 32;
        this.minvolume = -10;

        this.peaksize = this.beeplen * this.samplerate / this.winstep;
        this.accuracy = this.peaksize / 2;
        this.kernel = this.makeKernel();
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

    detect(signal, freqs) {
        let items = [];
        let volumes = [];
        for (let freq of freqs) {
            let realindex = freq * this.winsize / this.samplerate;
            let index = Math.floor(realindex);
            let mixratio = realindex - index;
            items.push([index, mixratio]);
            volumes.push([]);
        }

        let spectrum = new Spectrum(this.winsize);
        for (let i = 0; i < signal.length - this.winsize; i += this.winstep) {
            spectrum.appendData(signal.slice(i, i + this.winsize));
            spectrum.recompute();
            for (let j = 0; j < freqs.length; j++) {
                let [index, mixratio] = items[j];
                let left = Math.log10(spectrum.power[index]) * (1 - mixratio);
                let right = Math.log10(spectrum.power[index + 1]) * mixratio;
                volumes[i].push(left + right);
            }
        }

        let beeps = [];
        for (let i = 0; i < freqs.length; i++) {
            let smoothed = this.smooth(volumes[i]);
            let threshold = this.binsearch(smoothed);
            let beep = this.extract(volumes[i], threshold);
            console.debug('[D] ANALYZE FREQ:', freqs[i]);
            console.debug('[D] THRESHOLD:', threshold);
            console.debug('[D] EXTRACTED BEEP:', beep);
        }
        return beeps;
    }

    smooth(volume) {
        let extended = new Array(volume.length + this.peaksize).fill(this.minvolume);
        extended.splice(Math.floor(this.peaksize / 2), volume.length, ...volume);
        let result = new Array(volume.length).fill(0);
        for (let i = 0; i < volume.length; i++) {
            for (let j = 0; j < this.peaksize; j++) {
                result[i] += this.kernel[j] * extended[i + j];
            }
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
        volume = volume.slice();
        let first = volume.findIndex(x => x > threshold);
        let last = volume.length - volume.reverse().findIndex(x => x > threshold);
        console.debug('[D] PEAK WIDTH:', last - first);
        console.debug('[D] EXPECTED:', this.peaksize, '\u00B1', this.accuracy);
        if (Math.abs(this.peaksize - (last - first)) > this.accuracy) return null;
        return Math.floor((first + last) / 2);
    }
}
