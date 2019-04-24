<template>
    <div class="flex-fill flex-col text-center">
        <div class="flex-fill"></div>
        <p class="text-big">===== TOTO SYNC v2 =====</p>
        <div v-if="!activated" class="btn active" @click="activate"><<< ACTIVATE >>></div>
        <div v-if="activated" class="btn" :class="{danger: failed}" @click="copy">
            <span v-if="!peer">CONNECTING...</span>
            <span v-else-if="failed">CONNECTION FAILED</span>
            <span v-else-if="copying"><<< URL COPIED >>></span>
            <span v-else>PARTY ID: {{ party }} #{{ index || 0 }}</span>
        </div>
        <div class="flex-row" v-if="party && leader">
            <div v-if="!syncing" class="btn flex-fill" @click="toggle">
                {{ playing ? 'STOP' : 'START' }}
            </div>
            <div class="btn flex-fill" @click="sync" :class="{fake: syncing, danger: syncing}">
                {{ syncing ? 'SYNCING...' : 'SYNC' }}
            </div>
        </div>
        <div class="btn fake" :class="{active: devices.length > 1}">
            CONNECTED DEVICES: {{ devices.length }}
        </div>
        <div class="flex-row">
            <div class="flex-col flex-fill">
                <div class="flex-row" v-for="(device, index) in devices">
                    <div class="btn" :class="{active: exports[device.id]}" @click="viewdata(device.id)">
                        #{{ index }}
                    </div>
                    <div class="btn fake flex-fill">
                        {{ device.latency !== null ? device.latency : '?' }} ms
                    </div>
                </div>
            </div>
            <div class="flex-col">
                <div class="btn" v-for="device in devices" @click="toggleState(device.id)"
                     :class="{fake: !leader, active: device.status === 1, danger: device.status === -1}">
                    {{ ['ERR', 'NEW', 'OK'][device.status + 1] }}
                </div>
            </div>
        </div>
        <div class="flex-fill"></div>
        <a @click="feedback">FEEDBACK</a>
        <div></div>
    </div>
</template>

<script>
    import copy2clipborad from 'clipboard-copy';
    import Core from './core';

    export default {
        data() {
            return {
                activated: false,
                failed: false,
                peer: null,
                party: null,
                index: null,
                leader: true,
                devices: [],
                exports: {},
                playing: false,
                syncing: false,
                copying: false,
                feedback: () => window.feedback(),
            }
        },
        methods: {
            async activate() {
                this.activated = true;
                this.core = new Core(this);
                this.party = await this.core.ready;
                await this.update();
                window.core = this.core;
            },
            async update() {
                this.peer = this.core.peer.id;
                this.index = this.core.index;
                this.devices = Object.values(this.core.devices);
                this.exports = this.core.exports;
                this.leader = this.core.leader;
                this.playing = this.core.player.playing;
                if (!this.failed && this.core.peer && !this.core.party) {
                    this.failed = true;
                    setTimeout(() => this.failed = false, 2000);
                }
                this.$forceUpdate();
            },
            async copy() {
                this.copying = true;
                copy2clipborad(location.href);
                setTimeout(() => this.copying = false, 1000);
            },
            async toggle() {
                if (this.core.player.playing) this.core.stop();
                else this.core.start();
            },
            async sync() {
                if (this.syncing) return;
                this.syncing = true;
                await this.core.sync();
                this.syncing = false;
            },
            async toggleState(id) {
                if (!this.leader || id === this.core.peer.id) return;
                let device = this.core.devices[id];
                device.status = device.status < 1 ? 1 : 0;
                this.core.broadcast({event: 'devices', data: this.core.devices});
            },
            async viewdata(id) {
                let data = this.exports[id];
                if (!data) return;
                window.export = data;
                window.open('/beep-detector/index.html');
            },
        },
    }
</script>
