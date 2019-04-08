'use strict';
import 'babel-polyfill';

import getUserMedia from 'get-user-media-promise';
import Detector from './detector';
import Beeper from './beeper';

let config = {
    detector: {
        duration: null,
        margin: 500,
        winsize: 1024,
        winstep: 32,
        index: 10,
    },
    beeper: {
        frequency: null,
        count: 3,
        duration: 50,
        distance: 50,
        margin: 10,
    },
};

let context = null;
let stream = null;
let detector = null;
let beeper = null;
let levels = null;
let threshold = -2;

let canvas = document.querySelector('#canvas');
let button = document.querySelector('#button');
let label = document.querySelector('#label');
let range = document.querySelector('#range');
range.oninput = update;
button.onclick = init;

async function init() {
    context = new AudioContext();
    // stream = await getUserMedia({audio: true});
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
    console.log('CONFIG:', config);

    button.innerText = 'BEEP PROBE';
    button.classList.add('active');
    button.onclick = probe;
}

async function probe() {
    let duration = config.detector.duration;
    beeper.beep(config.beeper);
    let promise = detector.record(duration);
    let data = await promise;
    levels = await detector.detect(data, config.detector);
    console.log(levels);
    update();
}

function update() {
    threshold = +range.value / 10 - 10;
    label.innerText = threshold.toFixed(1);
    if (levels == null) return;
    let context = canvas.getContext('2d');
    let width = canvas.width = levels.length;
    let height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = '#00838F';
    context.beginPath();
    for (let i = 0; i < width; i++) {
        if (levels[i] < threshold) continue;
        context.moveTo(i, 0);
        context.lineTo(i, height);
        context.stroke();
    }
}
