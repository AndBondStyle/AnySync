<template>
    <div class="flex-col" style="max-width: 100%">
        <timeline :signal="display ? volume : smoothed" :threshold="threshold" :range="2"></timeline>
        <div class="container">
            <batton v-for="(x, i) in detfreqs" :value="i === freqindex" @click="freqindex = i">{{ i }}</batton>
            <batton :enabled="false">
                {{ detfreqs ? detfreqs[freqindex].toFixed(1) : '???' }} Hz @ {{ samplerate || '???' }} Hz
            </batton>
            <spinbox v-model="threshold" :min="-20" :max="0" :step="0.1"></spinbox>
            <batton @click="display = !display">{{ display ? 'VOLUME' : 'SMOOTHED' }}</batton>
            <div class="flex-row" style="margin-left: auto">
                <batton v-if="!signal" :value="-1" :enabled="false">NO DATA</batton>
                <batton v-else :value="1" @click="detect">DETECT</batton>
            </div>
        </div>
    </div>
</template>

<script>
    import Detector from './detector';

    export default {
        data() {
            let data = window.opener && window.opener.export;
            if (data) {
                this.detector = new Detector(data.samplerate, data.beeplen);
                window.detector = this.detector;
                this.$nextTick(this.detect.bind(this));
            }
            return {
                signal: data && data.signal,
                samplerate: data && data.samplerate,
                beeplen: data && data.beeplen,
                detfreqs: data && data.detfreqs,
                freqindex: 0,
                threshold: -5,
                volume: [],
                smoothed: [],
                display: true,
            }
        },
        watch: {
            freqindex() { this.detect() },
        },
        methods: {
            async detect() {
                let freq = this.detfreqs[this.freqindex];
                this.detector.detect(this.signal, freq);
                this.threshold = this.detector.export.threshold;
                this.volume = this.detector.export.volume;
                this.smoothed = this.detector.export.smoothed;
            },
        }
    }
</script>

<style scoped>
    * {
        white-space: nowrap;
    }

    .container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin: -10px;
    }

    .container > * {
        margin: 10px;
    }
</style>
