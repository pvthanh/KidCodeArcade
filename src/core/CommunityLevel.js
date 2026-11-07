import { SOUND_EVENT_IDS, SOUND_PRESETS, MUSIC_PRESETS, validAudioSettings } from './AudioPresets.js';

const tiles = [
  'Player', 'Ground', 'Sand', 'Stone', 'Steel', 'Snow', 'Brick', 'MysteryBox', 'Pipe',
  'Spring', 'MovingPlatform', 'OneWayPlatform', 'RotatingFirebar', 'FireGeyser', 'Lava',
  'Switch', 'Door', 'Checkpoint', 'Goomba', 'Koopa', 'Bat', 'Creepy-Firefly',
  'Creepy-CloudPuff', 'Creepy-Jellyfish', 'Creepy-Ladybug', 'Creepy-Hedgehog',
  'Creepy-Duckling', 'Creepy-FoxKit', 'Creepy-Bumblebee', 'Creepy-Froglet',
  'Creepy-Starfish', 'Creepy-Ghost', 'Creepy-MiniDino', 'Coin', 'Flag', 'Boss',
  'Mushroom', 'Star', 'ExtraLife', 'FireFlower', 'BoomFlower', 'TNTFlower'
];
const creatures = tiles.filter(tile => tile.startsWith('Creepy-') || ['Goomba', 'Koopa', 'Bat'].includes(tile));
const themes = ['storybook', 'sunset', 'desert', 'ice', 'candy', 'forest', 'volcano', 'ocean', 'space', 'haunted'];
const heroes = ['storybookHero', 'dinoPirate', 'bubbleRobot', 'mushroomExplorer', 'cactusCowboy',
  'unicornCat', 'ninjaHamster', 'slothRacer', 'vikingPenguin', 'pizzaKnight', 'beeAstronaut'];
const bosses = ['slimeKing', 'roboCrab', 'skyDragon', 'candyGolem', 'moonBunny', 'coralKraken',
  'cloudYeti', 'clockworkOwl', 'volcanoTurtle', 'rainbowUnicorn'];
const rewards = ['Random', 'Mushroom', 'Star', 'ExtraLife', 'FireFlower', 'BoomFlower', 'TNTFlower'];
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const keysOnly = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));

export function compactCommunityLevel(snapshot) {
  const customTypes = new Set((snapshot.customCreeps || []).map(creepy => creepy.tileId));
  const tileGrid = snapshot.tiles.map(row => row.map(tile => customTypes.has(tile) ? 'Goomba' : tile));
  const variants = snapshot.tileVariants.map((row, r) => row.map((variant, c) => {
    if (!tileGrid[r][c]) return null;
    return (tileGrid[r][c] === 'Ground' && variant === 'ice') ||
      (tileGrid[r][c] === 'Brick' && variant === 'moss') ? variant : 'classic';
  }));
  const customAssets = customTypes.size > 0 || (snapshot.customBosses || []).length > 0 ||
    Object.values(snapshot.soundEffects || {}).some(sound => !sound.preset) ||
    Boolean(snapshot.backgroundMusic && !snapshot.backgroundMusic.preset) ||
    Object.entries(snapshot.tileVariantCatalog || {}).some(([type, list]) => list.some(v =>
      v.id !== 'classic' && !(type === 'Ground' && v.id === 'ice') &&
      !(type === 'Brick' && v.id === 'moss'))) ||
    Object.values(snapshot.spriteMetadata || {}).some(meta => meta.fileName || meta.registeredAt ||
      Object.values(meta.animations || {}).some(animation => animation.source === 'upload'));
  const bossConfig = { ...snapshot.bossConfig };
  if (!bosses.includes(bossConfig.type)) bossConfig.type = 'slimeKing';
  const creepyConfigs = Object.fromEntries(Object.entries(snapshot.creepyConfigs || {})
    .filter(([type]) => creatures.includes(type)));
  const soundEffects = Object.fromEntries(Object.entries(snapshot.soundEffects || {})
    .filter(([, sound]) => sound.preset)
    .map(([event, sound]) => [event, { preset: sound.preset, volume: sound.volume, enabled: sound.enabled }]));
  const music = snapshot.backgroundMusic;
  const backgroundMusic = music?.preset ?
    { preset: music.preset, volume: music.volume, enabled: music.enabled } : null;
  const level = {
    version: 1, cols: snapshot.cols, rows: snapshot.rows,
    tiles: tileGrid, tileVariants: variants, pipeLinks: snapshot.pipeLinks,
    worldTheme: snapshot.worldTheme, playerCharacterId: snapshot.playerCharacterId,
    bossConfig, creepyConfigs, mysteryBoxReward: snapshot.mysteryBoxReward,
    ...(Object.keys(soundEffects).length ? { soundEffects } : {}),
    ...(backgroundMusic ? { backgroundMusic } : {})
  };
  validateCommunityLevel(level);
  return { level, customAssets };
}

export function validateCommunityLevel(level) {
  if (!keysOnly(level, ['version', 'cols', 'rows', 'tiles', 'tileVariants', 'pipeLinks',
    'worldTheme', 'playerCharacterId', 'bossConfig', 'creepyConfigs', 'mysteryBoxReward',
    'soundEffects', 'backgroundMusic']) ||
    level.version !== 1 || !integer(level.cols, 8, 256) || !integer(level.rows, 8, 100) ||
    !themes.includes(level.worldTheme) || !heroes.includes(level.playerCharacterId) ||
    !rewards.includes(level.mysteryBoxReward)) throw new TypeError('Invalid level settings.');
  if (!Array.isArray(level.tiles) || level.tiles.length !== level.rows ||
    !Array.isArray(level.tileVariants) || level.tileVariants.length !== level.rows) {
    throw new TypeError('Invalid level grid.');
  }
  level.tiles.forEach((row, r) => {
    const variants = level.tileVariants[r];
    if (!Array.isArray(row) || row.length !== level.cols ||
      !Array.isArray(variants) || variants.length !== level.cols) throw new TypeError('Invalid level grid.');
    row.forEach((tile, c) => {
      const variant = variants[c];
      if ((tile !== null && !tiles.includes(tile)) ||
        (tile === null ? variant !== null : variant !== 'classic' &&
          !(tile === 'Ground' && variant === 'ice') && !(tile === 'Brick' && variant === 'moss'))) {
        throw new TypeError('Unsupported tile or appearance.');
      }
    });
  });
  if (!Array.isArray(level.pipeLinks) || level.pipeLinks.length > 128) throw new TypeError('Invalid pipe connections.');
  const endpoints = new Set();
  for (const link of level.pipeLinks) {
    if (!keysOnly(link, ['source', 'destination'])) throw new TypeError('Invalid pipe connection.');
    for (const point of [link.source, link.destination]) {
      if (!keysOnly(point, ['row', 'col']) || !integer(point.row, 0, level.rows - 1) ||
        !integer(point.col, 0, level.cols - 1) || level.tiles[point.row][point.col] !== 'Pipe') {
        throw new TypeError('Invalid pipe endpoint.');
      }
      const key = `${point.row}:${point.col}`;
      if (endpoints.has(key)) throw new TypeError('A pipe cannot be linked twice.');
      endpoints.add(key);
    }
  }
  const boss = level.bossConfig;
  if (!keysOnly(boss, ['type', 'movement', 'ability', 'health', 'speed', 'size']) ||
    !bosses.includes(boss.type) || !['patrol', 'chase', 'leap'].includes(boss.movement) ||
    !['fireballs', 'groundPound', 'both'].includes(boss.ability) ||
    !integer(boss.health, 3, 10) || !integer(boss.speed, 40, 120) || !integer(boss.size, 144, 256)) {
    throw new TypeError('Invalid boss settings.');
  }
  if (!object(level.creepyConfigs) || Object.entries(level.creepyConfigs).some(([type, config]) =>
    !creatures.includes(type) || !keysOnly(config, ['movement', 'speed', 'health', 'intelligence']) ||
    !['ground', 'flying'].includes(config.movement) || !integer(config.speed, 20, 180) ||
    !integer(config.health, 1, 5) || !['patrol', 'tracker', 'hunter'].includes(config.intelligence ?? 'patrol'))) {
    throw new TypeError('Invalid creature settings.');
  }
  const validPreset = (settings, presets) =>
    keysOnly(settings, ['preset', 'volume', 'enabled']) &&
    typeof settings.preset === 'string' && validAudioSettings(settings, presets);
  if (level.soundEffects !== undefined && (!object(level.soundEffects) ||
    Object.entries(level.soundEffects).some(([event, settings]) =>
      !SOUND_EVENT_IDS.includes(event) || !validPreset(settings, SOUND_PRESETS)))) {
    throw new TypeError('Invalid community sound settings.');
  }
  if (level.backgroundMusic != null && !validPreset(level.backgroundMusic, MUSIC_PRESETS)) {
    throw new TypeError('Invalid community music settings.');
  }
  return level;
}
