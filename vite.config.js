import { defineConfig } from 'vite';
import { resolve } from 'path';
import terser from '@rollup/plugin-terser';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'State',
      formats: ['es']
    },
    rollupOptions: {
      output: [
        {
          format: 'es',
          entryFileNames: 'state.js',
          minifyInternalExports: false
        },
        {
          format: 'es',
          entryFileNames: 'state.min.js',
          plugins: [terser()]
        }
      ]
    },
    minify: false
  }
});
