import 'babel-polyfill';
import copy2clipboard from 'clipboard-copy';
import * as Sentry from '@sentry/browser';
import Vue from 'vue/dist/vue.esm';
import sleep from 'await-sleep';
import Core from './core';

window.sentry = Sentry.init({
    dsn: 'https://8684d9c305bb42d382df3e9a5b4fb648@sentry.io/273014',
    integrations: [new Sentry.Integrations.Breadcrumbs()],
});

window.app = new Vue({
    el: '#app',
    data: {
        status: 'initial',
        party: null,
        index: null,
        devices: [],
        syncing: false,
        copying: false,
    },
    mounted() {
        let query = window.location.search;
        if (query === '') history.replaceState(null, '', '?');
        else this.party = query.slice(1);
        this.$el.style = '';
    },
    methods: {
        async connect() {
            this.status = 'connecting';
            this.core = window.core = new Core();
            this.core.on('update', this.update.bind(this));
            this.core.on('disconnected', () => this.status = 'disconnected');
            this.core.on('sync', syncing => this.syncing = syncing);
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
            await sleep(1000);
            this.copying = false;
        },
    },
});
