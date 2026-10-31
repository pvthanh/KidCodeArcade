import playerSprite from '../assets/demo/SunnyHero.svg?inline';
import groundSprite from '../assets/demo/MeadowGround.svg?inline';
import brickSprite from '../assets/demo/MeadowBrick.svg?inline';
import mysteryBoxSprite from '../assets/demo/SunnyMysteryBox.svg?inline';
import pipeSprite from '../assets/demo/Pipe.svg?inline';
import goombaSprite from '../assets/demo/BumbleBug.svg?inline';
import koopaSprite from '../assets/demo/FlowerSnail.svg?inline';
import batSprite from '../assets/demo/Bat.svg?inline';
import coinSprite from '../assets/demo/SunnyCoin.svg?inline';
import flagSprite from '../assets/demo/Flag.svg?inline';
import mushroomSprite from '../assets/demo/SunnyMushroom.svg?inline';
import starSprite from '../assets/demo/SunnyStar.svg?inline';
import extraLifeSprite from '../assets/demo/SunnyHeart.svg?inline';
import iceGroundSprite from '../assets/demo/Ground-Ice.svg?inline';
import mossBrickSprite from '../assets/demo/Brick-Moss.svg?inline';
import playerIdle from '../assets/demo/SunnyHero-idle.svg?inline';
import playerWalk from '../assets/demo/SunnyHero-walk.svg?inline';
import playerRun from '../assets/demo/SunnyHero-run.svg?inline';
import playerJump from '../assets/demo/SunnyHero-jump.svg?inline';
import goombaIdle from '../assets/demo/BumbleBug.svg?inline';
import goombaWalk from '../assets/demo/BumbleBug-walk.svg?inline';

const MIN_COLS = 8;
const MAX_COLS = 256;
const MIN_ROWS = 8;
const MAX_ROWS = 40;
const TILE_TYPES = [
  'Player', 'Ground', 'Brick', 'MysteryBox', 'Pipe', 'Spring', 'MovingPlatform',
  'OneWayPlatform', 'Switch', 'Door', 'Checkpoint', 'Goomba', 'Koopa', 'Bat', 'Coin', 'Flag',
  'Mushroom', 'Star', 'ExtraLife', 'FireFlower'
];
const TILE_VARIANT_TYPES = [
  'Ground', 'Brick', 'MysteryBox', 'Pipe', 'Spring', 'MovingPlatform', 'OneWayPlatform',
  'Switch', 'Door', 'Checkpoint', 'Coin', 'Flag', 'Mushroom', 'Star', 'ExtraLife', 'FireFlower'
];
const POWER_UP_TYPES = ['Mushroom', 'Star', 'ExtraLife', 'FireFlower'];
const SOUND_EVENTS = [
  'jump', 'enemyStomp', 'playerHit', 'coin', 'powerUp', 'brickBreak', 'mysteryBox',
  'win', 'lose', 'spring', 'switch', 'checkpoint', 'fireball'
];
const DEMO_COLS = 96;
const DEMO_ROWS = 18;

const builtinAnimation = (dataUrl, fileName, frameRate, imageWidth = 128, imageHeight = 32) => ({
  dataUrl,
  fileName,
  fileType: 'image/svg+xml',
  imageWidth,
  imageHeight,
  frameWidth: 32,
  frameHeight: 32,
  frameCount: imageWidth / 32,
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

const builtinVariant = (id, name, dataUrl, fileName = null) => ({
  id,
  name,
  dataUrl,
  fileName,
  fileType: dataUrl ? 'image/svg+xml' : null,
  imageWidth: 32,
  imageHeight: 32,
  frameWidth: 32,
  frameHeight: 32
});

const BUILTIN_TILE_VARIANTS = Object.fromEntries(TILE_VARIANT_TYPES.map(tileType => [
  tileType,
  [builtinVariant(
    'classic',
    tileType === 'Ground' ? 'Sunny meadow' : tileType === 'Brick' ? 'Pastel brick' : 'Classic',
    BUILTIN_SPRITES[tileType]?.dataUrl || null
  )]
]));
BUILTIN_TILE_VARIANTS.Ground.push(builtinVariant('ice', 'Ice', iceGroundSprite, 'Ground-Ice.svg'));
BUILTIN_TILE_VARIANTS.Brick.push(builtinVariant('moss', 'Mossy', mossBrickSprite, 'Brick-Moss.svg'));

const clone = value => JSON.parse(JSON.stringify(value));
const mergeVariantCatalog = catalog => {
  const merged = clone(BUILTIN_TILE_VARIANTS);
  for (const [tileType, variants] of Object.entries(catalog || {})) {
    if (!TILE_VARIANT_TYPES.includes(tileType) || !Array.isArray(variants)) continue;
    const byId = new Map(merged[tileType].map(variant => [variant.id, variant]));
    for (const variant of variants) {
      if (!byId.has(variant.id)) byId.set(variant.id, variant);
    }
    merged[tileType] = [...byId.values()];
  }
  return merged;
};
const MAX_VARIANTS_PER_TILE = 12;
const MAX_VARIANT_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VARIANT_IMAGES_BYTES = 20 * 1024 * 1024;

BUILTIN_SPRITES.Player.animations = {
  idle: builtinAnimation(playerIdle, 'Player-idle.svg', 4),
  walk: builtinAnimation(playerWalk, 'Player-walk.svg', 8),
  run: builtinAnimation(playerRun, 'Player-run.svg', 12),
  jump: builtinAnimation(playerJump, 'Player-jump.svg', 8)
};
BUILTIN_SPRITES.Goomba.animations = {
  idle: builtinAnimation(goombaIdle, 'BumbleBug.svg', 4, 32, 32),
  walk: builtinAnimation(goombaWalk, 'BumbleBug-walk.svg', 7)
};

export class StateManager {
  constructor() {
    this.cols = 64;
    this.rows = 15;
    this.tileSize = 32;
    this.tiles = [];
    this.tileVariants = [];
    this.tileVariantCatalog = clone(BUILTIN_TILE_VARIANTS);
    this.selectedTileVariants = Object.fromEntries(TILE_VARIANT_TYPES.map(type => [type, 'classic']));
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
    this.tileVariants = this.tiles.map(row => row.map(tile => tile ? 'classic' : null));
  }

  loadDemo() {
    this.cols = DEMO_COLS;
    this.rows = DEMO_ROWS;
    this.initGrid();
    const put = (row, col, type) => {
      this.tiles[row][col] = type;
      this.tileVariants[row][col] = type ? 'classic' : null;
    };

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
    const put = (row, col, type) => {
      this.tiles[row][col] = type;
      this.tileVariants[row][col] = type ? 'classic' : null;
    };

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
    const previousTileVariants = this.tileVariants;
    this.tiles = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => previousTiles[row]?.[col] ?? (row === rows - 1 ? 'Ground' : null))
    );
    this.tileVariants = this.tiles.map((tileRow, row) =>
      tileRow.map((tile, col) => tile
        ? previousTiles[row]?.[col]
          ? previousTileVariants[row]?.[col] || 'classic'
          : 'classic'
        : null)
    );
    this.cols = cols;
    this.rows = rows;
  }

  getTile(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.tiles[row][col];
  }

  setTile(row, col, type, variantId = 'classic') {
    if (!Number.isInteger(row) || !Number.isInteger(col) ||
      row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    const nextVariant = type ? variantId : null;
    if (type && TILE_VARIANT_TYPES.includes(type) &&
      !this.tileVariantCatalog[type]?.some(variant => variant.id === nextVariant)) {
      throw new RangeError(`Unknown ${type} visual variant "${nextVariant}".`);
    }
    if (this.tiles[row][col] === type && this.tileVariants[row][col] === nextVariant) return false;
    this.tiles[row][col] = type;
    this.tileVariants[row][col] = nextVariant;
    return true;
  }

  getTileVariant(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols || !this.tiles[row][col]) return null;
    return this.tileVariants[row]?.[col] || 'classic';
  }

  getSelectedTileVariant(tileType) {
    return this.selectedTileVariants[tileType] || 'classic';
  }

  selectTileVariant(tileType, variantId) {
    if (!TILE_VARIANT_TYPES.includes(tileType) ||
      !this.tileVariantCatalog[tileType]?.some(variant => variant.id === variantId)) return false;
    this.selectedTileVariants[tileType] = variantId;
    return true;
  }

  registerTileVariant(tileType, metadata) {
    if (!TILE_VARIANT_TYPES.includes(tileType)) throw new TypeError(`"${tileType}" does not support image variants.`);
    if (typeof metadata?.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(metadata.id)) {
      throw new TypeError('The tile appearance needs a valid identifier.');
    }
    if (typeof metadata.name !== 'string' || !metadata.name.trim()) {
      throw new TypeError('The tile appearance needs a name.');
    }
    if (typeof metadata.dataUrl !== 'string' || !metadata.dataUrl.startsWith('data:image/')) {
      throw new TypeError('The uploaded tile appearance does not contain valid image data.');
    }
    const variants = this.tileVariantCatalog[tileType];
    if (variants.some(variant => variant.id === metadata.id)) {
      throw new RangeError(`The ${tileType} variant "${metadata.name}" already exists.`);
    }
    if (variants.length >= MAX_VARIANTS_PER_TILE) {
      throw new RangeError(`A tile can have up to ${MAX_VARIANTS_PER_TILE} visual variants.`);
    }
    if (metadata.dataUrl.length > MAX_VARIANT_IMAGE_BYTES * 1.4) {
      throw new RangeError('Each uploaded tile image must be 5 MB or smaller.');
    }
    const currentBytes = Object.values(this.tileVariantCatalog)
      .flat()
      .reduce((total, variant) => total + (variant.dataUrl?.length || 0), 0);
    if (currentBytes + metadata.dataUrl.length > MAX_VARIANT_IMAGES_BYTES * 1.4) {
      throw new RangeError('Uploaded tile images may use up to 20 MB in total per level.');
    }
    variants.push({ ...metadata, name: metadata.name.trim().slice(0, 40), registeredAt: Date.now() });
    return true;
  }

  setTileVariant(row, col, variantId) {
    const tileType = this.getTile(row, col);
    if (!tileType || !TILE_VARIANT_TYPES.includes(tileType) ||
      !this.tileVariantCatalog[tileType]?.some(variant => variant.id === variantId)) return false;
    if (this.tileVariants[row][col] === variantId) return false;
    this.tileVariants[row][col] = variantId;
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
      tileVariants: this.tileVariants.map(row => [...row]),
      activeTileType: this.activeTileType,
      spriteMetadata: JSON.parse(JSON.stringify(this.spriteMetadata)),
      tileVariantCatalog: clone(this.tileVariantCatalog),
      selectedTileVariants: { ...this.selectedTileVariants },
      soundEffects: JSON.parse(JSON.stringify(this.soundEffects)),
      mysteryBoxReward: this.mysteryBoxReward
    };
  }

  restoreWorld(snapshot) {
    this.validateWorld(snapshot);
    this.cols = snapshot.cols;
    this.rows = snapshot.rows;
    this.tiles = snapshot.tiles.map(row => [...row]);
    this.tileVariantCatalog = mergeVariantCatalog(snapshot.tileVariantCatalog);
    this.tileVariants = this.tiles.map((row, rowIndex) => row.map((tile, colIndex) =>
      tile ? snapshot.tileVariants?.[rowIndex]?.[colIndex] || 'classic' : null));
    this.selectedTileVariants = Object.fromEntries(TILE_VARIANT_TYPES.map(type => {
      const selected = snapshot.selectedTileVariants?.[type];
      return [type, this.tileVariantCatalog[type].some(variant => variant.id === selected) ? selected : 'classic'];
    }));
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
    if (data.tileVariantCatalog !== undefined) {
      if (!data.tileVariantCatalog || typeof data.tileVariantCatalog !== 'object' ||
        Array.isArray(data.tileVariantCatalog)) {
        throw new TypeError('The level file contains invalid tile visual variants.');
      }
      let totalImageBytes = 0;
      for (const [tileType, variants] of Object.entries(data.tileVariantCatalog)) {
        if (!TILE_VARIANT_TYPES.includes(tileType) || !Array.isArray(variants) ||
          variants.length > MAX_VARIANTS_PER_TILE) {
          throw new TypeError(`The level file contains invalid visual variants for "${tileType}".`);
        }
        const ids = new Set();
        for (const variant of variants) {
          if (typeof variant?.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(variant.id) ||
            ids.has(variant.id) || typeof variant.name !== 'string' ||
            !variant.name.trim() || variant.name.length > 40 ||
            (variant.dataUrl !== null && variant.dataUrl !== undefined &&
              (typeof variant.dataUrl !== 'string' || !variant.dataUrl.startsWith('data:image/'))) ||
            (variant.id.startsWith('custom-') && !variant.dataUrl)) {
            throw new TypeError(`The level file contains an invalid ${tileType} visual variant.`);
          }
          ids.add(variant.id);
          const imageDataLength = variant.dataUrl?.length || 0;
          if (imageDataLength > MAX_VARIANT_IMAGE_BYTES * 1.4) {
            throw new RangeError(`A ${tileType} image exceeds the 5 MB limit.`);
          }
          totalImageBytes += imageDataLength;
          if (totalImageBytes > MAX_VARIANT_IMAGES_BYTES * 1.4) {
            throw new RangeError('The level file contains more than 20 MB of tile images.');
          }
        }
      }
    }
    const catalog = mergeVariantCatalog(data.tileVariantCatalog);
    if (data.tileVariants !== undefined &&
      (!Array.isArray(data.tileVariants) || data.tileVariants.length !== data.rows ||
        data.tileVariants.some(row => !Array.isArray(row) || row.length !== data.cols))) {
      throw new TypeError('The level file has invalid tile visual data.');
    }
    data.tiles.forEach((row, rowIndex) => row.forEach((tileType, colIndex) => {
      const variantId = data.tileVariants?.[rowIndex]?.[colIndex];
      if (!tileType && variantId != null) {
        throw new TypeError('Empty cells cannot have a tile visual variant.');
      }
      if (tileType && TILE_VARIANT_TYPES.includes(tileType) && variantId != null &&
        !catalog[tileType].some(variant => variant.id === variantId)) {
        throw new TypeError(`The level file references an unknown ${tileType} visual variant.`);
      }
    }));
    if (data.selectedTileVariants !== undefined) {
      if (!data.selectedTileVariants || typeof data.selectedTileVariants !== 'object' ||
        Array.isArray(data.selectedTileVariants) ||
        Object.entries(data.selectedTileVariants).some(([type, variantId]) =>
          !TILE_VARIANT_TYPES.includes(type) ||
          !catalog[type].some(variant => variant.id === variantId))) {
        throw new TypeError('The level file contains invalid selected tile variants.');
      }
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
    this.tileVariants = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
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
    this.tileVariants = this.tiles.map(row => row.map(tile => tile ? 'classic' : null));
    return true;
  }
}

export default new StateManager();
