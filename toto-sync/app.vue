<template>
    <div class="flex-fill flex-col text-center">
        <div class="flex-fill"></div>
        <p class="text-big">===== TOTO SYNC v2 =====</p>
        <div v-if="!activated" class="btn active" @click="activate"><<< ACTIVATE >>></div>
        <div v-if="activated" class="btn" :class="{danger: failed}" @click="copy">
            <span v-if="!peer">CONNECTING...</span>
            <span v-else-if="failed">CONNECTION FAILED</span>
            <span v-else-if="copying"><<< URL COPIED >>></span>
            <span v-else>PARTY ID: {{ party }} {{ index !== null ? '#' + index : '' }}</span>
        </div>
        <div class="flex-row" v-if="party && leader">
            <div v-if="!syncing" class="btn flex-fill" @click="toggle">
                {{ playing ? 'STOP' : 'START' }}
            </div>
            <div class="btn flex-fill" @click="sync" :class="{ fake: syncing }">
                {{ syncing ? 'SYNCING...' : 'SYNC' }}
            </div>
        </div>
        <div class="btn fake" :class="{active: devices.length > 1}">
            CONNECTED DEVICES: {{ devices.length }}
        </div>
        <div class="btn fake flex-row" v-for="(device, index) in devices">
            <p>#{{ index }}</p>
            <p class="flex-fill">{{ device.latency !== null ? device.latency : '?' }} ms</p>
            <p>{{ ['ERR', 'NEW', 'OK'][device.status + 1] }}</p>
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
            }
        },
    }
</script>
