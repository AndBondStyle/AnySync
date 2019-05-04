import 'babel-polyfill';
import Peer from 'peerjs';

window.addEventListener('load', () => document.querySelector('#button').onclick = activate);

async function activate() {
    let time = new Date().getTime();
    let button = document.querySelector('#button');
    button.classList.remove('active');
    button.classList.add('fake');
    button.onclick = null;

    let query = window.location.search;
    if (query === '') {
        history.replaceState(null, '', '?');
        button.innerText = 'NO PEER ID SPECIFIED';
        return;
    }

    button.innerText = 'CONNECTING...';
    console.log('SETTING UP PEER...');
    let peer = new Peer();
    await new Promise(resolve => peer.once('open', resolve));

    let id = query.slice(1);
    console.log('LOCAL PEER ID:', peer.id);
    console.log('REMOTE PEER ID:', id);
    console.log('CONNECTING...');

    let resolve = null;
    let promise = new Promise(r => resolve = r);
    peer.once('error', () => resolve(false));
    let conn = peer.connect(id);
    conn.once('open', () => resolve(true));

    let ok = await promise;
    if (!ok) {
        console.log('FAILED TO CONNECT');
        button.innerText = 'FAILED';
        button.classList.add('danger');
        return
    }

    console.log('SUCCESS - WAITING FOR THE CALL...');
    let call = await new Promise(resolve => peer.once('call', resolve));
    console.log('GOT INCOMING CALL');
    call.answer();
    let stream = await new Promise(resolve => call.once('stream', resolve));
    console.log('GOT MEDIA STREAM');

    console.log('SETTING UP PLAYBACK...');
    let audio = document.querySelector('#audio');
    audio.srcObject = stream;
    audio.play();
    button.innerText = 'LIVE';
    button.classList.add('danger');
    time = (new Date().getTime() - time) / 1000;
    console.log('DONE IN', time.toFixed(1), 'SECONDS');
}
