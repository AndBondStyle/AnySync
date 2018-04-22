const Stream = new function() {
    this.socket = Socket(window.location.pathname);

    this.send = (text) => this.socket.send('chat-message', {text: text});

    this.socket.on('chat-message', (data) => {
        var node = $('#templates .message').clone();
        if (data.class) node.addClass(data.class);
        node.find('.username').text(data.username);
        node.find('.text').text(data.text);
        $('#chat .messages').prepend(node);
    });
}();

$(document).ready(() => {
    // Volume slider
    $('#volume-btn').click(() => {
        $('#volume').val($('#volume').val() == 0 ? 5 : 0);
        $('#volume-btn i').toggleClass('fa-volume-off');
        $('#volume-btn i').toggleClass('fa-volume-up');
    });
    $('#volume').change(() => {
        var muted = $('#volume-btn i').hasClass('fa-volume-off');
        if (!+$('#volume').val() == muted) return;
        $('#volume-btn i').toggleClass('fa-volume-off');
        $('#volume-btn i').toggleClass('fa-volume-up');
    });

    // Message input & button
    $('#send-btn').click(() => {
        var text = $('#message').val();
        if (!text.length) return;
        Stream.send(text);
        $('#message').val('');
        $('#message').focus();
    });
    $('#message').keypress((event) => { if (event.which == 13) $('#send-btn').click(); })
});
