<template>
    <div class="flex-row">
        <div class="flex-col">
            <div class="flex-row">
                <p>FFT CHUNK SIZE:</p>
                <v-button-switch v-model="fftSize" @input="setupDetector"
                                 :items="[512, 1024, 2048, 4096]"></v-button-switch>
            </div>
            <div class="flex-row">
                <div class="flex-col">
                    <div class="flex-row">
                        <p>FFT NEIGHBOURS:</p>
                        <v-spinbox v-model="fftNeighbours" :min="0" :max="10"></v-spinbox>
                    </div>
                    <div class="flex-row">
                        <p>DETECTION FREQ:</p>
                        <v-spinbox v-model="freqIndex" :display="freq.toFixed(0)" :min="0" :max="fftSize">Hz</v-spinbox>
                    </div>
                    <div class="flex-row">
                        <p>PROBE ACCURACY:</p>
                        <v-spinbox v-model="accuracy" :min="1" :max="50">ms</v-spinbox>
                    </div>
                    <div class="flex-row">
                        <p>MIC SAMPLE RATE:</p>
                        <v-button :value="!active" @click="activate()">
                            {{ active ? sampleRate + ' Hz' : 'ACTIVATE' }}
                        </v-button>
                    </div>
                    <p></p>
                    <div class="flex-row">
                        <p>MIN VOLUME:</p>
                        <v-spinbox v-model="minVolume" @input="setupDetector" :min="-100" :max="maxVolume">dB
                        </v-spinbox>
                    </div>
                    <div class="flex-row">
                        <p>MAX VOLUME:</p>
                        <v-spinbox v-model="maxVolume" @input="setupDetector" :min="minVolume" :max="-30">dB</v-spinbox>
                    </div>
                    <div class="flex-row">
                        <p>DET VOLUME:</p>
                        <v-spinbox v-model="detVolume" :min="minVolume" :max="maxVolume">dB</v-spinbox>
                    </div>
                    <p></p>
                    <div class="flex-row">
                        <p>BEEPS COUNT:</p>
                        <v-spinbox v-model="beepsCount" :min="1" :max="10"></v-spinbox>
                    </div>
                    <div class="flex-row">
                        <p>BEEPS LEN:</p>
                        <v-spinbox v-model="beepsLength" :min="50" :max="500" :step="50">ms</v-spinbox>
                    </div>
                    <div class="flex-row">
                        <p>BEEPS GAP:</p>
                        <v-spinbox v-model="beepsGap" :min="50" :max="500" :step="50">ms</v-spinbox>
                    </div>
                </div>
                <div></div>
                <v-dbmeter class="flex-fill" :value="value" :bars="bars" :threshold="threshold">
                    <template v-slot:min>{{ minVolume }}</template>
                    <template v-slot:max>{{ maxVolume }}</template>
                </v-dbmeter>
            </div>
        </div>
        <div class="flex-col">
            <v-button>BEEP</v-button>
        </div>
    </div>
</template>

<script>
    import 'babel-polyfill';
    import VButton from './components/v-button';
    import VButtonSwitch from './components/v-button-switch';
    import VSpinbox from './components/v-spinbox';
    import VDbmeter from './components/v-dbmeter';
    import getUserMedia from 'get-user-media-promise';
    import Analyser from './analyser';

    export default {
        components: {
            VDbmeter,
            VSpinbox,
            VButtonSwitch,
            VButton
        },
        data() {
            return {
                // API
                active: false,
                context: null,
                stream: null,
                source: null,
                analyser: null,
                detector: null,

                // DATA
                value: 0,
                bars: [0],

                // GENERAL
                fftSize: 1024,
                freqIndex: 10,
                fftNeighbours: 1,
                sampleRate: 44100,
                accuracy: 5,

                // VOLUME
                minVolume: -100,
                maxVolume: -30,
                detVolume: -40,

                // BEEPS
                beepsCount: 3,
                beepsLength: 200,
                beepsGap: 400,
            }
        },
        computed: {
            freq() {
                return this.freqIndex * this.sampleRate / this.fftSize;
            },
            threshold() {
                return (this.detVolume - this.minVolume) / (this.maxVolume - this.minVolume);
            }
        },
        methods: {
            async activate() {
                if (this.active) return;
                this.context = new AudioContext();
                this.sampleRate = this.context.sampleRate;
                this.stream = await getUserMedia({video: false, audio: true});
                this.source = this.context.createMediaStreamSource(this.stream);
                this.setupDetector();
                this.active = true;
            },
            setupDetector() {
                if (this.analyser) this.analyser.stop();
                this.analyser = new Analyser(this.context, this.source, this);
                this.analyser.onupdate = (v, b) => {
                    this.value = v;
                    this.bars = b
                };
            }
        }
    }
</script>
