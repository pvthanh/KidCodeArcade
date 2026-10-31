import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/KidCodeArcade/' : '/',
  plugins: [],
  build: {
    chunkSizeWarningLimit: 1700
  },
  server: {
    port: 3000,
    open: true
  },
});
