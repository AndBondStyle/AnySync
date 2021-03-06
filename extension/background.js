import 'babel-polyfill';
import sleep from 'await-sleep';
import Device from './device';
import Syncer from './syncer';
import Peer from '../common/peer';

class Core {
    constructor(currtab, capturetab) {
        this.currtab = currtab;
        this.capturetab = capturetab;
        this.peer = null;
        this.id = null;
        this.devices = [];
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.syncer = new Syncer(this);
        this.target = null;
        this.stream = null;
        this.source = null;
        this.time = () => performance.now() / 1000;
        this.ctxtime = () => this.context.currentTime;
        this.timemap = ts => this.ctxtime() + ts - this.time();
    }

    async init() {
        console.log('[MAIN] INITIALIZING...');
        this.peer = new Peer();
        this.id = await this.peer.ready;
        if (this.id === null) {
            console.warn('[MAIN] PEER CONNECTION FAILED');
            return sleep(1000).then(this.init.bind(this));
        }
        console.log('[MAIN] PEER CONNECTED SUCCESSFULLY');
        console.log('[MAIN] PEER ID:', this.id);
        this.peer.once('disconnected', this.init.bind(this));
        this.peer.on('connection', this.connection.bind(this));
    }

    async capture() {
        let tab = await this.currtab();
        if (tab === null) return;
        this.release();

        console.log('[MAIN] CAPTURING TAB');
        this.target = tab;
        this.stream = await this.capturetab();
        this.source = this.context.createMediaStreamSource(this.stream);
        this.source.connect(this.gain);
    }

    release() {
        if (this.target === null) return;
        console.log('[MAIN] RELEASING TAB');
        this.target = null;
        this.stream.getAudioTracks().map(x => x.stop());
        this.source.disconnect(this.gain);
    }

    message(request, sender, response) {
        if (request === 'capture') this.capture();
        if (request === 'release') this.release();
        if (request === 'status') {
            this.currtab().then(tab => response({
                peer: this.peer && this.peer.id,
                count: this.devices.length,
                current: tab && tab === this.target,
                capturing: this.target !== null,
            }));
            return true;
        }
    }

    update() {
        let devices = [];
        for (let device of this.devices) {
            let {id, status, latency} = device;
            devices.push({id, status, latency});
        }
        console.log('[MAIN] BROADCASTING DEVICES:', devices);
        let conns = this.devices.filter(x => x.status).map(x => x.conn);
        conns.map(x => x.send('devices', devices));
    }

    async connection(conn) {
        await conn.ready;
        console.log('[MAIN] DEVICE CONNECTED:', conn.id);
        let device = new Device(this, conn);
        await sleep(100); // JUST IN CASE
        this.devices.push(device);
        if (this.devices.length === 1) this.syncer.update();
        this.update();
        device.on('sync', () => {
            console.debug('[MAIN] SYNC REQUEST:', conn.id);
            this.syncer.update();
            this.update();
        });
        device.on('status', data => {
            console.debug('[MAIN] STATE CHANGE REQUEST:', conn.id, data);
            let target = this.devices.find(x => x.id === data.id);
            if (target == null) return;
            target.status = data.status;
            target.update();
            this.update();
        });
        device.on('disconnected', () => {
            console.log('[MAIN] DEVICE DISCONNECTED:', device.id);
            let index = this.devices.findIndex(x => x.id === device.id);
            this.devices.splice(index, 1);
            this.update();
        });
    }
}

// HELPER FUNCTION TO GET CURRENT TAB
async function currtab() {
    let resolve = null;
    let promise = new Promise(r => resolve = r);
    chrome.tabs.query(
        {active: true, currentWindow: true},
        tabs => resolve(tabs.length ? tabs[0].id : null),
    );
    return await promise;
}

// HELPER FUNCTION TO CAPTURE AUDIO STREAM
async function capturetab() {
    let resolve = null;
    let promise = new Promise(r => resolve = r);
    chrome.tabCapture.capture({audio: true}, resolve);
    return await promise;
}

// ENTRY POINT
let core = window.core = new Core(currtab, capturetab);
chrome.runtime.onInstalled.addListener(core.init.bind(core));
chrome.runtime.onMessage.addListener(core.message.bind(core));
