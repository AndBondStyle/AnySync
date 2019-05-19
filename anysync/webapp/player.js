import {AudioContext} from 'standardized-audio-context';
import * as consts from '../common/consts';

export default class Player {
    constructor() {
        this.context = new AudioContext();
        this.source = null;
        this.delay = this.context.createDelay(consts.delay * 2);
        this.gain = this.context.createGain();
        this.delay.delayTime.value = consts.delay;
        this.delay.connect(this.gain);
        this.gain.connect(this.context.destination);
    }

    set stream(stream) {
        // https://stackoverflow.com/questions/54761430/
        new Audio().srcObject = stream;
        this.source = this.context.createMediaStreamSource(stream);
        this.source.connect(this.delay);
    }

    set latency(value) {
        let latency = Math.round(value * 1000);
        console.debug('[PLAY] UPDATING LATENCY:', latency, 'MS');
        this.delay.delayTime.value = consts.delay - value;
    }

    toggle() {
        let volume = this.gain.gain.value;
        volume = volume > 0 ? 0 : 1;
        this.gain.gain.value = volume;
        return volume;
    }
}
