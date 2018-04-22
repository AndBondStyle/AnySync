// Simple socket.io-like wrapper based on ReconnectingWebSocket
// Features: auto JSON conversion and `on` method for binding
const Socket = function (path) {
    var scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    var url = scheme + '://' + window.location.host + path;
    var socket = new ReconnectingWebSocket(url);
    var callbacks = {};
    var original = socket.send;
    socket.send = (event, data) => original(
        JSON.stringify({event: event, data: data})
    );
    socket.on = (event, callback) => {callbacks[event] = callback};
    socket.onmessage = (raw) => {
        var message = JSON.parse(raw.data);
        if (!'event' in message || !'data' in message) return;
        if (!message.event in callbacks) return;
        return callbacks[message.event](message.data);
    };
    return socket;
};
