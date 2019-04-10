'use strict';
import 'babel-polyfill';

import getUserMedia from 'get-user-media-promise';
import Detector from './detector';
import Beeper from './beeper';

let config = window.config = {
    detector: {
        duration: null,
        margin: 500,
        winsize: 1024,
        winstep: 32,
        index: 20,
    },
    beeper: {
        frequency: null,
        count: 2,
        duration: 50,
        distance: 50,
        margin: 100,
    },
};

let context = null;
let stream = null;
let detector = null;
let beeper = null;
let levels = null;
let threshold = null;
let data = null;

async function init() {
    context = new AudioContext();
    stream = await getUserMedia({audio: true});
    detector = new Detector(context, stream);
    beeper = new Beeper(context);

    config.beeper.frequency = (
        config.detector.index * context.sampleRate / config.detector.winsize
    );
    config.detector.duration = (
        config.detector.margin
        + config.beeper.count * config.beeper.duration
        + (config.beeper.count - 1) * config.beeper.distance
    );

    console.log('AUDIO CONTEXT SAMPLE RATE:', context.sampleRate, 'Hz');
    console.log('FINAL BEEPER CONFIG:', config.beeper);
    console.log('FINAL DETECTOR CONFIG:', config.detector);

    let width = config.beeper.duration / (config.detector.winstep / context.sampleRate * 1000);
    beepLabel.innerText = config.beeper.duration + ' ms';
    beep.style.width = width + 'px';
    timeline.style.display = '';
    button.innerText = 'BEEP PROBE';
    button.classList.add('active');
    button.onclick = probe;
    update();
}

async function probe() {
    button.innerText = 'PROBING...';
    button.classList.remove('active');
    download.classList.remove('active');

    let duration = config.detector.duration;
    beeper.beep(config.beeper);
    data = await detector.record(duration);
    levels = await detector.detect(data, config.detector);
    console.log('DETECTOR OUTPUT:', levels);
    update();

    button.innerText = 'BEEP PROBE';
    button.classList.add('active');
    download.classList.add('active');
}

function update() {
    threshold = +range.value / 20 - 10;
    rangeLabel.innerText = threshold.toFixed(1);
    if (levels == null) return;
    let context = canvas.getContext('2d');
    let width = canvas.width = levels.length;
    let height = canvas.height;
    context.clearRect(0, 0, width, height);
    for (let i = 0; i < width; i++) {
        if (levels[i] > threshold) {
            context.beginPath();
            context.strokeStyle = '#00838F';
            context.moveTo(i, 0);
            context.lineTo(i, height);
            context.stroke();
        }
        if (Math.abs(levels[i] - threshold) < 0.5) {
            let value = 1 - (levels[i] - threshold + 0.5);
            context.beginPath();
            context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            context.moveTo(i, value * height);
            context.lineTo(i, height);
            context.stroke();
        } else if (levels[i] > threshold) {
            context.beginPath();
            context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            context.moveTo(i, 0);
            context.lineTo(i, height);
            context.stroke();
        }
    }
    context.beginPath();
    context.strokeStyle = '#CDCFDEFF';
    context.setLineDash([10, 10]);
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
}

function savedata() {
    if (data == null) return;
    let link = document.createElement('a');
    let blob = new Blob([data]);
    link.href = URL.createObjectURL(blob);
    link.download = 'audio.opus';
    link.click();
    link.remove();
}

let canvas = document.querySelector('#canvas');
let button = document.querySelector('#button');
let rangeLabel = document.querySelector('#range-label');
let range = document.querySelector('#range');
let beepLabel = document.querySelector('#beep-label');
let beep = document.querySelector('#beep');
let timeline = document.querySelector('#timeline');
let download = document.querySelector('#download');

timeline.style.display = 'none';
range.oninput = update;
button.onclick = init;
download.onclick = savedata;

console.log('CONFIG IS ACCESSIBLE THROUGH WINDOW.CONFIG');
console.log('SOME VALUES ARE CALCULATED ONCE AT ACTIVATION');
console.log('CURRENT BEEPER CONFIG:', config.beeper);
console.log('CURRENT DETECTOR CONFIG:', config.detector);
