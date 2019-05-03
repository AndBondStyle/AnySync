import 'babel-polyfill';
import Player from './player';
import toto from './toto.mp3';
import axios from 'axios';
import Peer from 'peerjs';

const CONFIG = {key: 'lwjd5qra8257b9'}; // PeerJS public server key
const BUFFERING = 1000 / 1000; // Single chunk length (s)
const DELAY = 1000 / 1000; // Emulated stream delay (s)

let time = () => context.currentTime; // Current time shortcut
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
let player = null; // Player

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
    b.connection.on('data', chunk => {
        chunk.data = new Uint8Array(chunk.data);
        player.feed(chunk);
    });

    console.log('Setting up stream...');
    context = new AudioContext();
    let stream = await initStream();

    console.log('Setting up player...');
    player = new Player(context, () => time());

    console.log('Setting up recorder...');
    let recorder = new MediaRecorder(stream);
    recorder.addEventListener('dataavailable', sendChunk);
    recorder.start(BUFFERING * 1000);

    console.log('Waiting for the first chunk...');
    btn.innerText = 'BUFFERING...';
    promise = new Promise(r => setTimeout(r, BUFFERING * 1000));
    await promise;

    console.log('Ready to broadcast');
    btn.innerText = 'BROADCAST';
    btn.classList.add('active');
    btn.onclick = () => {
        console.log('Broadcasting...');
        btn.innerText = 'BROADCASTING...';
        a.connection.send({data: firstchunk, first: true});
        broadcast = true;
    };
}

async function initStream() {
    let ret = await axios.get(toto, {responseType: 'arraybuffer'});
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
    let delta = (event.timecode - prevtime) / 1000;
    prevtime = event.timecode; currtime += delta;
    if (!broadcast) return;
    let data = {data: event.data, timestamp: currtime};
    a.connection.send(data);
    console.log('[A] Sent chunk with timestamp:', currtime);
}

async function recieveChunk(chunk) {
    if (chunk.first) return;
    let buffer = await decode(chunk.data);
    let source = context.createBufferSource();
    let start = context.currentTime + chunk.timestamp - time();
    console.log('NOW:', context.currentTime, 'PLAY AT:', start);
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(start);
    console.log('[B] Scheduled chunk with timestamp:', chunk.timestamp);
}

async function decode(chunk) {
    let header = firstchunk.slice(0, 162);
    let data = new Uint8Array(header.byteLength + chunk.byteLength);
    data.set(new Uint8Array(header), 0);
    data.set(new Uint8Array(chunk), header.byteLength);
    let buffer = await context.decodeAudioData(data.buffer);

    let silence = 1024;
    let newbuffer = context.createBuffer(1, buffer.length + silence, context.sampleRate);
    let signal = new Float32Array(buffer.length + silence);
    signal.set(buffer.getChannelData(0), 0);
    newbuffer.copyToChannel(signal, 0);

    console.log('OLD BUFFER:', buffer);
    console.log('NEW BUFFER:', newbuffer);
    return newbuffer;
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
