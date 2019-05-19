<template>
    <div class="flex-row text-center">
        <batton @click="$emit('input', value - step)" :enabled="(value - step / 2) > min">&minus;</batton>
        <p>{{ display !== null ? display : value.toFixed(2) }} <slot></slot></p>
        <batton @click="$emit('input', value + step)" :enabled="(value + step / 2) < max">&plus;</batton>
    </div>
</template>

<script>
    export default {
        name: 'spinbox',
        props: {
            value: {type: Number, required: true},
            display: {type: [Number, String], default: null},
            min: {type: Number, required: true},
            max: {type: Number, required: true},
            step: {type: Number, default: 1}
        },
    }
</script>
