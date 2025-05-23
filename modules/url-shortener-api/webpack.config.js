const path = require('path');
const slsw = require('serverless-webpack');
// const nodeExternals = require('webpack-node-externals');

module.exports = {
  context: __dirname,
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  entry: slsw.lib.entries,
  devtool: slsw.lib.webpack.isLocal ? 'source-map' : false,
  resolve: {
    extensions: ['.mjs', '.json', '.ts', '.js'],
    symlinks: false,
    cacheWithContext: false,
    alias: {
      'bson-ext': false,
      kerberos: false,
      '@mongodb-js/zstd': false,
      snappy: false,
      'snappy/package.json': false,
      'mongodb-client-encryption': false,
      cardinal: false,
      '@nestjs/websockets/socket-module': false,
      'cache-manager': false,
      'class-validator': false,
      'class-transformer': false,
      '@nestjs/microservices/microservices-module': false,
      '@nestjs/microservices': false,
      '@aws-sdk/credential-providers': false,
      'gcp-metadata': false,
      socks: false,
      '@faker-js/faker': false,
      aws4: false,
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
  // externals: [
  //   { '@faker-js/faker': '@faker-js/faker' },
  //   nodeExternals({
  //     allowlist: ['@apillon/lib'],
  //   }),
  // ],
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
};
