'use strict'

var path = require('path')
var webpack = require('webpack')
var isProduction = process.env.NODE_ENV === 'production'

var config = {
    devtool: isProduction ? null : 'eval',

    entry: [
        path.resolve(__dirname, 'src/controller.jsx')
    ],

    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'bundle.js',
        publicPath: '/public'
    },

    externals: {
        react: 'React'
    },

    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                loader: 'babel',
                query: {
                    cacheDirectory: true,
                    optional: [],
                    stage: 0
                }
            }
        ]
    },

    plugins: [
        new webpack.NoErrorsPlugin()
    ]
}

if (isProduction) {
    config.plugins.push(new webpack.optimize.DedupePlugin())
    config.plugins.push(new webpack.optimize.OccurenceOrderPlugin(true))
    config.plugins.push(new webpack.optimize.UglifyJsPlugin())
}

module.exports = config
