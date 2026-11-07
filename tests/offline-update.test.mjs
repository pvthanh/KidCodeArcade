import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import vm from 'node:vm';
import { createServer } from 'vite';

let server;
let plugin;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom'
  });
  const config = await server.ssrLoadModule('/vite.config.js');
  plugin = config.default.plugins[0];
});

after(async () => { await server.close(); });

function buildWorker(script) {
  let emitted;
  plugin.generateBundle.call({ emitFile: file => { emitted = file; } }, {}, {
    'index.html': { source: `<script src="${script}"></script>` },
    [script]: { code: 'code' }
  });
  return emitted.source;
}

test('new builds use separate caches and navigation falls back offline', async () => {
  const oldSource = buildWorker('old.js');
  const source = buildWorker('new.js');
  const cacheName = text => text.match(/const CACHE_NAME = '([^']+)'/)[1];
  assert.notEqual(cacheName(oldSource), cacheName(source));
  const handlers = {};
  let online = true;
  const deleted = [];
  const cachedIndex = { body: 'offline index' };
  const caches = {
    keys: async () => [cacheName(oldSource), cacheName(source), 'another-app'],
    delete: async key => deleted.push(key),
    match: async request => String(request).endsWith('index.html') ? cachedIndex : undefined
  };
  const self = {
    registration: { scope: 'https://example.test/game/' },
    location: { origin: 'https://example.test' },
    clients: { claim: async () => {} },
    addEventListener: (name, handler) => { handlers[name] = handler; }
  };
  vm.runInNewContext(source, {
    self, caches, URL, Response,
    fetch: async () => {
      if (!online) throw new Error('offline');
      return { body: 'fresh index' };
    }
  });
  let activation;
  handlers.activate({ waitUntil: promise => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, [cacheName(oldSource)]);
  const navigate = async () => {
    let response;
    handlers.fetch({
      request: { method: 'GET', mode: 'navigate', url: 'https://example.test/game/?community=abc' },
      respondWith: promise => { response = promise; }
    });
    return response;
  };
  assert.equal((await navigate()).body, 'fresh index');
  online = false;
  assert.equal((await navigate()).body, 'offline index');
});
