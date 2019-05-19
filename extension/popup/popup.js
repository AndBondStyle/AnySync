import copy2clipboard from 'clipboard-copy';

const url = 'https://anysync.herokuapp.com/?';

let peerButton = null;   // PEER ID BUTTON
let statusButton = null; // STATUS BUTTON
let mainButton = null;   // MAIN ACTION BUTTON
let status = null;       // LAST STATUS OBJECT
let copying = false;     // COPYING INDICATOR

window.addEventListener('load', init);

function init() {
    peerButton = document.querySelector('#peer');
    statusButton = document.querySelector('#status');
    mainButton = document.querySelector('#button');
    peerButton.onclick = () => copy(url + status.peer);
    setInterval(() => chrome.runtime.sendMessage('status', update), 500);
    chrome.runtime.sendMessage('status', update);
}

function copy(text) {
    copying = true;
    peerButton.innerText = '<<< URL COPIED >>>';
    if (text) copy2clipboard(text);
    setTimeout(() => copying = false, 1000);
}

function update(newstatus) {
    status = newstatus;
    if (!copying) peerButton.innerText = 'PEER ID: ' + status.peer;
    if (status.capturing && status.current) {
        mainButton.innerText = 'RELEASE TAB';
        mainButton.classList.add('active');
        mainButton.onclick = () => chrome.runtime.sendMessage('release');
    } else {
        mainButton.innerText = 'CAPTURE TAB';
        mainButton.classList.remove('active');
        mainButton.onclick = () => chrome.runtime.sendMessage('capture');
    }
    if (status.capturing) {
        statusButton.innerText = 'STATUS: CAPTURING';
        statusButton.classList.add('danger');
    } else {
        statusButton.innerText = 'STATUS: IDLE';
        statusButton.classList.remove('danger');
    }
    statusButton.innerText += ' (' + status.count + ')';
}
