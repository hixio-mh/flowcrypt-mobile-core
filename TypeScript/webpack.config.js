
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  externals: [nodeExternals({
    // whitelist: ['openpgp']
  })],
  mode: 'none',
  entry: {
    'flowcrypt': './build/ts/node.js',
  },
  output: {
    path: __dirname + '/build/bundles',
    filename: '[name]-bundle.js',
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
