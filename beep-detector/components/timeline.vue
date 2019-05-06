<template>
    <div class="wrapper">
        <canvas style="padding: 0" height="200" width="100"></canvas>
    </div>
</template>

<script>
    export default {
        name: 'timeline',
        props: {
            signal: {type: Array, required: true},
            threshold: {type: Number, required: true},
            range: {type: Number, required: true},
        },
        watch: {
            signal() { this.repaint() },
            threshold() { this.repaint() },
            range() { this.repaint() },
        },
        methods: {
            repaint() {
                let canvas = this.$el.children[0];
                let width = canvas.width = this.signal.length;
                let height = +canvas.height;
                let context = canvas.getContext('2d');
                context.line = (x1, x2, y1, y2, color) => {
                    context.beginPath();
                    context.strokeStyle = color;
                    context.moveTo(x1, y1);
                    context.lineTo(x2, y2);
                    context.stroke();
                }
                context.clearRect(0, 0, width, height);
                for (let i = 0; i < width; i++) {
                    if (this.signal[i] > this.threshold) context.line(i, i, 0, height, '#00838F');
                    let value = 1 - (this.signal[i] - (this.threshold - this.range)) / (this.range * 2);
                    value = Math.max(0, Math.min(value, 1));
                    context.line(i, i, value * height, height, '#FFFFFF33');
                }
                context.setLineDash([10, 10]);
                context.line(0, width, height / 2, height / 2, '#CDCFDE');
            },
        },
    }
</script>

<style scoped>
    .wrapper {
        display: flex;
        width: 1300px;
        max-width: 100%;
        overflow: auto;
        border: 2px solid #CDCFDE;
    }

    canvas {
        margin: 0 auto;
    }
</style>
