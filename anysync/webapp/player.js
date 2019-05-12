import {AudioContext} from "standardized-audio-context";

export default class Player {
    constructor(stream) {
        this.context = new AudioContext();
        this.source = this.context.createMediaStreamSource(stream);
        this.delay = this.context.createDelay();
        this.delay.delayTime.value = 1;
        this.source.connect(this.delay);
        this.delay.connect(this.context.destination);
    }

    set latency(value) {
        this.delay.delayTime.value = 1 - value;
    }
}
