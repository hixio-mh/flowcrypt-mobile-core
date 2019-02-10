
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  externals: [nodeExternals()],
  mode: 'none',
  entry: {
    'flowcrypt': './build/ts/flowcrypt-android-node/TypeScript/source/node.js',
    'asn1': './node_modules/asn1.js/lib/asn1.js',
    'bn': './node_modules/bn.js/lib/bn.js',
    'minimalistic-assert': './node_modules/minimalistic-assert/index.js',
  },
  output: {
    path: __dirname + '/build/bundles/raw',
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['env', { 'targets': { 'node': '8.6.0' } }]
          ]
        }
      }
    }]
  }
}
