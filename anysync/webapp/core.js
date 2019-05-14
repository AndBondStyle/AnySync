import {EventEmitter} from 'events';
import now from 'performance-now';
import Peer from '../common/peer';
import Recorder from './recorder';
import Player from './player';

export default class Core extends EventEmitter {
    constructor() {
        super();
        this.context = null;
        this.peer = null;
        this.conn = null;
        this.id = null;
        this.player = null;
        this.recorder = null;
        this.devices = [];
        this.status = null;
        this.timediff = 0;
        this.time = () => now() / 1000 + this.timediff;
    }

    async connect(party) {
        console.log('[MAIN] INITIALIZING...');
        this.peer = new Peer();
        this.player = new Player();
        this.recorder = new Recorder(this.time.bind(this));
        this.id = await this.peer.ready;
        if (this.id === null) {
            console.warn('[MAIN] PEER INITIALIZATION FAILED');
            return false;
        }
        console.log('[MAIN] RECEIVED PEER ID:', this.id);
        console.log('[MAIN] CONNECTING TO:', party);
        this.conn = await this.peer.connect(party);
        if (this.conn === null) {
            console.warn('[MAIN] PEER CONNECTION FAILED');
            return false;
        }
        console.log('[MAIN] CONNECTED SUCCESSFULLY');
        this.conn.on('time', time => this.timediff = time - now() / 1000);
        this.conn.on('devices', this.update.bind(this));
        this.conn.on('record', this.record.bind(this));
        this.conn.on('close', () => this.emit('disconnected'));
        console.log('[MAIN] WAITING FOR STREAM...');
        let resolve = null;
        let promise = new Promise(r => resolve = r);
        this.peer.once('stream', resolve);
        this.player.stream = await promise;
        console.log('[MAIN] RECEIVED MEDIA STREAM');
        return true;
    }

    update(devices) {
        console.log('[MAIN] UPDATE DEVICES:', devices);
        this.devices = devices;
        let self = devices.find(x => x.id === this.id);
        this.status = self.status;
        this.player.latency = self.latency;
        this.emit('update');
    }

    async record(data) {
        console.log('[MAIN] RECORDING...');
        console.warn('NOW:', this.time());
        console.warn('DATA:', data);
        let audio = await this.recorder.record(data.start, data.end);
        console.log('[MAIN] DONE RECORDING:', audio);
        this.conn.send('feedback', audio);
    }
}
