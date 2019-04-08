import Spectrum from 'spectrum-analyzer';
import getUserMedia from "get-user-media-promise";

export default class Detector {
    constructor(context, stream) {
        this.context = context;
        this.stream = stream;
    }

    async record(duration) {
        this.stream = await getUserMedia({audio: true});

        let resolve = null;
        let done = new Promise(r => resolve = r);
        let recorder = new MediaRecorder(this.stream);
        recorder.ondataavailable = e => resolve(e.data);
        recorder.start();
        setTimeout(() => recorder.stop(), duration);
        let reader = new FileReader();
        let promise = new Promise(r => reader.onloadend = () => r(reader.result));
        reader.readAsArrayBuffer(await done);

        this.stream.getTracks()[0].stop();
        return await promise;
    }

    async detect(data, config) {
        const winsize = config.winsize || 1024;
        const winstep = config.winstep || 32;
        const index = config.index || 10;

        let buffer = await this.context.decodeAudioData(data);
        let signal = buffer.getChannelData(0);
        console.log(buffer.length);
        let spectrum = new Spectrum(winsize);
        let levels = [];

        for (let i = 0; i < signal.length - winsize; i += winstep) {
            spectrum.appendData(signal.slice(i, i + winsize));
            spectrum.recompute();
            let value = spectrum.power[index];
            levels.push(Math.log10(value));
        }

        return levels;
    }
}
