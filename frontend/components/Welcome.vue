<template>
    <div class="jumbotron">
        <!--<img alt="Vue logo" src="@/assets/logo.png">-->
        <h1 class="display-4">{{ message }}</h1>
        <p class="lead">{{ description }}</p>
        <p class="lead"><a class="btn btn-secondary" role="button">Button</a></p>
    </div>
</template>

<script>
    export default {
        name: 'Welcome',
        props: {
            message: String,
            description: String,
        }
    }
</script>
