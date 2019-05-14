import {AudioContext} from "standardized-audio-context";

// INITIAL DELAY (S)
const delay = 1.0;

export default class Player {
    constructor(stream) {
        this.context = new AudioContext();
        this.source = this.context.createMediaStreamSource(stream);
        this.delay = this.context.createDelay();
        this.gain = this.context.createGain();
        this.delay.delayTime.value = delay;
        this.gain.gain.value = 1;
        this.source.connect(this.delay);
        this.delay.connect(this.gain);
        this.gain.connect(this.context.destination);
    }

    get muted() { return this.gain.gain.value === 0 }
    set muted(x) { this.gain.gain.value = x ? 1 : 0 }

    set latency(value) {
        let latency = Math.round(value * 1000);
        console.debug('[PLAY] UPDATING LATENCY:', latency, 'MS');
        this.delay.delayTime.value = delay - value;
    }
}
