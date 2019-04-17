import AudioContext from 'audio-context';
import Cookie from 'js-cookie';
import QS from 'query-string';
import Peer from 'peerjs';
import Detector from './detector'
import Player from './player';

export default class Core {
    constructor(parent) {
        this.parent = parent;
        this.party = null;
        this.leader = true;
        this.leaderconn = null;
        this.devices = {};
        this.connections = {};
        this.results = null;
        this.timediff = 0;
        this.latency = 0;

        this.broadcast = data => Object.values(this.connections).map(x => x.send(data));
        this.time = () => this.context.currentTime + this.timediff;
        this.stop = () => this.broadcast({event: 'stop'});
        this.start = () => {
            Object.values(this.connections).map(conn => {
                let status = this.devices[conn.peer].status;
                if (status === 1) conn.send({event: 'start'});
            });
        };

        this.context = new AudioContext();
        this.peer = new Peer();
        this.player = new Player(this.context, this.time);
        this.detector = new Detector(this.context, this.time);

        let resolve = null;
        this.ready = new Promise(r => resolve = r);
        this.ready.resolve = resolve;
        this.peer.on('open', this.init.bind(this));
        this.peer.on('connection', this.onconnect.bind(this));
        this.peer.on('error', err => console.log(err));
    }

    async sync() {
        console.log('[C] SYNCING...');
        let playing = this.player.playing;
        let start = this.time() + 2.0;
        let count = Object.keys(this.devices).length;
        let configs = this.detector.schedule(count, start);
        let connections = Object.values(this.connections);
        connections.map((conn, i) => conn.send({
            event: 'sync', data: {config: configs[i], start: start}
        }));
        let resolve = null;
        let promise = new Promise(r => resolve = r);
        this.results = [];
        this.results.check = () => {
            if (this.results.length === count) resolve();
            else setTimeout(resolve, 5000);
        };
        console.log('[C] WAITING FOR RESULTS...');
        await promise;
        let results = this.results.slice();
        this.results = null;
        let first = configs[0].beeptime;
        let expected = configs.map(x => x.beeptime - first);
        await this.process(connections, results, expected);
        if (playing) this.start();
        console.log('[C] SYNC FINISHED');
    }

    async process(connections, results, expected) {
        console.log('[C] PROCESSING RESULTS...');
        let count = connections.length;
        let average = expected.map(_ => []);
        for (let result of results) {
            // TODO: MORE FLEXIBLE LOGIC
            let first = result[0];
            if (first === null) continue;
            for (let i = 1; i < count; i++) {
                if (result[i] === null) continue;
                average[i].push(result[i] - first);
            }
        }
        let valid = average.map((x, i) => x.length ? i : -1).filter(x => x >= 0);
        average = average.map(x => x.reduce((a, b) => a + b, 0) / x.length);
        let latencies = average.map((x, i) => x - expected[i]);

        console.debug('[P] COLLECTED SYNC RESULTS:', results);
        console.debug('[P] EXPECTED RESULT:', expected);
        console.debug('[P] AVERAGE RESULT:', average);
        console.debug('[P] COMPUTED LATENCIES:', latencies);
        console.debug('[P] VALID LATENCIES:', valid);

        for (let i = 1; i < count; i++) {
            let conn = connections[i];
            if (valid.indexOf(i) === -1) {
                this.devices[conn.peer].latency = null;
                this.devices[conn.peer].status = -1;
                continue;
            }
            conn.send({event: 'latency', data: latencies[i]});
            if (this.player.playing) conn.send({event: 'start'});
            this.devices[conn.peer].latency = Math.round(latencies[i] * 1000);
            this.devices[conn.peer].status = 1;
        }
        this.broadcast({event: 'devices', data: this.devices});
    }

    async init() {
        console.log('[C] INITIALIZING...');
        let lastid = Cookie.get('last-id');
        Cookie.set('last-id', this.peer.id);
        let party = QS.parse(location.search)['party'];
        if (party && party !== lastid) await this.connect(party);
        if (this.party == null) await this.selfconnect();
        let query = '?' + QS.stringify({party: this.party})
        history.replaceState(null, '', query);
        this.ready.resolve(this.party);
    }

    async connect(party) {
        console.log('[C] CONNECTING TO:', party);
        let resolve = null;
        let promise = new Promise(r => resolve = r);
        this.peer.once('error', () => resolve(false));
        let conn = this.peer.connect(party);
        conn.once('open', () => resolve(true));
        if (!await promise) {
            console.log('[C] CONNECTION FAILED');
            return false;
        }
        this.leader = false;
        this.party = party;
        this.leaderconn = conn;
        this.leaderconn.on('data', data => this.onmessage(conn, data));
        // TODO: HANDLE DISCONNECT
        return true;
    }

    async selfconnect() {
        console.log('[C] CONNECTING TO SELF...');
        let conn = {
            fake: true,
            peer: this.peer.id,
            send: data => this.onmessage(conn, data),
            once: (event, handler) => handler(),
            on: () => null,
        };
        this.leader = true;
        this.party = this.peer.id;
        this.leaderconn = conn;
        await this.onconnect(conn);
    }

    async onconnect(conn) {
        console.log('[M] CONNECT:', conn.peer);
        if (conn.peer !== this.peer.id) this.leader = true;
        conn.on('close', () => this.ondisconnect(conn));
        await new Promise(resolve => conn.once('open', resolve));
        conn.on('data', data => this.onmessage(conn, data));
        let device = {id: conn.peer, status: 0, latency: null};
        if (conn.fake) device = {id: conn.peer, status: 1, latency: 0};
        this.connections[conn.peer] = conn;
        this.devices[conn.peer] = device;
        conn.send({event: 'time-sync', data: {timestamp: this.time()}});
        this.broadcast({event: 'devices', data: this.devices});
        this.parent.update();
    }

    ondisconnect(conn) {
        console.log('[M] DISCONNECT:', conn.peer);
        delete this.connections[conn.peer];
        delete this.devices[conn.peer];
        this.broadcast({event: 'devices', data: this.devices});
        this.parent.update();
    }

    onmessage(conn, message) {
        let event = message.event;
        let data = message.data;

        if (this.leader && event === 'sync-result') {
            if (this.results === null) return;
            this.results.push(data);
            this.results.check();
            console.log('[M] SYNC RESULT:', data);
        }
        if (!this.leader && event === 'time-sync') {
            this.timediff = data.timestamp - this.time();
            console.log('[M] TIMEDIFF:', this.timediff);
        }
        if (!this.leader && event === 'devices') {
            this.devices = data;
            console.log('[M] DEVICES:', data);
        }
        if (!this.leader && event === 'latency') this.player.latency = data;
        if ((!this.leader || conn.fake) && event === 'start') this.player.start();
        if ((!this.leader || conn.fake) && event === 'stop') this.player.stop();
        if ((!this.leader || conn.fake) && event === 'sync') {
            console.log('[M] SYNC:', data);
            data.config.beeptime -= this.timediff;
            this.detector.prepare();
            let callback = async () => {
                if (this.player.playing) this.player.stop();
                let result = await this.detector.sync(data.config);
                console.log('[C] SENDING RESULT TO LEADER...');
                this.leaderconn.send({event: 'sync-result', data: result});
            };
            setTimeout(callback, (data.start - this.time()) * 1000);
        }

        this.parent.update();
    }
}
