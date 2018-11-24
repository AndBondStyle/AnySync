module.exports = {
    outputDir: 'public',
    baseUrl: undefined,
    assetsDir: 'static',
    runtimeCompiler: undefined,
    productionSourceMap: undefined,
    parallel: undefined,

    configureWebpack(config) {
        config.entry.app = './frontend/main.js'
        config.resolve.alias['@'] = __dirname + '/frontend'
    },

    css: {
        sourceMap: true
    },

    pwa: {
        name: 'AnySync'
    }
}
