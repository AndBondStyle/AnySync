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
        this.index = 0;
        this.leader = true;
        this.leaderconn = null;
        this.devices = {};
        this.connections = {};
        this.results = null;
        this.timediff = 0;
        this.latency = 0;
        this.delay = 1;

        this.broadcast = data => Object.values(this.connections).map(x => x.send(data));
        this.time = () => new Date().getTime() / 1000 + this.timediff;
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
        let playing = this.player.playing;
        let start = this.time() + this.delay;
        let devices = Object.values(this.devices);
        let targets = devices.filter(x => x.id === this.peer.id || x.status !== 1);
        if (targets.length === 1) return;
        console.log('[C] SYNCING...');
        let configs = this.detector.schedule(targets.length, start);
        let recorders = devices.length - targets.length + 1;
        configs[0].record = true;
        let baseconfig = Object.assign({}, configs[0]);
        baseconfig.beep = false;
        baseconfig.record = true;
        let index = 0;
        for (let device of devices) {
            let conn = this.connections[device.id];
            if (targets.includes(device)) conn.send({event: 'sync', data: configs[index++]});
            else conn.send({event: 'sync', data: baseconfig});
        }
        let connections = targets.map(x => this.connections[x.id]);
        let resolve = null;
        let promise = new Promise(r => resolve = r);
        this.results = [];
        this.results.check = () => {
            if (this.results.length === recorders) resolve();
            else setTimeout(resolve, 5000);
        };
        console.log('[C] WAITING FOR RESULTS...');
        await promise;
        let results = this.results.slice();
        this.results = null;
        let first = configs[0].beeptime;
        let expected = configs.map(x => x.beeptime - first);
        this.process(connections, results, expected);
        if (playing) this.start();
        console.log('[C] SYNC FINISHED');
    }

    average(results) {
        console.log('RES ', results);
        let diff = [];
        for (let i = 1; i < results.length; i++) {
            diff.push({sum: 0, count: 0});
        }
        // calculate parts for average results using only results neighbors
        for (let result of results) {
            for (let i = 1; i < results.length; i++) {
                if (result[i] !== null && result[i - 1] !== null) {
                    diff[i - 1].sum += result[i] - result[i - 1];
                    diff[i - 1].count++;
                }
            }
        }
        let null_diff_check = () => {
            for (let part of diff) {
                if (part.count === 0) {
                    return true;
                }
            }
            return false
        };
        // check if there exists an unknown part (with zero count)
        if (null_diff_check()) {
            // attempt to extrapolate unknown parts by using long parts (non-null results with by nulls in between)
            for (let result of results) {
                let j = 0;
                while (j < result.length && result[j] === null) j++;
                for (let i = 0; i < result.length; i++) {
                    if (result[i] !== null) {
                        let part_count = i - j;
                        if (part_count > 1) {
                            for (let k = 0; k < part_count; ++k) {
                                diff[j + k].sum += (result[i] - result[j]) / part_count;
                                diff[j + k].count++;
                            }
                        }
                    }
                }
            }
        }
        // check if there still exists an unknown part
        if (null_diff_check()) {
            // there's nothing could be done, there's not enough data
            return null;
        }
        // calculate average results
        let average = [0];
        for (let i = 1; i < results.length; i++) {
            average[i] = average[i - 1] + diff[i - 1].sum / diff[i - 1].count;
        }
        return average;
    }

    process(connections, results, expected) {
        console.log('[C] PROCESSING RESULTS...');

        let count = expected.length;
        let average = expected.map((_, i) => i === 0 ? [0] : []);
        for (let result of results) {
            let first = result[0];
            if (first === null) continue;
            for (let i = 1; i < count; i++) {
                if (result[i] === null) continue;
                average[i].push(result[i] - first);
            }
        }

        for (let iter = 0; true; iter++) {
            average = average.map(x => x.length ? x.reduce((a, b) => a + b, 0) / x.length : null);
            console.debug('[P] ITERATION', iter, 'AVERAGE:', average.slice());
            let missing = average.map((x, i) => x !== null ? 0 : i).filter(x => x !== 0);
            console.debug('[P] ITERATION', iter, 'MISSING INDEXES:', missing);
            average = average.map((x, i) => missing.indexOf(i) === -1 ? [x] : []);

            let updated = false;
            for (let result of results) {
                for (let i of missing) {
                    if (result[i] === null) continue;
                    for (let j = 0; j < count; j++) {
                        if (missing.indexOf(j) !== -1 || result[j] === null) continue;
                        average[i].push(average[j] - (result[j] - result[i]));
                        updated = true;
                    }
                }
            }
            if (!updated) break;
        }

        average = average.map(x => x.length ? x.reduce((a, b) => a + b, 0) / x.length : null);
        let valid = average.map((x, i) => x !== null ? i : 0).filter(x => x !== 0);
        let latencies = average.map((x, i) => x !== null ? x - expected[i] : null);

        console.debug('[P] COLLECTED SYNC RESULTS:', results);
        console.debug('[P] FINAL AVERAGE RESULT:', average);
        console.debug('[P] EXPECTED RESULT:', expected);
        console.debug('[P] COMPUTED LATENCIES:', latencies);
        console.debug('[P] VALID LATENCIES:', valid);

        for (let i = 1; i < count; i++) {
            let conn = connections[i];
            let device = this.devices[conn.peer];
            if (!device) continue;
            if (valid.indexOf(i) === -1) {
                device.latency = null;
                device.status = -1;
                continue;
            }
            conn.send({event: 'latency', data: latencies[i]});
            if (this.player.playing) conn.send({event: 'start'});
            device.latency = Math.round(latencies[i] * 1000);
            device.status = 1;
            console.log('SENDING LATENCY #', i, ':', device.latency, 'MS TO PEER ID:', conn.peer);
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
        let query = '?' + QS.stringify({party: this.party});
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
            this.parent.update();
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
            // TODO: FIX
            this.timediff = data.timestamp - this.time();
            console.log('[M] TIMEDIFF:', this.timediff);
        }
        if (!this.leader && event === 'devices') {
            this.index = Object.values(data).findIndex(x => x.id === this.peer.id);
            this.devices = data;
            console.log('[M] DEVICES:', data);
        }
        if (!this.leader && event === 'latency') this.player.latency = data;
        if ((!this.leader || conn.fake) && event === 'start') this.player.start();
        if ((!this.leader || conn.fake) && event === 'stop') this.player.stop();
        if ((!this.leader || conn.fake) && event === 'sync') {
            console.log('[M] SYNC:', data);
            let callback = async () => {
                if (this.player.playing) this.player.stop();
                let result = await this.detector.sync(data);
                console.debug('[C] DETECTION RESULT:', result);
                if (result === null) return;
                console.log('[C] SENDING RESULT TO LEADER...');
                this.leaderconn.send({event: 'sync-result', data: result});
            };
            this.detector.prepare(data).then(callback);
        }

        this.parent.update();
    }
}
