import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let StateManager;
let compactCommunityLevel;
let validateCommunityLevel;
let createCommunityPreview;
let renderCommunityPreview;
let worker;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom'
  });
  ({ StateManager } = await server.ssrLoadModule('/src/core/StateManager.js'));
  ({ compactCommunityLevel, validateCommunityLevel } = await server.ssrLoadModule('/src/core/CommunityLevel.js'));
  ({ createCommunityPreview } = await server.ssrLoadModule('/src/core/CommunityPreview.js'));
  ({ renderCommunityPreview } = await server.ssrLoadModule('/src/editor/CommunityPreview.js'));
  ({ default: worker } = await server.ssrLoadModule('/community-worker/worker.js'));
});

after(async () => { await server.close(); });

test('compact levels restore built-in art and omit custom assets without changing the original', () => {
  const state = new StateManager();
  const snapshot = state.getWorldSnapshot();
  snapshot.customCreeps = [{ tileId: 'Creepy-custom-fox' }];
  snapshot.tiles[1][1] = 'Creepy-custom-fox';
  snapshot.tileVariants[1][1] = 'classic';
  snapshot.customBosses = [{ id: 'custom-boss', dataUrl: 'data:image/png;base64,abc' }];
  snapshot.bossConfig.type = 'custom-boss';
  snapshot.backgroundMusic = { dataUrl: 'data:audio/mp3;base64,abc' };
  const { level, customAssets } = compactCommunityLevel(snapshot);
  assert.equal(customAssets, true);
  assert.equal(level.tiles[1][1], 'Goomba');
  assert.equal(level.bossConfig.type, 'slimeKing');
  assert.equal(snapshot.tiles[1][1], 'Creepy-custom-fox');
  assert.doesNotMatch(JSON.stringify(level), /data:/);
  const restored = new StateManager();
  restored.restoreWorld(level);
  assert.equal(restored.getTile(1, 1), 'Goomba');
  assert.ok(restored.spriteMetadata.Player.dataUrl);
});

test('community schema rejects custom data, invalid fields and invalid pipes', () => {
  const { level } = compactCommunityLevel(new StateManager().getWorldSnapshot());
  assert.doesNotThrow(() => validateCommunityLevel(level));
  assert.throws(() => validateCommunityLevel({ ...level, spriteMetadata: { Player: 'data:image/png' } }));
  assert.throws(() => validateCommunityLevel({ ...level, worldTheme: 'untrusted' }));
  assert.throws(() => validateCommunityLevel({ ...level, pipeLinks: [{ source: { row: 0, col: 0 }, destination: { row: 0, col: 1 } }] }));
  assert.throws(() => validateCommunityLevel({ ...level, bossConfig: { ...level.bossConfig, type: 'custom' } }));
});

test('built-in art needs no warning, but uploaded variants and sprites do', () => {
  const state = new StateManager();
  assert.equal(compactCommunityLevel(state.getWorldSnapshot()).customAssets, false);
  state.registerTileVariant('Ground', { id: 'my-art', name: 'My art', dataUrl: 'data:image/png;base64,abc' });
  state.setTile(1, 1, 'Ground');
  state.setTileVariant(1, 1, 'my-art');
  let compact = compactCommunityLevel(state.getWorldSnapshot());
  assert.equal(compact.customAssets, true);
  assert.equal(compact.level.tileVariants[1][1], 'classic');
  const spriteState = new StateManager();
  spriteState.registerSprite('Ground', { dataUrl: 'data:image/png;base64,abc' });
  compact = compactCommunityLevel(spriteState.getWorldSnapshot());
  assert.equal(compact.customAssets, true);
  assert.doesNotMatch(JSON.stringify(compact.level), /data:/);
});

test('previews retain the whole level layout without embedded assets', () => {
  const state = new StateManager();
  const level = compactCommunityLevel(state.getWorldSnapshot()).level;
  level.tiles[0][0] = 'Player';
  level.tiles[0][level.cols - 1] = 'Flag';
  level.tiles[level.rows - 1][0] = 'Creepy-Firefly';
  const preview = createCommunityPreview(level);
  assert.equal(preview.cols, level.cols);
  assert.equal(preview.rows, level.rows);
  assert.equal(preview.theme, level.worldTheme);
  assert.equal(preview.tiles[0][0], 'p');
  assert.equal(preview.tiles[0][level.cols - 1], 'f');
  assert.equal(preview.tiles[level.rows - 1][0], 'e');
  assert.ok(preview.tiles.every(row => row.length === level.cols));
  assert.doesNotMatch(JSON.stringify(preview), /data:/);
});

test('preview renderer fits wide and tall maps and rejects malformed data', () => {
  const fills = [];
  const context = { fillRect: (...args) => fills.push(args) };
  const oldDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({ setAttribute() {}, getContext: () => context })
  };
  try {
    const tiles = Array.from({ length: 8 }, () => '.'.repeat(256));
    tiles[7] = `${'.'.repeat(255)}f`;
    const canvas = renderCommunityPreview({ cols: 256, rows: 8, theme: 'storybook', tiles }, 'Wide');
    assert.equal(canvas.width, 512);
    assert.deepEqual(fills[1], [0, 82, 512, 16]);
    assert.deepEqual(fills[2], [510, 96, 2.1, 2.1]);
    fills.length = 0;
    renderCommunityPreview({ cols: 8, rows: 100, theme: 'space', tiles: Array(100).fill('........') }, 'Tall');
    assert.deepEqual(fills[1], [248.8, 0, 14.4, 180]);
    assert.throws(() => renderCommunityPreview({ cols: 8, rows: 8, theme: 'space', tiles: Array(8).fill('.......!') }, 'Bad'));
  } finally {
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});

test('worker validates input, rate limits and uses parameterized inserts', async () => {
  const stored = [];
  const env = {
    WRITE_LIMIT: { limit: async () => ({ success: true }) },
    READ_LIMIT: { limit: async () => ({ success: true }) },
    DB: { prepare: sql => ({ bind: (...values) => ({
      run: async () => stored.push({ sql, values }),
      all: async () => ({ results: [] }),
      first: async () => null
    }) }) }
  };
  const headers = { Origin: 'https://pvthanh.github.io', 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' };
  const level = compactCommunityLevel(new StateManager().getWorldSnapshot()).level;
  const post = body => worker.fetch(new Request('https://library.test/levels', {
    method: 'POST', headers, body: JSON.stringify(body)
  }), env);
  assert.equal((await post({ title: 'Castle', author: 'Builder', level })).status, 201);
  assert.match(stored[0].sql, /VALUES \(\?, \?, \?, \?, \?\)/);
  assert.equal(stored[0].values[1], 'Castle');
  assert.equal((await post({ title: 'Castle', author: 'Builder', level: { ...level, extra: 'data:image/png' } })).status, 400);
  assert.equal((await post({ title: 'x'.repeat(65), author: 'Builder', level })).status, 400);
  assert.equal((await post({ title: 'Castle', author: 'Builder', level, extra: 'x'.repeat(530000) })).status, 413);
  env.WRITE_LIMIT.limit = async () => ({ success: false });
  assert.equal((await post({ title: 'Castle', author: 'Builder', level })).status, 429);
  assert.equal((await worker.fetch(new Request('https://library.test/levels', {
    method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: '{}'
  }), env)).status, 403);
});

test('worker lists pages, reads individual levels and reports malformed input and database failures', async () => {
  const level = compactCommunityLevel(new StateManager().getWorldSnapshot()).level;
  const id = '12345678-1234-4123-8123-123456789abc';
  const rows = Array.from({ length: 21 }, (_, i) => ({
    id: `${String(i).padStart(8, '0')}-1234-4123-8123-123456789abc`,
    title: `Level ${i}`, author: 'Builder', created_at: 1000 - i, level: JSON.stringify(level)
  }));
  const bindings = [];
  const env = {
    WRITE_LIMIT: { limit: async () => ({ success: true }) },
    READ_LIMIT: { limit: async () => ({ success: true }) },
    DB: { prepare: sql => ({ bind: (...values) => {
      bindings.push({ sql, values });
      return {
        all: async () => ({ results: rows }),
        first: async () => ({ id, title: 'Castle', author: 'Builder', created_at: 1000, level: JSON.stringify(level) })
      };
    } }) }
  };
  const headers = { Origin: 'https://pvthanh.github.io', 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' };
  const get = path => worker.fetch(new Request(`https://library.test${path}`, { headers }), env);
  const page = await (await get('/levels')).json();
  assert.equal(page.levels.length, 20);
  assert.deepEqual(page.levels[0].preview, createCommunityPreview(level));
  assert.equal('level' in page.levels[0], false);
  assert.equal(page.next, `${rows[19].created_at}:${rows[19].id}`);
  await get(`/levels?before=${encodeURIComponent(page.next)}`);
  assert.deepEqual(bindings[1].values, [rows[19].created_at, rows[19].created_at, rows[19].id]);
  assert.equal((await (await get(`/levels/${id}`)).json()).level.version, 1);
  assert.equal((await get('/levels?before=bad')).status, 400);
  assert.equal((await worker.fetch(new Request('https://library.test/levels', {
    method: 'POST', headers, body: '{'
  }), env)).status, 400);
  env.DB.prepare = () => { throw new Error('D1 unavailable'); };
  const originalError = console.error;
  try {
    console.error = () => {};
    assert.equal((await get('/levels')).status, 503);
  } finally {
    console.error = originalError;
  }
});
