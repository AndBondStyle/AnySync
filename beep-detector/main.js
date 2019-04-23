import 'babel-polyfill';
import Vue from 'vue';
import Batton from './components/batton';
import Spinbox from './components/spinbox';
import Timeline from './components/timeline';
import App from './app.vue';

Vue.component('batton', Batton);
Vue.component('spinbox', Spinbox);
Vue.component('timeline', Timeline);

new Vue(App).$mount('#app');
