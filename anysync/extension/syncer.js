import * as consts from '../common/consts';
import Detector from './detector';
import sleep from 'await-sleep';

export default class Syncer {
    constructor(parent) {
        this.publish = () => parent.update();
        this.time = () => parent.time();
        this.context = parent.context;
        this.devices = parent.devices;
        this.gain = parent.gain;
        this.syncing = false;
        this.start = null;
        this.end = null;
        this.freqs = null;
        this.recorders = null;
        this.feedbacks = null;
        this.beepers = null;
        this.configs = null;
        this.expected = null;
        this.latencies = null;
    }

    update() {
        if (this.syncing) return;
        let devices = this.devices.filter(x => x.status);
        if (devices.length === 1) {
            console.log('[SYNC] ENABLING FIRST DEVICE:', devices[0].id);
            devices[0].status = 2;
            devices[0].gain.gain.value = 1;
        } else if (devices.length) {
            let synced = devices.filter(x => x.status === consts.status.synced);
            let unsynced = devices.filter(x =>
                x.status === consts.status.connected ||
                x.status === consts.status.error
            );
            if (!unsynced.length) return;
            let half = Math.floor(consts.detfreqs.length / 2);
            unsynced = unsynced.slice(0, half);
            let beepers = synced.concat(unsynced).slice(-consts.detfreqs.length);
            this.schedule(synced, beepers);
            this.perform().then(this.update.bind(this));
        }
    }

    schedule(recorders, beepers) {
        console.log('[SYNC] SCHEDULING SYNC ROUTINE');
        // TODO: MORE FLEXIBLE LOGIC
        this.recorders = recorders;
        this.beepers = recorders.concat(beepers);
        this.start = this.time() + consts.warmup;
        this.freqs = consts.detfreqs.slice(0, this.beepers.length);
        let time = this.start + consts.margins[0];
        let baseconfig = {start: this.start, beep: true, record: false};
        this.configs = [];
        this.expected = [];
        this.feedbacks = [];
        for (let i = 0; i < this.beepers.length; i++) {
            let config = {beeptime: time, beepfreq: this.freqs[i]};
            this.configs.push(Object.assign(config, baseconfig));
            this.expected.push(time);
            time += consts.beepstep;
        }
        this.end = time + consts.margins[1];
        this.configs.map(x => x.end = this.end);
        this.expected = this.expected.map(x => x - this.expected[0]);
        this.beepers.map((x, i) => x.schedule(this.configs[i]));
        let recconfig = {start: this.start, end: this.end, beep: false, record: true};
        this.recorders.map(x => x.schedule(recconfig));
        console.debug('[SYNC] START:', this.start, 'END:', this.end);
        console.debug('[SYNC] BEEPERS:', this.beepers);
        console.debug('[SYNC] RECORDERS:', this.recorders);
        console.debug('[SYNC] CONFIGS:', this.configs);
    }

    async perform() {
        this.syncing = true;
        console.log('[SYNC] PERFORMING SYNC...');
        let delta = this.start - consts.delay - this.time();
        await sleep(delta * 1000);
        console.debug('[SYNC] SYNC START:', this.start, 'VS', this.time());
        this.gain.gain.value = 0;
        this.recorders.map(x => x.on('feedback', this.feedback.bind(this)));
        delta = this.end - this.time();
        await sleep(delta * 1000);
        console.debug('[SYNC] SYNC END:', this.end, 'VS', this.time());
        this.gain.gain.value = 1;
        await sleep(consts.wait * 1000);
        this.recorders.map(x => x.removeAllListeners('feedback'));
        this.process();
        console.log('[SYNC] SYNC ROUTINE COMPLETE');
        this.publish();
        this.syncing = false;
    }

    async feedback(audio) {
        console.debug('[SYNC] RAW FEEDBACK:', audio);
        if (audio === null) return;
        let buffer = await this.context.decodeAudioData(audio);
        let detector = new Detector(buffer.sampleRate);
        let signal = buffer.getChannelData(0);
        let beeps = detector.detect(signal, this.freqs);
        this.feedbacks.push(beeps);
    }

    process() {
        console.debug('[SYNC] PROCESSING RESULTS...');
        console.debug('[SYNC] TOTAL FEEDBACKS:', this.feedbacks.length);
        console.debug('[SYNC] EXPECTED:', this.recorders.length);

        let count = this.expected.length;
        let average = this.expected.map((_, i) => i === 0 ? [0] : []);
        for (let result of this.feedbacks) {
            let first = result[0];
            if (first === null) continue;
            for (let i = 1; i < count; i++) {
                if (result[i] === null) continue;
                average[i].push(result[i] - first);
            }
        }

        for (let iter = 0; true; iter++) {
            average = average.map(x => x.length ? x.reduce((a, b) => a + b, 0) / x.length : null);
            console.debug('[SYNC] ITERATION', iter, 'AVERAGE:', average.slice());
            let missing = average.map((x, i) => x !== null ? 0 : i).filter(x => x !== 0);
            console.debug('[SYNC] ITERATION', iter, 'MISSING INDEXES:', missing);
            average = average.map((x, i) => missing.includes(i) ? [] : [x]);

            let updated = false;
            for (let result of this.feedbacks) {
                for (let i of missing) {
                    if (result[i] === null) continue;
                    for (let j = 0; j < count; j++) {
                        if (missing.includes(j) || result[j] === null) continue;
                        average[i].push(average[j] - (result[j] - result[i]));
                        updated = true;
                    }
                }
            }
            if (!updated) break;
        }

        average = average.map(x => x.length ? x.reduce((a, b) => a + b, 0) / x.length : null);
        let valid = average.map((x, i) => x !== null ? i : 0).filter(x => x !== 0);
        this.latencies = average.map((x, i) => x !== null ? x - this.expected[i] : null);

        console.debug('[SYNC] COLLECTED SYNC RESULTS:', this.feedbacks);
        console.debug('[SYNC] FINAL AVERAGE RESULT:', average);
        console.debug('[SYNC] EXPECTED RESULT:', this.expected);
        console.debug('[SYNC] COMPUTED LATENCIES:', this.latencies);
        console.debug('[SYNC] VALID LATENCIES:', valid);

        for (let i = 0; i < this.beepers.length; i++) {
            if (this.latencies[i] === null) {
                this.beepers[i].status = 3;
                this.beepers[i].gain.gain.value = 0;
            } else {
                this.beepers[i].status = 2;
                this.beepers[i].gain.gain.value = 1;
                this.beepers[i].latency += this.latencies[i];
            }
        }

        let devices = this.devices.filter(x => x.status === consts.status.synced);
        let latencies = devices.map(x => x.latency);
        let mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        devices.map(x => x.latency -= mean);
    }
}
