// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    file: 'bundle.js',
    format: 'cjs'
  },
  plugins: [ resolve() ]
};
