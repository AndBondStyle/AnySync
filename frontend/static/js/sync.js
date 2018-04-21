// Simple time synchronization handler
// Features: pseudo-smart average, auto update
const Sync = new function () {
    this.probes = 15;       // Ping & time probes count
    this.delay = 20;        // Delay between probes
    this.truncate = 5;     // Truncated mean parameter
    this.interval = 30000;  // Resync interval

    this.location = null;
    this.socket = null;
    this.ready = false;
    this.onready = null;
    this.messages = [];

    this.init = (callback) => {
        this.onready = callback;
        var scheme = window.location.protocol === 'https' ? 'wss' : 'ws';
        this.location = scheme + '://' + window.location.host + '/sync/';
        setInterval(this.sync, this.interval);
        return this.sync();
    };

    this.sync = () => {
        this.socket = new WebSocket(this.location);
        this.socket.onopen = this.send;
        this.socket.onmessage = this.receive;
        this.messages = [];
    };

    this.send = () => {
        var time = new Date().getTime();
        this.socket.send('.');
        this.messages.push({sent: time});
    };

    this.receive = (message) => {
        var time = new Date().getTime();
        var last = this.messages[this.messages.length - 1];
        last.received = time;
        last.timestamp = +message.data;
        last.ping = (last.received - last.sent) / 2;
        last.offset = last.timestamp - last.sent - last.ping;
        if (this.messages.length == this.probes) return this.calc();
        setTimeout(this.send, this.delay);
    };

    this.calc = () => {
        this.socket.close();
        var messages = this.messages.map(x => x.offset);
        var sorted = messages.sort((a, b) => a < b);
        var truncated = sorted.slice(this.truncate, this.probes - this.truncate);
        var mean = sorted.reduce((a, b) => a + b) / this.probes;
        var old = this.offset == null ? mean : this.offset;
        this.offset = Math.round((old + mean) / 2);
        console.log('Final time offset:', this.offset);
    };

    this.time = () => new Date().getTime() + this.offset;
}();
