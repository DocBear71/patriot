const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

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
        new Dotenv(), // Add Dotenv plugin
        new HtmlWebpackPlugin({
            title: 'Webpack App',
            filename: 'index.html',
            template: './src/index.html',
            templateParameters: {
                GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '' // Pass env variable to template
            }
        }),
        new MiniCssExtractPlugin(),
        new CopyWebpackPlugin({
            patterns: [
                {from: './src/images', to: 'images'},
                {from: './src/css', to: 'css'},
                {from: './src/js', to: 'js',
                    transform: (content, path) => {
                        // Replace API key placeholder in JS files
                        if (path.endsWith('.js')) {
                            return content
                                .toString()
                                .replace(/YOUR_API_KEY_HERE/g, process.env.GOOGLE_MAPS_API_KEY || '');
                        }
                        return content;
                    }
                },
                {from: './src/*.html', to: '[name][ext]',
                    globOptions: {ignore: ['**/index.html']},
                    transform: (content) => {
                        // Replace API key placeholder in HTML files
                        return content
                            .toString()
                            .replace(/YOUR_API_KEY_HERE/g, process.env.GOOGLE_MAPS_API_KEY || '');
                    }
                }
            ]
        })
    ],
};