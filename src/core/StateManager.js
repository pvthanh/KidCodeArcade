import playerSprite from '../assets/demo/Player.svg?inline';
import groundSprite from '../assets/demo/Ground.svg?inline';
import brickSprite from '../assets/demo/Brick.svg?inline';
import mysteryBoxSprite from '../assets/demo/MysteryBox.svg?inline';
import pipeSprite from '../assets/demo/Pipe.svg?inline';
import goombaSprite from '../assets/demo/Goomba.svg?inline';
import koopaSprite from '../assets/demo/Koopa.svg?inline';
import batSprite from '../assets/demo/Bat.svg?inline';
import coinSprite from '../assets/demo/Coin.svg?inline';
import flagSprite from '../assets/demo/Flag.svg?inline';
import mushroomSprite from '../assets/demo/Mushroom.svg?inline';
import starSprite from '../assets/demo/Star.svg?inline';
import extraLifeSprite from '../assets/demo/ExtraLife.svg?inline';
import playerIdle from '../assets/demo/Player-idle.svg?inline';
import playerWalk from '../assets/demo/Player-walk.svg?inline';
import playerRun from '../assets/demo/Player-run.svg?inline';
import playerJump from '../assets/demo/Player-jump.svg?inline';
import goombaIdle from '../assets/demo/Goomba-idle.svg?inline';
import goombaWalk from '../assets/demo/Goomba-walk.svg?inline';

const MIN_COLS = 8;
const MAX_COLS = 256;
const MIN_ROWS = 8;
const MAX_ROWS = 40;
const TILE_TYPES = [
  'Player', 'Ground', 'Brick', 'MysteryBox', 'Pipe', 'Spring', 'MovingPlatform',
  'OneWayPlatform', 'Switch', 'Door', 'Checkpoint', 'Goomba', 'Koopa', 'Bat', 'Coin', 'Flag',
  'Mushroom', 'Star', 'ExtraLife', 'FireFlower'
];
const POWER_UP_TYPES = ['Mushroom', 'Star', 'ExtraLife', 'FireFlower'];
const SOUND_EVENTS = [
  'jump', 'enemyStomp', 'playerHit', 'coin', 'powerUp', 'brickBreak', 'mysteryBox',
  'win', 'lose', 'spring', 'switch', 'checkpoint', 'fireball'
];
const DEMO_COLS = 96;
const DEMO_ROWS = 18;

const builtinAnimation = (dataUrl, fileName, frameRate) => ({
  dataUrl,
  fileName,
  fileType: 'image/svg+xml',
  imageWidth: 128,
  imageHeight: 32,
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 4,
  frameRate
});

const BUILTIN_SPRITES = {
  Player: { dataUrl: playerSprite },
  Ground: { dataUrl: groundSprite },
  Brick: { dataUrl: brickSprite },
  MysteryBox: { dataUrl: mysteryBoxSprite },
  Pipe: { dataUrl: pipeSprite },
  Goomba: { dataUrl: goombaSprite },
  Koopa: { dataUrl: koopaSprite },
  Bat: { dataUrl: batSprite },
  Coin: { dataUrl: coinSprite },
  Flag: { dataUrl: flagSprite },
  Mushroom: { dataUrl: mushroomSprite },
  Star: { dataUrl: starSprite },
  ExtraLife: { dataUrl: extraLifeSprite }
};

BUILTIN_SPRITES.Player.animations = {
  idle: builtinAnimation(playerIdle, 'Player-idle.svg', 4),
  walk: builtinAnimation(playerWalk, 'Player-walk.svg', 8),
  run: builtinAnimation(playerRun, 'Player-run.svg', 12),
  jump: builtinAnimation(playerJump, 'Player-jump.svg', 8)
};
BUILTIN_SPRITES.Goomba.animations = {
  idle: builtinAnimation(goombaIdle, 'Goomba-idle.svg', 4),
  walk: builtinAnimation(goombaWalk, 'Goomba-walk.svg', 7)
};

export class StateManager {
  constructor() {
    this.cols = 64;
    this.rows = 15;
    this.tileSize = 32;
    this.tiles = [];
    this.spriteMetadata = JSON.parse(JSON.stringify(BUILTIN_SPRITES));
    this.soundEffects = {};
    this.mysteryBoxReward = 'Mushroom';
    this.activeTileType = 'Ground';
    this.initGrid();
    this.loadDemo();
  }

  initGrid() {
    this.tiles = Array.from({ length: this.rows }, (_, row) =>
      Array.from({ length: this.cols }, () => (row === this.rows - 1 ? 'Ground' : null))
    );
  }

  loadDemo() {
    this.cols = DEMO_COLS;
    this.rows = DEMO_ROWS;
    this.initGrid();
    const put = (row, col, type) => { this.tiles[row][col] = type; };

    put(16, 2, 'Player');
    for (const col of [30, 31, 62, 63, 83, 84]) put(17, col, null);

    for (let col = 7; col <= 11; col++) put(12, col, col === 9 ? 'MysteryBox' : 'Brick');
    for (const col of [6, 8, 10, 12]) put(11, col, 'Coin');
    put(9, 14, 'Bat');
    put(16, 18, 'Goomba');
    put(16, 24, 'Koopa');
    put(15, 27, 'Pipe');
    put(16, 27, 'Pipe');

    for (let col = 35; col <= 39; col++) put(13, col, col === 37 ? 'MysteryBox' : 'Brick');
    for (let col = 42; col <= 46; col++) put(12, col, 'Ground');
    for (const col of [35, 37, 39, 43, 45, 47, 49]) put(col < 40 ? 12 : 10, col, 'Coin');
    put(9, 44, 'Bat');
    put(16, 53, 'Goomba');
    put(16, 57, 'Koopa');
    put(15, 59, 'Pipe');
    put(16, 59, 'Pipe');

    for (let col = 68; col <= 73; col++) put(12, col, col === 70 ? 'MysteryBox' : 'Brick');
    for (let col = 74; col <= 77; col++) put(10, col, 'Ground');
    for (const col of [67, 69, 71, 73, 75, 77, 79]) put(col < 74 ? 11 : 8, col, 'Coin');
    put(8, 76, 'Bat');
    put(16, 79, 'Koopa');

    put(15, 89, 'Brick');
    put(14, 90, 'Brick');
    put(13, 91, 'Brick');
    put(16, 87, 'Goomba');
    put(10, 88, 'Bat');
    for (const col of [88, 90, 92]) put(11, col, 'Coin');
    put(16, 93, 'Flag');
    this.activeTileType = 'Ground';
  }

  loadDemoTwo() {
    this.cols = 72;
    this.rows = 18;
    this.initGrid();
    const put = (row, col, type) => { this.tiles[row][col] = type; };

    put(16, 2, 'Player');
    for (const col of [19, 20, 42, 43, 61]) put(17, col, null);
    for (let col = 8; col <= 12; col++) put(12, col, col === 10 ? 'MysteryBox' : 'Brick');
    for (const col of [9, 11, 13]) put(11, col, 'Coin');
    put(16, 16, 'Koopa');
    put(16, 12, 'FireFlower');
    put(16, 21, 'Spring');
    put(14, 24, 'OneWayPlatform');
    put(16, 25, 'Checkpoint');
    put(16, 40, 'Switch');
    for (const row of [14, 15, 16]) put(row, 41, 'Door');
    put(10, 23, 'Bat');
    put(13, 26, 'Ground');
    put(12, 27, 'Ground');
    put(11, 28, 'Ground');
    put(16, 31, 'Goomba');

    for (let col = 35; col <= 39; col++) put(13, col, col === 37 ? 'MysteryBox' : 'Brick');
    for (const col of [34, 36, 38, 40]) put(12, col, 'Coin');
    put(16, 46, 'Koopa');
    put(9, 51, 'Bat');
    put(11, 45, 'MovingPlatform');
    for (let col = 51; col <= 55; col++) put(12, col, 'Ground');
    for (const col of [52, 54, 56]) put(11, col, 'Coin');
    put(16, 58, 'Goomba');

    for (const col of [64, 66, 68, 70]) put(13, col, 'Coin');
    put(16, 69, 'Flag');
    this.activeTileType = 'Ground';
  }

  resizeWorld(cols, rows) {
    if (!Number.isInteger(cols) || cols < MIN_COLS || cols > MAX_COLS ||
      !Number.isInteger(rows) || rows < MIN_ROWS || rows > MAX_ROWS) {
      throw new RangeError(`World size must be ${MIN_COLS}-${MAX_COLS} columns by ${MIN_ROWS}-${MAX_ROWS} rows.`);
    }

    const previousTiles = this.tiles;
    this.tiles = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => previousTiles[row]?.[col] ?? (row === rows - 1 ? 'Ground' : null))
    );
    this.cols = cols;
    this.rows = rows;
  }

  getTile(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.tiles[row][col];
  }

  setTile(row, col, type) {
    if (!Number.isInteger(row) || !Number.isInteger(col) ||
      row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    if (this.tiles[row][col] === type) return false;
    this.tiles[row][col] = type;
    return true;
  }

  getWorldSize() {
    return { width: this.cols * this.tileSize, height: this.rows * this.tileSize };
  }

  getTileFromPixel(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols ? { row, col } : null;
  }

  registerSprite(id, metadata) {
    if (![...TILE_TYPES, 'Eraser'].includes(id) || !metadata?.dataUrl) {
      throw new TypeError('A known tile type and image data are required to register a sprite.');
    }
    this.spriteMetadata[id] = { ...metadata, registeredAt: Date.now() };
  }

  registerAnimation(entityType, animationType, metadata) {
    const allowed = {
      Player: ['idle', 'walk', 'run', 'jump'],
      Goomba: ['idle', 'walk'],
      Koopa: ['idle', 'walk'],
      Bat: ['idle', 'walk']
    };
    if (!allowed[entityType]?.includes(animationType) || !metadata?.dataUrl ||
      !Number.isInteger(metadata.frameWidth) || !Number.isInteger(metadata.frameHeight) ||
      !Number.isInteger(metadata.frameCount) || metadata.frameCount < 1) {
      throw new TypeError('An entity, animation type, image, and valid frame metadata are required.');
    }
    const entityMetadata = this.spriteMetadata[entityType] || {};
    entityMetadata.animations = {
      ...(entityMetadata.animations || {}),
      [animationType]: { ...metadata, registeredAt: Date.now() }
    };
    this.spriteMetadata[entityType] = entityMetadata;
  }

  registerSoundEffect(event, metadata) {
    if (!SOUND_EVENTS.includes(event) || typeof metadata?.dataUrl !== 'string' ||
      !metadata.dataUrl.startsWith('data:audio/')) {
      throw new TypeError('A supported game event and audio file are required to register a sound.');
    }
    if (typeof metadata.volume !== 'number' || !Number.isFinite(metadata.volume) ||
      metadata.volume < 0 || metadata.volume > 1) {
      throw new RangeError('Sound volume must be between 0 and 1.');
    }
    if (typeof metadata.enabled !== 'boolean') {
      throw new TypeError('Sound enabled state must be a boolean.');
    }
    this.soundEffects[event] = { ...metadata };
  }

  removeSoundEffect(event) {
    if (!SOUND_EVENTS.includes(event)) return false;
    return delete this.soundEffects[event];
  }

  getTileTypes() {
    return [...TILE_TYPES];
  }

  getWorldSnapshot() {
    return {
      cols: this.cols,
      rows: this.rows,
      tiles: this.tiles.map(row => [...row]),
      activeTileType: this.activeTileType,
      spriteMetadata: JSON.parse(JSON.stringify(this.spriteMetadata)),
      soundEffects: JSON.parse(JSON.stringify(this.soundEffects)),
      mysteryBoxReward: this.mysteryBoxReward
    };
  }

  restoreWorld(snapshot) {
    this.validateWorld(snapshot);
    this.cols = snapshot.cols;
    this.rows = snapshot.rows;
    this.tiles = snapshot.tiles.map(row => [...row]);
    this.activeTileType = [...TILE_TYPES, 'Eraser'].includes(snapshot.activeTileType)
      ? snapshot.activeTileType
      : 'Ground';
    this.spriteMetadata = {
      ...JSON.parse(JSON.stringify(BUILTIN_SPRITES)),
      ...JSON.parse(JSON.stringify(snapshot.spriteMetadata || {}))
    };
    this.soundEffects = JSON.parse(JSON.stringify(snapshot.soundEffects || {}));
    this.mysteryBoxReward = POWER_UP_TYPES.includes(snapshot.mysteryBoxReward)
      ? snapshot.mysteryBoxReward
      : 'Mushroom';
  }

  validateWorld(data) {
    if (!data || !Number.isInteger(data.cols) || !Number.isInteger(data.rows) ||
      data.cols < MIN_COLS || data.cols > MAX_COLS || data.rows < MIN_ROWS || data.rows > MAX_ROWS ||
      !Array.isArray(data.tiles) || data.tiles.length !== data.rows ||
      data.tiles.some(row => !Array.isArray(row) || row.length !== data.cols)) {
      throw new TypeError('The level file has invalid dimensions or tile data.');
    }
    if (data.tiles.some(row => row.some(tile => tile !== null && !TILE_TYPES.includes(tile)))) {
      throw new TypeError('The level file contains an unknown tile type.');
    }
    if (data.mysteryBoxReward !== undefined && !POWER_UP_TYPES.includes(data.mysteryBoxReward)) {
      throw new TypeError('The level file contains an unsupported mystery-box reward.');
    }
    if (data.soundEffects !== undefined &&
      (!data.soundEffects || typeof data.soundEffects !== 'object' || Array.isArray(data.soundEffects))) {
      throw new TypeError('The level file contains invalid sound settings.');
    }
    for (const [event, sound] of Object.entries(data.soundEffects || {})) {
      if (!SOUND_EVENTS.includes(event) || typeof sound?.dataUrl !== 'string' ||
        !sound.dataUrl.startsWith('data:audio/') || typeof sound.volume !== 'number' ||
        !Number.isFinite(sound.volume) || sound.volume < 0 || sound.volume > 1 ||
        typeof sound.enabled !== 'boolean') {
        throw new TypeError(`The level file contains invalid sound settings for "${event}".`);
      }
    }
  }

  clearGrid() {
    this.tiles = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
  }

  isSolid(tileType) {
    return [
      'Ground', 'Brick', 'Pipe', 'MysteryBox', 'Spring', 'MovingPlatform', 'OneWayPlatform', 'Door'
    ].includes(tileType);
  }

  isEnemy(tileType) {
    return ['Goomba', 'Koopa', 'Bat'].includes(tileType);
  }

  isCollectible(tileType) {
    return tileType === 'Coin';
  }

  isMysteryBox(tileType) {
    return tileType === 'MysteryBox';
  }

  isGoal(tileType) {
    return tileType === 'Flag';
  }

  countTileType(type) {
    return this.tiles.reduce((count, row) => count + row.filter(tile => tile === type).length, 0);
  }

  getTilePositions(type) {
    const positions = [];
    this.tiles.forEach((row, r) => row.forEach((tile, c) => {
      if (tile === type) positions.push({ row: r, col: c });
    }));
    return positions;
  }

  serialize() {
    return JSON.stringify(this.getWorldSnapshot(), null, 2);
  }

  deserialize(serialized) {
    const data = JSON.parse(serialized);
    this.restoreWorld(data);
  }

  exportWorld() {
    return this.tiles.map(row => [...row]);
  }

  importWorld(grid) {
    if (!Array.isArray(grid) || !grid.length || grid.some(row => !Array.isArray(row))) return false;
    const cols = Math.max(...grid.map(row => row.length));
    if (cols < MIN_COLS || cols > MAX_COLS || grid.length < MIN_ROWS || grid.length > MAX_ROWS) return false;
    this.resizeWorld(cols, grid.length);
    this.tiles = grid.map((row, r) =>
      Array.from({ length: cols }, (_, c) => row[c] ?? (r === grid.length - 1 ? 'Ground' : null))
    );
    return true;
  }
}

export default new StateManager();
