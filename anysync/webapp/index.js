import 'babel-polyfill';
import copy2clipboard from 'clipboard-copy';
import Vue from 'vue/dist/vue.esm';
import Core from './core';

new Vue({
    el: '#app',
    data: {
        status: 'initial',
        party: null,
        index: null,
        devices: [],
        copying: false,
    },
    mounted() {
        let query = window.location.search;
        if (query === '') history.replaceState(null, '', '?');
        else this.party = query.slice(1);
    },
    methods: {
        async connect() {
            this.status = 'connecting';
            this.core = window.core = new Core();
            this.core.on('update', this.update.bind(this));
            this.core.on('disconnected', () => this.status = 'disconnected');
            let ok = await this.core.connect(this.party);
            this.status = ok ? 'connected' : 'failed';
        },
        async update() {
            this.devices = this.core.devices;
            this.index = this.devices.findIndex(x => x.id === this.core.id);
            if (this.index === -1) this.index = null;
            if (this.connected && !this.core.conn) this.failed = true;
        },
        async copy() {
            this.copying = true;
            copy2clipboard(location.href);
            setTimeout(() => this.copying = false, 1000);
        },
        async toggle() {
            // TODO
        },
    },
});
