import Spectrum from 'spectrum-analyzer';

// BEEP DURATION (S)
const beeplen = 50 / 1000;
// FFT WINDOW SIZE (SAMPLES)
const winsize = 1024;
// FFT WINDOW STEP (SAMPLES)
const winstep = 32;
// MIN DETECTION VOLUME (DB)
const minvolume = -10;
// ACCURACY RATIO
const accratio = 0.8;

export default class Detector {
    constructor(samplerate) {
        this.samplerate = samplerate;
        this.peaksize = beeplen * this.samplerate / winstep;
        this.accuracy = this.peaksize * accratio;
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
            let realindex = freq * winsize / this.samplerate;
            let index = Math.floor(realindex);
            let mixratio = realindex - index;
            items.push([index, mixratio]);
            volumes.push([]);
        }

        let spectrum = new Spectrum(winsize);
        for (let i = 0; i < signal.length - winsize; i += winstep) {
            spectrum.appendData(signal.slice(i, i + winsize));
            spectrum.recompute();
            for (let j = 0; j < freqs.length; j++) {
                let [index, mixratio] = items[j];
                let left = Math.log10(spectrum.power[index]) * (1 - mixratio);
                let right = Math.log10(spectrum.power[index + 1]) * mixratio;
                volumes[j].push(left + right);
            }
        }

        let beeps = [];
        for (let i = 0; i < freqs.length; i++) {
            let smoothed = this.smooth(volumes[i]);
            let threshold = this.binsearch(smoothed);
            let beep = this.extract(volumes[i], threshold);
            console.debug('[DETECT] ANALYZE FREQ:', freqs[i]);
            console.debug('[DETECT] THRESHOLD:', threshold);
            console.debug('[DETECT] EXTRACTED BEEP:', beep);
            beeps.push(beep);
        }
        console.debug('[DETECT] FINAL RESULT:', beeps);
        return beeps;
    }

    smooth(volume) {
        let extended = new Array(volume.length + this.peaksize).fill(minvolume);
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
        let left = minvolume;
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
        console.debug('[DETECT] PEAK WIDTH:', last - first);
        console.debug('[DETECT] EXPECTED:', this.peaksize, '\u00B1', this.accuracy);
        if (Math.abs(this.peaksize - (last - first)) > this.accuracy) return null;
        return (first + last) / 2 * winstep / this.samplerate;
    }
}
