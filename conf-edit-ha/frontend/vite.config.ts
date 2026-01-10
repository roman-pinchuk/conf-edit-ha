import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: '../static',
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8099',
        changeOrigin: true,
      },
    },
  },
});
