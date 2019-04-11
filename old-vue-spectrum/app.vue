<template>
    <div id="app">
        <div v-for="bar in bars" class="bar" v-bind:style="{height: bar * 100 + '%'}"></div>
    </div>
</template>

<script>
    /*
    REFACTOR NEEDED
     */

    import getUserMedia from 'get-user-media-promise'
    // remove unused imports

    const BUFFER_SIZE = 1024

    // if undefined, uses default:

    const FFT_SIZE     = undefined  // power of 2
    const MIN_DECIBELS = undefined  // < -30
    const MAX_DECIBELS = undefined  // > MIN_DECIBELS
    const SMOOTH       = undefined  // 0 to 1

    export default {
        name: 'App',
        data() {
            return {
                bars: []
            }
        },
        mounted() {
            let instance = this  // can't be fixed without ugly constructs, e.g. .bind()

            getUserMedia({audio: true}).then(function (stream) {
                let AudioContext = window.AudioContext || window.webkitAudioContext
                let ctx = new AudioContext()

                let source = ctx.createMediaStreamSource(stream)
                let analyser = ctx.createAnalyser()
                let processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1)  // buffer, inputs ([source]), outputs ([destination])

                source.connect(analyser)
                source.connect(processor)

                processor.connect(ctx.destination)  // output

                analyser.fftSize = FFT_SIZE === undefined ? analyser.fftSize : FFT_SIZE
                analyser.minDecibels = MIN_DECIBELS === undefined ? analyser.minDecibels : MIN_DECIBELS
                analyser.maxDecibels = MAX_DECIBELS === undefined ? analyser.maxDecibels : MAX_DECIBELS
                analyser.smoothingTimeConstant = SMOOTH === undefined ? analyser.smoothingTimeConstant : SMOOTH

                let data = new Uint8Array(analyser.frequencyBinCount)
                processor.onaudioprocess = () => {
                    analyser.getByteFrequencyData(data)
                    instance.bars = Array.prototype.slice.call(data).map(x => x / 256)
                }
            })
        }
    }
</script>
