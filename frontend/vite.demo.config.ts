import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: '../demo-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'demo-index.html')
    },
    minify: 'esbuild',
  },
  base: './'
});
