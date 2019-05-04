let peerButton = null;   // PEER ID BUTTON
let statusButton = null; // STATUS BUTTON
let mainButton = null;   // MAIN ACTION BUTTON
let status = null;       // LAST STATUS OBJECT

window.addEventListener('load', init);

function init() {
    peerButton = document.querySelector('#peer');
    statusButton = document.querySelector('#status');
    mainButton = document.querySelector('#button');
    peerButton.onclick = () => clipboardCopy(status.peer);
    setInterval(() => chrome.runtime.sendMessage('status', update), 500);
    chrome.runtime.sendMessage('status', update);
}

function update(newstatus) {
    status = newstatus;
    peerButton.innerText = 'PEER ID: ' + status.peer;
    if (status.capturing) {
        statusButton.innerText = 'STATUS: CAPTURING';
        statusButton.classList.add('danger');
    } else {
        statusButton.innerText = 'STATUS: IDLE';
        statusButton.classList.remove('danger');
    }
    if (status.capturing && status.current) {
        mainButton.innerText = 'RELEASE TAB';
        mainButton.onclick = () => chrome.runtime.sendMessage('release');
    } else {
        mainButton.innerText = 'CAPTURE TAB';
        mainButton.onclick = () => chrome.runtime.sendMessage('capture');
    }
}
