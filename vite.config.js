import { defineConfig } from 'vite';
import { resolve } from 'path';
import terser from '@rollup/plugin-terser';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ApigoState', // UMD 内部名称，逻辑主要靠 globalThis 挂载
      formats: ['umd']
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
        }
      ]
    },
    minify: false
  }
});
