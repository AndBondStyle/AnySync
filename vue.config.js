module.exports = {
    outputDir: 'public',
    baseUrl: undefined,
    assetsDir: 'static',
    runtimeCompiler: undefined,
    productionSourceMap: undefined,
    parallel: undefined,
    // Webpack config
    configureWebpack(config) {
        config.entry.app = './frontend/main.js'
        config.resolve.alias['@'] = __dirname + '/frontend'
    },
    // CSS config
    css: {
        sourceMap: true
    },
    // PWA config
    pwa: {
        name: 'AnySync'
    }
}
