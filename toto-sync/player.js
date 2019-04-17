import axios from 'axios';
import audio from './toto.mp3';

export default class Player {
    constructor(context, time) {
        this.context = context;
        this.latency = 0;
        this.time = () => time() + this.latency;
        this.playing = false;
        this.buffer = null;
        this.duration = null;
        this.gain = null;
        this.nodes = [null, null];

        let resolve = null;
        this.ready = new Promise(r => resolve = r);
        this.ready.resolve = resolve;
        this.init();
    }

    async init() {
        let ret = await axios.get(audio, {responseType: 'arraybuffer'});
        this.buffer = await this.context.decodeAudioData(ret.data);
        this.duration = this.buffer.duration;
        this.gain = this.context.createGain();
        this.gain.gain.value = 0;
        this.gain.connect(this.context.destination);
        this.ready.resolve();
    }

    makenode(index) {
        this.nodes[index] = this.context.createBufferSource();
        this.nodes[index].buffer = this.buffer;
        this.nodes[index].connect(this.gain);
        this.nodes[index].onended = () => {
            let offset = this.duration - this.time() % this.duration;
            if (offset < this.duration / 2) offset += this.duration;
            this.makenode(index).start(this.context.currentTime + offset);
        };
        return this.nodes[index];
    }

    start() {
        this.playing = true;
        this.gain.gain.value = 1;
        let offset = this.duration - this.time() % this.duration;
        this.makenode(0).start(0, this.time() % this.duration);
        this.makenode(1).start(this.context.currentTime + offset);
    }

    stop() {
        this.playing = false;
        this.gain.gain.value = 0;
        for (let i of [0, 1]) {
            if (this.nodes[i] === null) break;
            // COMMENT NEXT LINE TO ENABLE BASSBOOST
            // this.nodes[i].disconnect(this.gain);
            this.nodes[i].onended = null;
        }
    }
}
