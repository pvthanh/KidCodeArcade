import { defineConfig } from 'vite';

function offlineAppShell() {
  return {
    name: 'offline-app-shell',
    generateBundle(_, bundle) {
      const precacheFiles = [...new Set([
        ...Object.keys(bundle),
        'index.html',
        'manifest.webmanifest',
        'icons/app-icon.svg',
        'icons/app-icon-192.png',
        'icons/app-icon-512.png',
        'icons/apple-touch-icon.png'
      ])].filter(fileName =>
        fileName !== 'service-worker.js' && !fileName.endsWith('.map')
      );
      const source = `
const CACHE_NAME = 'little-level-lab-v1';
const PRECACHE_FILES = ${JSON.stringify(precacheFiles)};
const APP_SCOPE = self.registration.scope;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_FILES.map(file => new URL(file, APP_SCOPE))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('little-level-lab-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!url.href.startsWith(APP_SCOPE)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request, { ignoreVary: true }).then(cached => {
        if (cached) return cached;
        return fetch(request)
          .then(response => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
            }
            return response;
          })
          .catch(async () => (await caches.match(new URL('index.html', APP_SCOPE), { ignoreVary: true }))
            || Response.error());
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
`;
      this.emitFile({
        type: 'asset',
        fileName: 'service-worker.js',
        source
      });
    }
  };
}

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/KidCodeArcade/' : '/',
  plugins: [offlineAppShell()],
  build: {
    chunkSizeWarningLimit: 1700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/phaser/')) return 'phaser';
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
});
