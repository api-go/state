import { defineConfig } from 'vite';
import { resolve } from 'path';
import terser from '@rollup/plugin-terser';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ApigoState',
      formats: ['umd']
    },
    rollupOptions: {
      output: [
        {
          format: 'umd',
          name: 'ApigoState',
          entryFileNames: 'state.js',
          extend: true
        },
        {
          format: 'umd',
          name: 'ApigoState',
          entryFileNames: 'state.min.js',
          plugins: [terser()],
          extend: true
        }
      ]
    },
    minify: false
  }
});
