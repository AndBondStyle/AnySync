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

Handles everything device-related

* `constructor(conn, context, source)` &ndash; constructs freshly-connected device:
    * `conn` &ndash; peer connection (wrapped)
    * `context` &ndash; audio context to work within
    * `source` &ndash; media stream source node
* `schedule(config)` &ndash; schedules synchronization routine, where config consists of:
    * `start` &ndash; sync schedule start timestamp (s)
    * `end` &ndash; sync schedule end timestamp (s)
    * `record` &ndash; bool indicating if device need to record feedback
    * `beep` &ndash; bool indicating if device need to beep
    * `beepfreq` &ndash; frequency to beep at (if beep is true)
    * `beeptime` &ndash; timestamp to beep at (if beep is true)

### `Peer`

Peer.js socket wrapper

* `get id` &ndash; original peer id
* `promise ready(id)` &ndash; resolved when connection is either established or failed
* `broadcast(event, data)` &ndash; send data to all active connections
* `async connect(id)` &ndash; connect to remote peer
* `event connection(conn)` &ndash; incoming connection, already wrapped
* `event stream(stream)` &ndash; incoming media stream
* `event disconnected` &ndash; lost connection to signalling server

### `Connection`

Peer.js connection wrapper

* `constructor(conn)` &ndash; wraps original connection `conn`
* `promise ready(id)` &ndash; resolved when connection is either established or failed
* `event <event>` &ndash; fired when corresponding data is received
* `event close` &ndash; fired when connection is dead

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

* `constructor(stream)` &ndash; `stream` is source media stream from WebRTC
* `set latency(value)` &ndash; adjusts playback delay to compensate provided latency
* `get-set volume(value)` &ndash; gets || sets playback volume

Events
------

### `'devices'`

Direction: leader &rarr; clients

* `id` &ndash; device peer id
* `status` &ndash; device status:
    * `0` &ndash; disconnected
    * `1` &ndash; connected, not synced
    * `2` &ndash; connected, synced
    * `3` &ndash; connected, sync failed
* `latency` &ndash; audio output latency (s)

### `'record'`

Direction: leader &rarr; clients

* `start` &ndash; feedback recording start timestamp (s)
* `end` &ndash; feedback recording end timestamp (s)

### `'feedback'`

Direction: clients &rarr; leader

* `data` &ndash; one of following:
    * `arraybuffer` &ndash; feedback recorded successfully
    * `null` &ndash; mic unavailable || something went wrong
    
### `'time'`

Direction: leader &harr; clients

* `data` &ndash; sender timestamp (s)

### `'ping'`

Direction: leader &harr; clients
