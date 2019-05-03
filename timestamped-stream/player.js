

export default class Player {
    constructor(context, time) {
        this.context = context; // AUDIO CONTEXT
        this.time = time;       // TIME SOURCE (S)
        this.headersize = 162;  // OPUS HEADER SIZE
        this.header = null;     // OPUS HEADER
        this.prevchunk = null;  // PREV CHUNK
        this.offset = 0.5       // SLICE OFFFSET (S)

        // REMOTE TIMESTAMP -> LOCAL AUDIO CONTEXT TIMESTAMP
        this.timemap = ts => this.context.currentTime + ts - this.time();
    }

    // SUPPLY A NEW CHUNK
    async feed(chunk) {
        chunk.length = chunk.data.length;
        if (chunk.first) return this.header = chunk.data.slice(0, this.headersize);
        if (!this.prevchunk) {
            chunk.stop = this.timemap(chunk.timestamp) + this.offset;
            this.prevchunk = chunk;
            return;
        }
        await this.schedule(chunk);
    }

    // SCHEDULE CHUNK TO PLAY
    async schedule(chunk) {
        // CONCAT PREV CHUNK + CURRENT CHUNK BUFFERS
        let length = this.header.length + this.prevchunk.length + chunk.length;
        let buffer = new Uint8Array(length);
        buffer.set(this.header, 0);
        buffer.set(this.prevchunk.data, this.header.length);
        buffer.set(chunk.data, this.header.length + this.prevchunk.length);
        buffer = buffer.buffer;

        // let gain = this.context.createGain();
        // gain.gain.setValueAtTime(0.0, this.context.currentTime);
        // gain.gain.setValueAtTime(1.0, this.prevchunk.slice);
        // gain.gain.setValueAtTime(0.0, chunk.slice);
        // gain.connect(this.context.destination);

        // DECODE & SCHEDULE
        buffer = await this.context.decodeAudioData(buffer);
        chunk.stop = this.timemap(chunk.timestamp) + this.offset;
        let source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.context.destination);
        source.start(this.prevchunk.stop, this.offset);
        source.stop(chunk.stop);
        this.prevchunk = chunk;
    }
}
