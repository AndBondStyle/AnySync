import Detector from './detector';
import sleep from 'await-sleep';

// INITIAL DELAY (S)
const delay = 1.0;
// WARMUP TIME (S)
const warmup = 2.0;
// FEEDBACK WAIT TIME (S)
const wait = 2.0;
// BEEP DURATION (S)
const beeplen = 50 / 1000;
// DISTANCE BETWEEN BEEPS (S)
const beepstep = 100 / 1000;
// MARGINS BEFORE AND AFTER RECORDING (S)
const margins = [500 / 1000, 2000 / 1000];
// AUDIO CONTEXT SAMPLE RATE
const samplerate = 48000;
// FFT WINDOW SIZE (SAMPLES)
const winsize = 1024;
// FREQUENCIES TO BEEP & DETECT
const detfreqs = [24, 28, 32, 36, 40, 44, 48].map(x => x * samplerate / winsize);

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
            let synced = devices.filter(x => x.status === 2);
            let connected = devices.filter(x => x.status !== 2);
            if (!connected.length) return;
            this.schedule(synced, connected);
            this.perform().then(this.update.bind(this));
        }
    }

    schedule(synced, connected) {
        console.log('[SYNC] SCHEDULING SYNC ROUTINE');
        // TODO: MORE FLEXIBLE LOGIC
        this.recorders = synced;
        this.beepers = synced.concat(connected);
        this.start = this.time() + warmup;
        this.freqs = detfreqs.slice(0, this.beepers.length);
        let time = this.start + margins[0];
        let baseconfig = {start: this.start, beep: true, record: false};
        this.configs = [];
        this.expected = [];
        this.feedbacks = [];
        for (let i = 0; i < this.beepers.length; i++) {
            let config = {beeptime: time, beepfreq: this.freqs[i]};
            this.configs.push(Object.assign(config, baseconfig));
            this.expected.push(time);
            time += beepstep;
        }
        this.end = time + margins[1];
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
        let delta = this.start - delay - this.time();
        await sleep(delta * 1000);
        console.debug('[SYNC] SYNC START:', this.start, 'VS', this.time());
        this.gain.gain.value = 0;
        this.recorders.map(x => x.on('feedback', this.feedback.bind(this)));
        delta = this.end - this.time();
        await sleep(delta * 1000);
        console.debug('[SYNC] SYNC END:', this.end, 'VS', this.time());
        this.gain.gain.value = 1;
        await sleep(wait * 1000);
        this.recorders.map(x => x.removeAllListeners('feedback'));
        this.process();
        console.debug('[SYNC] APPLYING CHANGES...');
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
        console.debug('[SYNC] BALANCING...');
        let devices = this.devices.filter(x => x.status === 2);
        let latencies = devices.map(x => x.latency);
        let mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        devices.map(x => x.latency -= mean);
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
    }
}
