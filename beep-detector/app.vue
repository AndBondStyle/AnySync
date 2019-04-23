<template>
    <div class="flex-col" style="max-width: 100%">
        <timeline :signal="signal" :threshold="threshold" :range="1"></timeline>
        <div class="container">
            <batton v-for="(x, i) in detfreqs" :value="i === freqindex" @click="freqindex = i">{{ i }}</batton>
            <batton :enabled="false">{{ detfreqs[freqindex].toFixed(1) }} Hz @ {{ samplerate || '???' }} Hz</batton>
            <spinbox v-model="threshold" :min="-10" :max="0" :step="0.1"></spinbox>
            <div class="flex-row">
                <batton v-if="data === null" :value="-1" :enabled="false">NO DATA</batton>
                <batton v-else :value="1" @click="detect">DETECT</batton>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        data() {
            let data = window.opener && window.opener.export;
            let detfreqs = data && data.detfreqs;
            detfreqs = [1125, 1312.5, 1500, 1687.5, 1875, 2062.5, 2250];

            return {
                data: data,
                detfreqs: detfreqs,
                freqindex: 0,
                samplerate: 48000,
                threshold: -5,
                signal: [],
            }
        },
        methods: {
            detect() {

            },
            download(data) {
                if (data == null) return;
                let link = document.createElement('a');
                let blob = new Blob([data]);
                link.href = URL.createObjectURL(blob);
                link.download = 'audio.opus';
                link.click();
                link.remove();
            },
        }
    }
</script>

<style scoped>
    p, .btn {
        white-space: nowrap;
    }

    .container {
        max-width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        margin: -10px;
    }

    .container > * {
        margin: 10px;
    }
</style>
