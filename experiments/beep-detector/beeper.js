export default class Beeper {
    constructor(context) {
        this.context = context;
    }

    async beep(config) {
        const frequency = config.frequency;
        const count = config.count;
        const duration = config.duration / 1000;
        const distance = config.distance / 1000;
        const margin = config.margin / 1000;

        let start = this.context.currentTime + margin;
        let oscillators = [];
        for (let i = 0; i < count; i++) {
            let oscillator = this.context.createOscillator();
            oscillator.connect(this.context.destination);
            oscillator.frequency.setValueAtTime(frequency, 0);
            oscillator.type = 'sine';
            oscillator.start(start);
            oscillator.stop(start + duration);
            oscillators.push(oscillator);
            start += duration + distance;
        }

        let last = oscillators[count - 1];
        let promise = new Promise(r => last.onended = r);
        await promise;
    }
}
