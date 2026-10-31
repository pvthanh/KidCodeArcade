import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    chunkSizeWarningLimit: 1700
  },
  server: {
    port: 3000,
    open: true
  },
});
