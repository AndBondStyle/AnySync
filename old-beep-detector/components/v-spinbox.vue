<template>
    <div class="flex-row">
        <v-button @click="change(-1)">&minus;</v-button>
        <p>{{ display || value }} <slot></slot></p>
        <v-button @click="change(+1)">&plus;</v-button>
    </div>
</template>

<script>
    import VButton from './v-button';

    export default {
        name: "v-spinbox",
        components: {VButton},
        props: {
            value: {
                type: Number,
                required: true,
            },
            display: {
                required: false,
                default: null,
            },
            min: {
                type: Number,
                required: true,
            },
            max: {
                type: Number,
                required: true,
            },
            step: {
                type: Number,
                required: false,
                default: 1,
            }
        },
        methods: {
            change(delta) {
                if (delta < 0 && this.value === this.min) return;
                if (delta > 0 && this.value === this.max) return;
                this.$emit('input', this.value + delta * this.step);
            }
        },
    }
</script>
