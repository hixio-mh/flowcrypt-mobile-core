// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'build/wip/node.js',
  output: {
    file: 'flowcrypt-android.js',
    format: 'iife'
  },
  plugins: [resolve({
    // pass custom options to the resolve plugin
    customResolveOptions: {
      moduleDirectory: 'node_modules'
    }
  })],
  // indicate which modules should be treated as external
  external: ['http']
};
