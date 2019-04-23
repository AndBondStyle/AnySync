<template>
    <div class="btn" @click="clicked" :class="{active: value > 0, danger: value < 0, fake: !enabled}">
        <slot></slot>
    </div>
</template>

<script>
    export default {
        name: 'batton',
        props: {
            value: {type: [Number, Boolean], default: false},
            enabled: {type: Boolean, default: true},
            toggable: {type: Boolean, default: false},
        },
        methods: {
            clicked() {
                if (!this.enabled) return;
                this.$emit('click');
                if (!this.toggable) return;
                this.$emit('input', !this.value);
            }
        }
    }
</script>
