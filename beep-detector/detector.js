export default class Detector {
    constructor(context, source, config) {
        this.context = context;
        this.source = source;
        this.config = config;
        this.processor = context.createScriptProcessor(config.fftSize, 1, 1);
        this.analyser = new AnalyserNode(context, {
            fftSize: config.fftSize,
            minDecibels: config.minVolume,
            maxDecibels: config.maxVolume,
            smoothingTimeConstant: 0,
        });
        this.fft = new Uint8Array(this.analyser.frequencyBinCount);
        this.threshold = config.detVolume;
        this.processor.onaudioprocess = this.process.bind(this);
        this.source.connect(this.analyser);
        this.source.connect(this.processor);
        this.processor.connect(context.destination);
        this.onchunk = () => null;

        this.size = config.fftSize;
    }

    stop() {
        this.source.disconnect(this.analyser);
        this.source.disconnect(this.processor);
        this.processor.disconnect(this.context.destination);
    }

    process(event) {
        this.analyser.getByteFrequencyData(this.fft);
        let index = this.config.freqIndex;
        let delta = this.config.fftNeighbours;
        let neighbours = Array.prototype.slice.call(this.fft);
        neighbours = neighbours.slice(index - delta, index + delta + 1).map(x => x / 255);
        let value = neighbours.reduce((a, b) => a + b) / neighbours.length;
        this.onchunk(value, neighbours);
    }
}
