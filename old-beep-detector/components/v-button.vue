<template>
    <div class="btn" :class="{active: value}" @click="clicked">
        <slot></slot>
    </div>
</template>

<script>
    export default {
        name: 'v-button',
        props: {
            value: {
                type: Boolean,
                required: false,
                default: false,
            },
            toggable: {
                type: Boolean,
                required: false,
                default: false,
            }
        },
        methods: {
            clicked() {
                this.$emit('click');
                if (!this.toggable) return;
                this.$emit('input', !this.value);
            }
        }
    }
</script>
