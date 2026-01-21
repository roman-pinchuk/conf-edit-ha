import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: '../static',
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            'codemirror',
            '@codemirror/autocomplete',
            '@codemirror/commands',
            '@codemirror/lang-yaml',
            '@codemirror/lint',
            '@codemirror/search',
            '@codemirror/state',
            '@codemirror/theme-one-dark',
            '@codemirror/view'
          ],
          yaml: ['yaml'],
        },
      },
    },
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
