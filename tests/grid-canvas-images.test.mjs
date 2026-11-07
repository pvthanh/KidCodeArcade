import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let GridCanvas;
let characterArt;
let originalImage;
let images;

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  ({ GridCanvas } = await server.ssrLoadModule('/src/editor/GridCanvas.js'));
  ({ characterArt } = await server.ssrLoadModule('/src/assets/demo/CharacterArt.js'));
  originalImage = globalThis.Image;
  globalThis.Image = class {
    constructor() {
      this.complete = true;
      this.naturalWidth = 128;
      this.naturalHeight = 128;
      images.push(this);
    }
  };
});

after(async () => {
  globalThis.Image = originalImage;
  await server.close();
});

function createGrid() {
  images = [];
  const grid = Object.create(GridCanvas.prototype);
  grid.spriteImages = new Map();
  grid.variantImages = new Map();
  grid.refresh = () => {};
  grid.eventBus = { emit() {} };
  grid.stateManager = {
    tileVariantCatalog: {},
    spriteMetadata: {},
    customBosses: [],
    bossConfig: {},
    getTileVariant: () => 'classic',
    getCreepyType: () => null
  };
  return grid;
}

test('newer sprite requests win regardless of image load order', () => {
  const grid = createGrid();
  grid.loadSprite('Player', 'old');
  grid.loadSprite('Player', 'new');
  images[1].onload();
  images[0].onload();
  assert.equal(grid.loadSprite('Player', 'new'), images[1]);
});

test('variant cache refreshes when a level reuses an id for different artwork', () => {
  const grid = createGrid();
  const old = { id: 'custom', name: 'Custom', dataUrl: 'old' };
  const next = { ...old, dataUrl: 'new' };
  grid.loadSpriteVariant('Coin', old);
  images[0].onload();
  assert.equal(grid.loadSpriteVariant('Coin', next), null);
  images[1].onload();
  assert.equal(grid.loadSpriteVariant('Coin', next), images[1]);
});

test('draws the selected static player image with its own frame dimensions', () => {
  const grid = createGrid();
  grid.stateManager.spriteMetadata.Player = {
    dataUrl: 'player', frameWidth: 128, frameHeight: 128,
    animations: { idle: { dataUrl: 'sheet', frameWidth: 256, frameHeight: 256 } }
  };
  grid.loadSprite('Player', 'sheet');
  images[0].onload();
  grid.loadSprite('Player', 'player');
  images[1].onload();
  const calls = [];
  const context = { drawImage: (...args) => calls.push(args), fillRect() {}, fillText() {} };
  grid.drawTile(context, 'Player', 0, 0, 32);
  assert.deepEqual(calls.at(-1), [images[1], 0, 0, 128, 128, 0, 0, 32, 32]);
});

test('draws an animation-only sprite using the animation frame dimensions', () => {
  const grid = createGrid();
  grid.stateManager.spriteMetadata.Player = {
    animations: { idle: { dataUrl: 'sheet', frameWidth: 256, frameHeight: 256 } }
  };
  grid.loadSprite('Player', 'sheet');
  images[0].onload();
  const calls = [];
  const context = { drawImage: (...args) => calls.push(args), fillRect() {}, fillText() {} };
  grid.drawTile(context, 'Player', 0, 0, 32);
  assert.deepEqual(calls.at(-1), [images[0], 0, 0, 256, 256, 0, 0, 32, 32]);
});

test('previews an uploaded idle animation using its own frame dimensions', () => {
  const grid = createGrid();
  grid.stateManager.spriteMetadata.Player = {
    dataUrl: 'player', frameWidth: 128, frameHeight: 128,
    animations: { idle: { dataUrl: 'uploaded', source: 'upload', frameWidth: 48, frameHeight: 64 } }
  };
  grid.loadSprite('Player', 'uploaded');
  images[0].onload();
  const calls = [];
  const context = { drawImage: (...args) => calls.push(args) };
  grid.drawTile(context, 'Player', 0, 0, 32);
  assert.deepEqual(calls.at(-1), [images[0], 0, 0, 48, 64, 0, 0, 32, 32]);
});

test('draws the configured built-in boss and refreshes when its type changes', () => {
  const grid = createGrid();
  grid.stateManager.bossConfig.type = 'roboCrab';
  const calls = [];
  const context = {
    drawImage: (...args) => calls.push(args), fillRect() {}, fillText() {},
    beginPath() {}, ellipse() {}, fill() {}
  };
  grid.drawTile(context, 'Boss', 0, 0, 32);
  assert.equal(images[0].src, characterArt.bosses.roboCrab);
  images[0].onload();
  grid.drawTile(context, 'Boss', 0, 0, 32);
  assert.deepEqual(calls.at(-1), [images[0], 0, 0, 128, 128, 0, 0, 32, 32]);
  grid.stateManager.bossConfig.type = 'skyDragon';
  grid.drawTile(context, 'Boss', 0, 0, 32);
  assert.equal(images[1].src, characterArt.bosses.skyDragon);
});

test('draws the selected custom boss image', () => {
  const grid = createGrid();
  grid.stateManager.bossConfig.type = 'custom-test';
  grid.stateManager.customBosses = [{ id: 'custom-test', name: 'Test', dataUrl: 'custom' }];
  const context = {
    drawImage() {}, fillRect() {}, fillText() {},
    beginPath() {}, ellipse() {}, fill() {}
  };
  grid.drawTile(context, 'Boss', 0, 0, 32);
  assert.equal(images[0].src, 'custom');
});
