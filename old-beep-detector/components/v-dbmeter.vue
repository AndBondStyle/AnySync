<template>
    <div class="dbmeter">
        <p><slot name="max"></slot></p>
        <div class="threshold" :style="{top: (1 - threshold) * 100 + '%'}"></div>
        <div class="flex-fill"></div>
        <p><slot name="min"></slot></p>

        <div class="main-bar" :style="{height: value * 100 + '%'}"></div>
        <div class="bars">
            <div class="bar" v-for="bar in bars" :style="{height: bar * 100 + '%'}"></div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'v-dbmeter',
        props: {
            value: {
                type: Number,
                required: true,
            },
            threshold: {
                type: Number,
                required: true,
            },
            bars: {
                type: Array,
                required: true,
            },
        }
    }
</script>
