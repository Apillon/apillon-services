/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
// const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  context: __dirname,
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  entry: slsw.lib.entries,
  // devtool: slsw.lib.webpack.isLocal ? 'cheap-module-eval-source-map' : 'source-map',
  devtool: 'source-map',
  resolve: {
    extensions: ['.mjs', '.json', '.ts', '.js'],
    symlinks: false,
    cacheWithContext: false,

    alias: {
      'bson-ext': false,
      'kerberos': false,
      // '@mongodb-js/zstd': false,
      'snappy': false,
      'snappy/package.json': false,
      'aws4': false,
      'mongodb-client-encryption': false,
      'cardinal': false,
      // '@nestjs/websockets/socket-module': false,
      // 'cache-manager': false,
      // 'class-validator': false,
      // 'class-transformer': false,
      // '@nestjs/microservices/microservices-module': false,
      // '@nestjs/microservices': false,
      //'@apillon/lib': path.join(__dirname, '..', '..', 'packages', 'lib', 'dist')
    },


  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
  target: 'node',
  node: {
    __dirname: true,
  },
  externals: [nodeExternals({
    allowlist: ['@apillon/lib']
  }
  )],
  // externals: [nodeExternals()],
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      {
        test: /\.(tsx?)$/,
        loader: 'ts-loader',
        exclude: [
          [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, '.serverless'),
            path.resolve(__dirname, '.webpack'),
          ],
        ],
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
      },
    ],
  },
  // plugins: [
  //   new CopyPlugin({
  //     patterns: [
  //       { from: './src/templates/mail/*.html' },
  //       { from: './src/templates/pdf/*.html' },
  //       { from: './src/locales/*.json' },
  //     ],
  //   }),
  // ],
};
