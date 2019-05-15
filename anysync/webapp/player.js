import {AudioContext} from 'standardized-audio-context';

// INITIAL DELAY (S)
const delay = 1.0;

export default class Player {
    constructor() {
        this.context = new AudioContext();
        this.source = null;
        this.delay = this.context.createDelay(3);
        this.gain = this.context.createGain();
        this.delay.delayTime.value = delay;
        this.delay.connect(this.gain);
        this.gain.connect(this.context.destination);
    }

    set stream(stream) {
        // https://stackoverflow.com/questions/54761430/
        new Audio().srcObject = stream;
        this.source = this.context.createMediaStreamSource(stream);
        this.source.connect(this.delay);
    }

    get volume() { return this.gain.gain.value }
    set volume(x) { this.gain.gain.value = x }

    set latency(value) {
        let latency = Math.round(value * 1000);
        console.debug('[PLAY] UPDATING LATENCY:', latency, 'MS');
        this.delay.delayTime.value = delay - value;
    }
}
