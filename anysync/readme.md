// TODO
=======

Constants
---------

* `samplerate` &ndash; audio context sample rate (?)
* `beeplen` &ndash; sync beep length (s)
* `beepstep` &ndash; distance between beeps (s)
* `beepsize` &ndash; beep length, but in samples
* `winsize` &ndash; FFT window size
* `winstep` &ndash; FFT window step
* `detfreqs` &ndash; array of detection frequencies

Classes
-------

### `Device`

Holds device info, peer socket + useful methods

### `Connector`

Peer.js socket wrapper + event parsing

### `Recorder`

Handles feedback recording

* `constructor(time)` &ndash; `time` is timesource function
* `record(start, end)` &ndash; records audio between `start` and `end` timestamps (s)

### `Detector`

Handles beep detection

* `constructor(samplerate)` &ndash; constructs detector with provided sample rate
* `detect(signal, freqs)` &ndash; detects beeps at provided frequencies:
    * `signal` &ndash; array of floats with raw PCM data
    * `freqs` &ndash; array of frequencies to detect

```
let buffer = await context.decodeAudioData(audio);
let detector = new Detector(buffer.sampleRate);
let signal = buffer.getChannelData(0);
let beeps = detector.detect(signal, freqs);
```

### `Player`

Handles audio stream playback with latency correction

Events
------

### `'devices'`

* `id` &ndash; device peer id
* `status` &ndash; device status:
    * `0` &ndash; disconnected
    * `1` &ndash; connected, not synced
    * `2` &ndash; connected, synced
* `latency` &ndash; audio output latency (s)

### `'sync'`

* `start` &ndash; sync schedule start timestamp (s)
* `end` &ndash; sync schedule end timestamp (s)

### `'feedback'`

* `data` &ndash; one of following:
    * `arraybuffer` &ndash; feedback recorded successfully
    * `null` &ndash; mic unavailable / something went wrong
    
### `'time'`

* `data` &ndash; sender timestamp (s)
