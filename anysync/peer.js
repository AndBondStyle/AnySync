import {EventEmitter} from 'events';
import now from 'perfomance-now';
import RawPeer from 'peerjs';

class Connection extends EventEmitter {
    constructor(conn) {
        super();
        this.conn = conn;
        this.id = null;
        this.last = null;
        this.ready = new Promise(r => this.resolve = r);
        this.send = (event, data) => this.conn.send({event, data});
        Object.defineProperty(this, 'open', {get: () => this.conn.open});

        this.conn.once('open', () => this.resolve(this.id = conn.peer));
        this.conn.on('error', err => console.debug('[CONN] ERROR:', err.type, err));
        this.conn.on('data', this.process.bind(this));
        if (this.conn.open) this.conn.emit('open');
        this.ready.then(this.poll.bind(this));
    }

    async poll() {
        if (this.last === null) this.last = now();
        if (now() - this.last > 3) this.conn.open = false;
        if (!this.conn.open) {
            console.debug('[CONN] CONNECTION CLOSED:', this.id);
            this.emit('close');
            return;
        }
        this.send('ping');
        setTimeout(this.poll.bind(this), 500);
    }

    async process(raw) {
        let ok = true;
        if (typeof raw !== 'object') ok = false;
        if (typeof raw.event !== 'string') ok = false;
        if (!ok) console.warn('[CONN] INVALID DATA:', raw);
        if (!ok) return;

        let event = raw.event;
        let data = raw.data;
        if (event === 'ping') this.last = now();
        else if (data == null) this.emit(event, this);
        else this.emit(event, this, data);
    }
}

export default class Peer extends EventEmitter {
    constructor() {
        super();
        this.peer = new RawPeer();
        this.id = null;
        this.ready = new Promise(r => this.resolve = r);

        this.peer.once('open', id => this.resolve(this.id = id));
        this.peer.once('error', () => this.resolve(null));
        this.peer.on('disconnected', () => this.emit('disconnected'));
        this.peer.on('connection', conn => this.emit('connection', new Connection(conn)));
        this.peer.on('call', this.answer.bind(this));

        this.peer.on('open', id => console.debug('[PEER] RECEIVED PEER ID:', id));
        this.peer.on('error', err => console.debug('[PEER] ERROR:', err.type, err));
        this.peer.on('disconnected', () => console.debug('[PEER] DISCONNECTED'));
        this.peer.on('connection', conn => console.debug('[PEER] CONNECTION:', conn.peer));
    }

    broadcast(event, data) {
        console.debug('[PEER] BROADCASTING:', event, data);
        let conns = Object.values(this.peer.connections);
        conns = conns.map(x => x.find(x => x.type === 'data'));
        for (let conn of conns.filter(x => x)) conn.send({event, data});
    }

    async connect(id) {
        console.debug('[PEER] CONNECTING TO:', id);
        let resolve = null;
        let promise = new Promise(r => resolve = r);
        this.peer.once('error', () => resolve(false));
        let conn = this.peer.connect(id);
        conn.once('open', () => resolve(true));
        let ok = conn.open || await promise;
        if (!ok) console.debug('[PEER] CONNECTION FAILED');
        else console.debug('[PEER] CONNECTION SUCCEED');
        return ok ? new Connection(conn) : null;
    }

    async answer(conn) {
        console.debug('[PEER] INCOMING CALL:', conn.peer);
        conn.answer();
        let stream = await new Promise(resolve => conn.once('stream', resolve));
        console.debug('[PEER] RECEIVED MEDIA STREAM:', stream);
        this.emit('stream', stream);
    }
}
