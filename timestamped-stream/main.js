import 'babel-polyfill';
import axios from 'axios';
import Peer from 'peerjs';

const URL = 'https://archive.org/download/testmp3testfile/mpthreetest.mp3';
const CONFIG = {key: 'lwjd5qra8257b9'}; // PeerJS public server key
const BUFFERING = 2000; // Single chunk length (ms)
const DELAY = 1000; // Emulated stream delay (ms)

let time = () => new Date().getTime(); // Current time shortcut
let btn = document.querySelector('#btn'); // Button element
btn.onclick = init;

let a = null; // Peer connection A
let b = null; // Peer connection B
let broadcast = false; // Broadcast state
let context = null; // Web Audio API AudioContext
let prevtime = null; // Last 'timecode' provided within recorder's BlobEvent
let currtime = null; // Current chunk timestamp ({DELAY} ms ahead from actual time)
let promise = null; // Promise holder to avoid callback madness
let resolve = null; // Promise resolve callback (used with decoder)
let firstchunk = null; // First chunk retrieved from recorder (contains OPUS header)
let decoder = null; // Custom OPUS decoder (chunked)

async function init() {
    btn.onclick = () => null;
    btn.innerText = 'STARTING...';

    console.log('Setting up peer connection A...');
    a = new Peer(CONFIG);
    promise = new Promise(r => a.on('open', r));
    await promise

    console.log('Setting up peer connection B...');
    b = new Peer(CONFIG);
    promise = new Promise(r => b.on('open', r));
    await promise

    console.log('Establishing A <-> B connection...');
    promise = new Promise(r => b.on('connection', r));
    a.connection = a.connect(b.id);
    b.connection = await promise;
    b.connection.on('data', recieveChunk);

    console.log('Setting up audio stream...');
    context = new AudioContext();
    let stream = await initStream();

    function onDecode({left, right, samplesDecoded, sampleRate}) {
        console.log('DECODED:', left, right, samplesDecoded);
    }

    console.log('Setting up decoder (nope)...');
    // decoder = new OpusStreamDecoder({onDecode: v => {
    //     console.log('DECODED:', v);
    //     resolve(v);
    // }});
    // decoder = new OpusStreamDecoder({onDecode});
    // await decoder.ready;

    console.log('Setting up recorder...');
    let recorder = new MediaRecorder(stream);
    recorder.addEventListener('dataavailable', sendChunk);
    recorder.start(BUFFERING);

    console.log('Waiting for the first chunk...')
    btn.innerText = 'BUFFERING...';
    promise = new Promise(r => setTimeout(r, BUFFERING));
    await promise;

    console.log('Ready to broadcast');
    btn.innerText = 'BROADCAST';
    btn.classList.add('active');
    btn.onclick = () => {
        console.log('Broadcasting...');
        btn.innerText = 'BROADCASTING...';
        a.connection.send({blob: firstchunk, first: true});
        broadcast = true;
    };
}

async function initStream() {
    let ret = await axios.get(URL, {responseType: 'arraybuffer'});
    let buffer = await context.decodeAudioData(ret.data);
    let source = context.createBufferSource();
    let destination = context.createMediaStreamDestination();
    source.buffer = buffer;
    source.loop = true;
    source.connect(destination);
    source.start();
    return destination.stream;
}

async function sendChunk(event) {
    if (firstchunk == null) firstchunk = event.data;
    if (currtime == null) currtime = time() + DELAY;
    if (prevtime == null) prevtime = event.timecode;
    let delta = event.timecode - prevtime;
    prevtime = event.timecode; currtime += delta;
    if (!broadcast) return;
    let data = {blob: event.data, timestamp: currtime};
    a.connection.send(data);
    console.log('[A] Sent chunk with timestamp:', currtime);
}

async function recieveChunk(data) {
    if (data.first) {
        promise = new Promise(r => resolve = r);
        let arr = new Uint8Array(data.blob);
        console.log(data, arr);
        // decoder.decode(arr);
        await promise; return;
    }

    // let buffer = await decode(data.blob);
    let source = context.createBufferSource();
    let start = context.currentTime + (data.timestamp - time()) / 1000;
    console.log('NOW:', context.currentTime, 'PLAY AT:', start);
    // source.buffer = buffer;
    source.connect(context.destination);
    source.start(start);
    console.log('[B] Scheduled chunk with timestamp:', data.timestamp);
}

async function decode(blob) {
    await promise;
    promise = new Promise(r => resolve = r);
    decoder.decode(new Uint8Array(blob));
    let decoded = await promise;
    debugger;
}
