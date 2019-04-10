<template>
    <div class="flex-row">
        <v-button v-for="item in items" :value="item === value" @click="$emit('input', item)">
            {{ item }}
        </v-button>
    </div>
</template>

<script>
    import VButton from './v-button';

    export default {
        name: 'v-button-switch',
        components: {VButton},
        props: {
            value: {
                required: true,
            },
            items: {
                type: Array,
                required: true,
            },
            mode: {
                type: String,
                required: false,
                default: 'radio',
                validate: v => ['radio', 'check'].indexOf(v) !== -1,
            }
        }
    }
</script>
