import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: '../static',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/codemirror') || id.includes('node_modules/@codemirror')) {
            return 'codemirror';
          }
          if (id.includes('node_modules/yaml')) {
            return 'yaml';
          }
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
