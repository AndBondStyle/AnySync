let target = null;      // TARGET TAB ID
let stream = null;      // RAW AUDIO STREAM
let context = null;     // AUDIO CONTEXT
let source = null;      // MEDIA STREAM SOURCE NODE
let destination = null; // MEDIA STREAM DESTINATION NODE
let peer = null;        // PEER.JS SOCKET
let connections = [];   // PEER.JS MEDIA CONNECTIONS

async function init() {
    console.log('SETTING UP PEER...');
    peer = new Peer();
    peer.on('connection', connection);
    peer.on('error', err => console.error('PEER ERROR:', err));
    await new Promise(resolve => peer.once('open', resolve));

    console.log('SETTING UP AUDIO ROUTING...');
    context = new AudioContext();
    destination = context.createMediaStreamDestination();

    console.log('DONE - PEER ID:', peer.id);
}

async function connection(conn) {
    console.log('CONNECTION:', conn.peer);
    // await new Promise(resolve => conn.once('open', resolve));
    // console.log('ok');
    peer.call(conn.peer, destination.stream);
    conn.close();
}

async function capture() {
    let tab = await currentTab();
    if (tab === null) return;
    if (target !== null) release();

    console.log('CAPTURING...');
    let resolve = null;
    let promise = new Promise(r => resolve = r);
    chrome.tabCapture.capture({audio: true}, resolve);

    target = tab;
    stream = await promise;
    source = context.createMediaStreamSource(stream);
    source.connect(destination);
    console.log('TAB CAPTURED');
}

async function release() {
    if (target === null) return
    console.log('RELEASING...');
    target = null;
    stream.getAudioTracks().map(x => x.stop());
    source.disconnect(destination);
    console.log('TAB RELEASED');
}

async function currentTab() {
    let resolve = null;
    let promise = new Promise(r => resolve = r);
    chrome.tabs.query({active: true, currentWindow: true}, tabs => resolve(tabs[0]));
    let tab = await promise;
    return tab ? tab.id : null;
}

async function status(response) {
    let tab = await currentTab();
    let status = {
        peer: peer.id,
        count: Object.keys(peer.connections).length,
        current: tab === null ? null : tab === target,
        capturing: target !== null,
    };
    response(status);
}

function message(request, sender, response) {
    // RETURN TRUE TO FORCE CHROME TO WAIT FOR RESPONSE
    if (request === 'status') return status(response) && true;
    if (request === 'capture') capture();
    if (request === 'release') release();
}

chrome.runtime.onMessage.addListener(message);
chrome.runtime.onInstalled.addListener(init);
