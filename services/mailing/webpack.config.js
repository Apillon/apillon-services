const path = require('path');
const slsw = require('serverless-webpack');
const CopyPlugin = require('copy-webpack-plugin');

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
      snappy: false,
      'snappy/package.json': false,
      aws4: false,
      'mongodb-client-encryption': false,
      cardinal: false,
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
  plugins: [
    new CopyPlugin({
      patterns: [{ from: './src/mailing/templates/*.html' }],
    }),
  ],
  optimization: {
    usedExports: true,
  },
};
