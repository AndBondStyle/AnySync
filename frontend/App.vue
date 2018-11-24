<template>
    <div id="app" class="container px-0">
        <nav class="navbar navbar-expand navbar-dark bg-dark">
            <router-link class="navbar-brand mr-auto" to="/">BRAND</router-link>
            <div class="navbar-collapse collapse">
                <ul class="navbar-nav ml-auto">
                    <router-link class="nav-link" to="/">Home</router-link>
                    <router-link class="nav-link" to="/party">Party</router-link>
                    <router-link class="nav-link" to="/about">About</router-link>
                </ul>
            </div>
        </nav>
        <div class="container mt-3">
            <router-view/>
        </div>
    </div>
</template>

<style lang="scss">
    @import "variables";
    @import "~bootstrap/scss/bootstrap";

    html, body {
        margin: 0;
        height: 100%;
        width: 100%;
    }

    #app {
        background: $gray-750;
        max-width: 720px;
        height: 100%;
        text-align: center;
    }

    .navbar-nav {
        text-transform: uppercase;
    }
</style>
