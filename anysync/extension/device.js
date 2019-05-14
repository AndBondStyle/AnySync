import {EventEmitter} from 'events';
import sleep from 'await-sleep';

// BEEP DURATION (S)
const beeplen = 50 / 1000;

export default class Device extends EventEmitter{
    constructor(parent, conn) {
        super();
        this.peer = parent.peer;
        this.time = parent.time;
        this.timemap = parent.timemap;
        this.context = parent.context;
        this.source = parent.gain;
        this.conn = conn;

        this.mediaconn = null;
        this.id = this.conn.id;
        this.status = 1;
        this.latency = 0;

        this.gain = this.context.createGain();
        this.oscillator = this.context.createOscillator();
        this.destination = this.context.createMediaStreamDestination();
        this.stream = this.destination.stream;
        this.oscillator.type = 'sine';
        this.gain.gain.value = 0;
        this.oscillator.connect(this.destination);
        this.source.connect(this.gain);
        this.gain.connect(this.destination);
        this.conn.ready.then(this.init.bind(this));
    }

    async init() {
        this.conn.on('close', () => this.emit('disconnected', this.status = 0));
        console.debug('[DEVICE] HANDSHAKING');
        this.conn.send('time', this.time());
        this.mediaconn = this.peer.call(this.id, this.stream);
        this.mediaconn.on('error',err => console.warn('[DEVICE] MEDIA ERROR:', err.type, err));
        await sleep(500);
        if (!this.mediaconn.open) console.warn('[DEVICE] MEDIA CONNECTION NOT OPEN');
    }

    schedule(config) {
        console.debug('[DEVICE] SCHEDULING SYNC:', this.id, config);
        this.gain.gain.setValueAtTime(0, this.timemap(config.start));
        this.gain.gain.setValueAtTime(1, this.timemap(config.end));
        if (config.record) {
            console.debug('[DEVICE] SCHEDULING RECORDING');
            let data = {start: config.start, end: config.end};
            this.conn.send('record', data);
        }
        if (config.beep) {
            console.debug('[DEVICE] SCHEDULING BEEP');
            this.oscillator.frequency.value = config.beepfreq;
            this.oscillator.start(this.timemap(config.beeptime));
            this.oscillator.stop(this.timemap(config.beeptime) + beeplen);
        }
    }
}
