import Spectrum from 'spectrum-analyzer';
import getUserMedia from "get-user-media-promise";

export default class Detector {
    constructor(context, stream, config) {
        this.context = context;
        this.stream = stream;
        this.config = config;
    }

    async record(duration) {
        let resolve = null;
        let done = new Promise(r => resolve = r);
        let recorder = new MediaRecorder(this.stream);
        recorder.ondataavailable = e => resolve(e.data);
        recorder.start();
        setTimeout(() => recorder.stop(), duration);
        let reader = new FileReader();
        let promise = new Promise(r => reader.onloadend = () => r(reader.result));
        reader.readAsArrayBuffer(await done);
        return await promise;
    }

    async detect(data) {
        const winsize = this.config.winsize || 1024;
        const winstep = this.config.winstep || 32;
        const index = this.config.index || 10;

        let buffer = await this.context.decodeAudioData(data.slice());
        let signal = buffer.getChannelData(0);
        let spectrum = new Spectrum(winsize);
        let levels = [];
        let skip = true;

        for (let i = 0; i < signal.length - winsize; i += winstep) {
            spectrum.appendData(signal.slice(i, i + winsize));
            spectrum.recompute();
            let value = Math.log10(spectrum.power[index]);
            if (skip && value === -Infinity) continue;
            levels.push(value);
            skip = false;
        }

        let threshold = this.binsearch(levels);
        console.log(threshold);
        return {levels, threshold};
    }

    binsearch(levels) {
        let left = -12;
        let right = 0;
        while (right - left > 0.01) {
            let mid = left + (right - left) / 2;
            let peaks = levels.map(x => x > mid);
            if (this.check(peaks)) left = mid;
            else right = mid;
        }
        return left;
    }

    check(peaks) {
        const peak_width = (50 / 1000) * this.context.sampleRate / this.config.winstep; // TODO
        let found_peaks = []
        let peak_cnt = 0;
        for (let i = 0; i < peaks.length; ++i) {
            if (peaks[i]) {
                peak_cnt++;
                if (peak_cnt === peak_width) {
                    found_peaks.push([i - peak_width, i]);
                    peak_cnt = 0;
                }
            }
            else {
                peak_cnt = 0;
            }
        }

        return found_peaks.length >= 1; // TODO
    }
}
