<template>
    <div class="flex-col text-center">
        <p class="text-big">===== TOTO SYNC v2 =====</p>
        <div class="btn" :class="{active: !initialised}" @click="callback">
            <span v-if="!initialised"><<< ACTIVATE >>></span>
            <span v-else-if="party == null">CONNECTING...</span>
            <span v-else-if="!copying">PARTY ID: {{ party }}</span>
            <span v-else><<< URL COPIED >>></span>
        </div>
        <div class="flex-row" v-if="party && leader">
            <div v-if="!syncing" class="btn flex-fill" @click="toggle">
                {{ playing ? 'STOP' : 'START' }}
            </div>
            <div class="btn flex-fill" @click="sync">
                {{ syncing ? 'SYNCING...' : 'SYNC' }}
            </div>
        </div>
        <div class="btn" :class="{active: devices.length > 1}">
            CONNECTED DEVICES: {{ devices.length }}
        </div>
        <div class="btn flex-row" v-for="device in devices">
            <p>{{ device.id }}</p>
            <p class="flex-fill">{{ device.latency !== null ? device.latency : '?' }} ms</p>
            <p>{{ ['ERR', 'NEW', 'OK'][device.status + 1] }}</p>
        </div>
    </div>
</template>

<script>
    import copy2clipborad from 'clipboard-copy';
    import Core from './core';

    export default {
        data() {
            return {
                initialised: false,
                party: null,
                leader: true,
                devices: [],
                playing: false,
                syncing: false,
                copying: false,
                callback: this.activate,
            }
        },
        methods: {
            async activate() {
                this.initialised = true;
                this.callback = this.copy.bind(this);
                this.core = new Core(this);
                this.party = await this.core.ready;
                await this.update();
                window.core = this.core;
            },
            async update() {
                this.devices = Object.values(this.core.devices);
                this.leader = this.core.leader;
                this.playing = this.core.player.playing;
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
