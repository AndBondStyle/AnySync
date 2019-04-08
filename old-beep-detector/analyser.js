export default class Analyser {
    constructor(context, source, config) {
        this.context = context;
        this.source = source;
        this.config = config;
        this.analyser = new AnalyserNode(context, {
            fftSize: config.fftSize,
            minDecibels: config.minVolume,
            maxDecibels: config.maxVolume,
            smoothingTimeConstant: 0,
        });
        this.fft = new Uint8Array(this.analyser.frequencyBinCount);
        this.threshold = config.detVolume;
        this.source.connect(this.analyser);
        this.onupdate = () => null;
        requestAnimationFrame(this.update.bind(this));
    }



    stop() {
        this.source.disconnect(this.analyser);
    }

    update() {
        this.analyser.getByteFrequencyData(this.fft);
        let index = this.config.freqIndex;
        let delta = this.config.fftNeighbours;
        let neighbours = Array.prototype.slice.call(this.fft);
        neighbours = neighbours.slice(index - delta, index + delta + 1).map(x => x / 255);
        let value = neighbours.reduce((a, b) => a + b) / neighbours.length;
        this.onupdate(value, neighbours);
        requestAnimationFrame(this.update.bind(this));
    }
}
