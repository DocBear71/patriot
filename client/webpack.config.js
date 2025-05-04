const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');

// Load dotenv to get environment variables from .env file
require('dotenv').config();

// Get API key from environment variable with fallback
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCHKhYZwQR37M_0QctXUQe6VFRFrlhaYj8';

console.log('Webpack using Google Maps API Key:', googleMapsApiKey.substring(0, 10) + '...');

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, '../public'),
        filename: 'bundle.js',
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, '../public'),
        },
        port: 3000,
        open: true,
        hot: true,
        compress: true,
        historyApiFallback: true,
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    plugins: [
        // Make environment variables available in the client-side code
        new webpack.DefinePlugin({
            'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsApiKey)
        }),

        // Load from .env file (for local development)
        new Dotenv({ systemvars: true }),

        // Configure HTML plugin for index.html
        new HtmlWebpackPlugin({
            title: 'Patriot Thanks',
            filename: 'index.html',
            template: './src/index.html',
            templateParameters: {
                GOOGLE_MAPS_API_KEY: googleMapsApiKey
            }
        }),

        new MiniCssExtractPlugin(),

        // Copy static assets
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: './src/js/runtime-config.js',
                    to: 'js/runtime-config.js',
                    force: true,
                    priority: 10
                },
                { from: './src/images', to: 'images' },
                { from: './src/css', to: 'css' },
                {
                    from: './src/js',
                    to: 'js',
                    globOptions: {
                        ignore: ['**/runtime-config.js'] // Ignore this file in the general copy
                    },
                    transform: (content, path) => {
                        if (path.endsWith('.js')) {
                            return content
                                .toString()
                                .replace(/YOUR_API_KEY_HERE/g, googleMapsApiKey);
                        }
                        return content;
                    }
                },
                {
                    from: './src/*.html',
                    to: '[name][ext]',
                    globOptions: { ignore: ['**/index.html'] },
                    transform: (content) => {
                        return content
                            .toString()
                            .replace(/YOUR_API_KEY_HERE/g, googleMapsApiKey);
                    }
                }
            ]
        })
    ],
};