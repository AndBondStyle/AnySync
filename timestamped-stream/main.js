import 'babel-polyfill';
import axios from 'axios';
import Peer from 'peerjs';

const URL = 'https://archive.org/download/testmp3testfile/mpthreetest.mp3';
const CONFIG = {key: 'lwjd5qra8257b9'}; // PeerJS public server key
const BUFFERING = 5000; // Single chunk length (ms)
const DELAY = 1000; // Emulated stream delay (ms)

let time = () => context.currentTime * 1000; // Current time shortcut
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

async function init() {
    btn.onclick = () => null;
    btn.innerText = 'STARTING...';

    console.log('Setting up peer connection A...');
    a = new Peer(CONFIG);
    promise = new Promise(r => a.on('open', r));
    await promise;

    console.log('Setting up peer connection B...');
    b = new Peer(CONFIG);
    promise = new Promise(r => b.on('open', r));
    await promise;

    console.log('Establishing A <-> B connection...');
    promise = new Promise(r => b.on('connection', r));
    a.connection = a.connect(b.id);
    b.connection = await promise;
    b.connection.on('data', recieveChunk);

    console.log('Setting up audio stream...');
    context = new AudioContext();
    let stream = await initStream();

    // console.log('Setting up decoder...');
    // decoder = new Decoder({channels: 2, fallback: false});
    // decoder.decoder.flushLimit = 1;

    console.log('Setting up recorder...');
    let recorder = new MediaRecorder(stream);
    recorder.addEventListener('dataavailable', sendChunk);
    recorder.start(BUFFERING);

    console.log('Waiting for the first chunk...');
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
    if (firstchunk == null) firstchunk = await new Response(event.data).arrayBuffer();
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
    if (data.first) return;
    let buffer = await decode(data.blob);
    let source = context.createBufferSource();
    let start = context.currentTime +(data.timestamp - time()) / 1000;
    console.log('NOW:', context.currentTime, 'PLAY AT:', start);
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(start);
    console.log('[B] Scheduled chunk with timestamp:', data.timestamp);
}

async function decode(blob) {
    let headersize = 162;
    let header = firstchunk.slice(0, headersize);
    console.log('HEADER LAST BYTE:', (new Uint8Array(header))[header.byteLength - 1].toString(16));
    console.log('CHUNK FIRST BYTE:', (new Uint8Array(blob, 0, 1))[0].toString(16));
    let data = new Uint8Array(header.byteLength + blob.byteLength);
    data.set(new Uint8Array(header), 0);
    data.set(new Uint8Array(blob), header.byteLength);
    return context.decodeAudioData(data.buffer);
}

function download(data) {
    if (data == null) return;
    let link = document.createElement('a');
    let blob = new Blob([data]);
    link.href = window.URL.createObjectURL(blob);
    link.download = 'audio.opus';
    link.click();
    link.remove();
}
