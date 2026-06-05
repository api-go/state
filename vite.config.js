import { defineConfig } from 'vite';
import { resolve } from 'path';
import terser from '@rollup/plugin-terser';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ApigoState', // UMD 内部名称，逻辑主要靠 globalThis 挂载
      formats: ['umd', 'es']
    },
    rollupOptions: {
      output: [
        {
          format: 'umd',
          name: 'ApigoState',
          entryFileNames: 'state.js'
        },
        {
          format: 'umd',
          name: 'ApigoState',
          entryFileNames: 'state.min.js',
          plugins: [terser()]
        },
        {
          format: 'es',
          entryFileNames: 'state.mjs'
        },
        {
          format: 'es',
          entryFileNames: 'state.min.mjs',
          plugins: [terser()]
        }
      ]
    },
    minify: false
  }
});
