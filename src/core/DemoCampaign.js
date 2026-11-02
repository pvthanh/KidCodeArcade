import { BOSS_ABILITIES, BOSS_MOVEMENTS, BOSS_TYPES, CREEPY_TYPES, WORLD_THEMES } from './StateManager.js';

const COLS = 80;
const ROWS = 18;
const GOAL_COL = 77;

const LEVELS = [
  {
    name: 'Pebble Path',
    hint: 'Try a small jump over the gaps, collect coins, then use the Fire Flower to challenge the Slime King.',
    theme: 'storybook',
    creeps: [['Goomba', 16, 16], ['Creepy-Firefly', 10, 25]],
    gaps: [[20, 22], [40, 42]],
    platforms: [[13, 9, 12, 'Brick'], [12, 31, 33, 'Ground'], [11, 45, 47, 'OneWayPlatform']],
    appearances: [[13, 10, 'Brick', 'moss']],
    items: [[12, 10, 'MysteryBox'], [16, 28, 'Mushroom'], [16, 36, 'Star'], [16, 49, 'ExtraLife'], [16, 61, 'FireFlower']],
    props: [[15, 18, 'Pipe'], [16, 18, 'Pipe'], [16, 24, 'Spring'], [16, 53, 'Checkpoint']],
    coins: [[11, 9], [11, 11], [10, 32], [10, 33], [14, 43], [14, 45], [12, 59]],
    boss: { movement: 'patrol', ability: 'fireballs', health: 3, speed: 45, size: 144 },
    reward: 'Mushroom'
  },
  {
    name: 'Cave Switchback',
    hint: 'Find the switch before the tall door. The moving platform crosses the wide gap.',
    theme: 'haunted',
    creeps: [['Koopa', 16, 15], ['Bat', 9, 25]],
    gaps: [[20, 23], [43, 46]],
    platforms: [[14, 26, 28, 'OneWayPlatform'], [12, 33, 35, 'Stone'], [13, 39, 41, 'MovingPlatform'], [11, 49, 51, 'OneWayPlatform']],
    items: [[12, 10, 'MysteryBox'], [16, 34, 'FireFlower'], [16, 54, 'ExtraLife']],
    props: [[16, 29, 'Switch'], [14, 32, 'Door'], [15, 32, 'Door'], [16, 32, 'Door'], [16, 50, 'Checkpoint'], [16, 58, 'Spring']],
    coins: [[11, 9], [11, 11], [12, 27], [10, 35], [10, 40], [10, 50]],
    boss: { movement: 'chase', ability: 'groundPound', health: 3, speed: 48, size: 144 },
    reward: 'FireFlower'
  },
  {
    name: 'Golden Dune Dash',
    hint: 'Use the spring to clear the sand gaps. Stand on the pipe and press ↓/S to visit Meadow Machineworks; use its pipe to return.',
    theme: 'desert',
    creeps: [['Creepy-Ladybug', 16, 18], ['Creepy-CloudPuff', 9, 34]],
    gaps: [[18, 21], [35, 38], [52, 55]],
    platforms: [[12, 23, 25, 'Sand'], [10, 30, 32, 'OneWayPlatform'], [12, 42, 44, 'Sand'], [11, 47, 49, 'MovingPlatform']],
    items: [[12, 11, 'MysteryBox'], [16, 31, 'Mushroom'], [16, 47, 'Star'], [16, 61, 'FireFlower']],
    props: [[16, 16, 'Spring'], [16, 27, 'Checkpoint'], [16, 45, 'Spring'], [15, 58, 'Pipe'], [16, 58, 'Pipe']],
    coins: [[11, 10], [11, 12], [9, 30], [9, 31], [10, 43], [10, 48], [12, 56]],
    boss: { movement: 'leap', ability: 'fireballs', health: 3, speed: 50, size: 144 },
    reward: 'Random'
  },
  {
    name: 'Frosty Footbridges',
    hint: 'Snowy ledges are narrow. Time your jump onto the moving platform and use the checkpoint before the boss.',
    theme: 'ice',
    creeps: [['Creepy-Hedgehog', 16, 17], ['Creepy-Jellyfish', 9, 31]],
    gaps: [[19, 22], [39, 43], [54, 56]],
    platforms: [[13, 24, 26, 'Snow'], [11, 29, 31, 'OneWayPlatform'], [13, 34, 36, 'Stone'], [12, 40, 42, 'MovingPlatform'], [12, 46, 48, 'Snow']],
    appearances: [[17, 47, 'Ground', 'ice']],
    items: [[13, 10, 'MysteryBox'], [16, 33, 'FireFlower'], [16, 50, 'ExtraLife']],
    props: [[16, 16, 'Spring'], [16, 49, 'Checkpoint'], [16, 59, 'Spring']],
    coins: [[12, 10], [12, 12], [10, 29], [10, 30], [11, 41], [11, 47], [12, 57]],
    boss: { movement: 'patrol', ability: 'both', health: 3, speed: 52, size: 144 },
    reward: 'Star'
  },
  {
    name: 'Meadow Machineworks',
    hint: 'Press both switches to open the doors. The upper one-way ledge hides a shortcut and extra coins.',
    theme: 'forest',
    creeps: [['Creepy-Duckling', 16, 14], ['Creepy-Bumblebee', 9, 39]],
    gaps: [[23, 25], [47, 50]],
    platforms: [[13, 9, 12, 'Brick'], [12, 30, 32, 'OneWayPlatform'], [10, 36, 38, 'MovingPlatform'], [12, 41, 43, 'Ground']],
    items: [[12, 10, 'MysteryBox'], [16, 34, 'FireFlower'], [16, 56, 'Mushroom']],
    props: [[16, 18, 'Switch'], [14, 21, 'Door'], [15, 21, 'Door'], [16, 21, 'Door'], [16, 27, 'Checkpoint'], [16, 45, 'Switch'], [14, 52, 'Door'], [15, 52, 'Door'], [16, 52, 'Door'], [15, 59, 'Pipe'], [16, 59, 'Pipe']],
    coins: [[11, 9], [11, 11], [11, 31], [9, 37], [11, 42], [12, 57]],
    boss: { movement: 'chase', ability: 'both', health: 3, speed: 54, size: 144 },
    reward: 'ExtraLife'
  },
  {
    name: 'Moonlit Skyway',
    hint: 'Watch the flying creatures. Hop between the high ledges, collect the Star, and cross the moving bridge.',
    theme: 'space',
    creeps: [['Creepy-FoxKit', 16, 18], ['Creepy-Froglet', 16, 38]],
    gaps: [[16, 19], [31, 34], [46, 50], [59, 61]],
    platforms: [[12, 21, 23, 'OneWayPlatform'], [10, 27, 29, 'MovingPlatform'], [12, 36, 38, 'OneWayPlatform'], [10, 42, 44, 'MovingPlatform'], [12, 52, 54, 'OneWayPlatform']],
    items: [[12, 10, 'MysteryBox'], [16, 25, 'Star'], [16, 40, 'FireFlower'], [16, 56, 'ExtraLife']],
    props: [[16, 14, 'Spring'], [16, 55, 'Checkpoint'], [16, 64, 'Spring']],
    coins: [[11, 10], [11, 12], [11, 22], [9, 28], [11, 37], [9, 43], [11, 53], [12, 62]],
    boss: { movement: 'leap', ability: 'groundPound', health: 3, speed: 56, size: 144 },
    reward: 'Star'
  },
  {
    name: 'Emerald Forest Maze',
    hint: 'Touch the switch to open the door. Use the checkpoint, then time your jumps across the stone ledges and moving bridge.',
    theme: 'candy',
    creeps: [['Creepy-Starfish', 16, 19], ['Creepy-Ghost', 9, 35]],
    gaps: [[21, 24], [40, 43], [54, 57]],
    platforms: [[13, 10, 13, 'Brick'], [11, 28, 31, 'OneWayPlatform'], [12, 34, 36, 'Stone'], [11, 44, 46, 'MovingPlatform'], [12, 49, 51, 'OneWayPlatform']],
    items: [[12, 11, 'MysteryBox'], [16, 32, 'Mushroom'], [16, 48, 'FireFlower']],
    props: [[16, 17, 'Checkpoint'], [16, 26, 'Switch'], [14, 38, 'Door'], [15, 38, 'Door'], [16, 38, 'Door'], [16, 46, 'Spring'], [16, 61, 'ExtraLife']],
    coins: [[11, 10], [11, 12], [10, 29], [11, 35], [10, 45], [11, 50], [12, 60]],
    boss: { movement: 'patrol', ability: 'both', health: 4, speed: 58, size: 144 },
    reward: 'FireFlower'
  },
  {
    name: 'Candy Cloud Climb',
    hint: 'Climb the one-way platforms, wait for the moving bridge, and save a Fire Flower for the boss.',
    theme: 'candy',
    creeps: [['Creepy-MiniDino', 16, 18]],
    gaps: [[20, 23], [34, 38], [48, 52], [62, 64]],
    platforms: [[13, 24, 26, 'OneWayPlatform'], [11, 29, 31, 'MovingPlatform'], [13, 39, 41, 'OneWayPlatform'], [11, 44, 46, 'MovingPlatform'], [13, 53, 55, 'OneWayPlatform']],
    items: [[12, 10, 'MysteryBox'], [16, 42, 'Star'], [16, 57, 'FireFlower'], [16, 66, 'ExtraLife']],
    props: [[16, 17, 'Spring'], [16, 56, 'Checkpoint'], [16, 68, 'Spring']],
    coins: [[11, 10], [11, 12], [12, 25], [10, 30], [12, 40], [10, 45], [12, 54], [12, 65]],
    boss: { movement: 'chase', ability: 'fireballs', health: 4, speed: 60, size: 144 },
    reward: 'Random'
  },
  {
    name: 'Volcano Stone Run',
    hint: 'Use short, careful jumps across the stone gaps. The checkpoint marks your last safe spot before the boss.',
    theme: 'volcano',
    creeps: [['Creepy-Hedgehog', 16, 16], ['Creepy-Bumblebee', 9, 27], ['Koopa', 16, 44]],
    gaps: [[18, 21], [33, 36], [50, 53], [62, 64]],
    platforms: [[12, 23, 25, 'Stone'], [10, 28, 30, 'OneWayPlatform'], [12, 37, 39, 'Stone'], [11, 46, 48, 'MovingPlatform'], [12, 54, 56, 'Stone']],
    items: [[12, 10, 'MysteryBox'], [16, 31, 'FireFlower'], [16, 57, 'Star'], [16, 66, 'ExtraLife']],
    props: [[16, 17, 'Spring'], [16, 41, 'Checkpoint'], [16, 60, 'Spring']],
    coins: [[11, 10], [11, 12], [11, 24], [9, 29], [11, 38], [10, 47], [11, 55], [12, 65]],
    boss: { movement: 'leap', ability: 'both', health: 4, speed: 62, size: 144 },
    reward: 'FireFlower'
  },
  {
    name: 'Rainbow Crown Finale',
    hint: 'Final challenge! Collect the extra life, keep your Fire Flower, defeat the Rainbow Unicorn, and reach the flag.',
    theme: 'ocean',
    creeps: [['Creepy-Firefly', 9, 20], ['Creepy-CloudPuff', 10, 33], ['Creepy-Jellyfish', 9, 46]],
    gaps: [[18, 20], [32, 35], [48, 51], [61, 63]],
    platforms: [[13, 22, 24, 'OneWayPlatform'], [11, 27, 29, 'MovingPlatform'], [13, 36, 38, 'Snow'], [11, 42, 44, 'MovingPlatform'], [13, 52, 54, 'Stone']],
    items: [[12, 10, 'MysteryBox'], [16, 30, 'ExtraLife'], [16, 45, 'FireFlower'], [16, 57, 'Star'], [16, 66, 'Mushroom']],
    props: [[16, 16, 'Spring'], [16, 40, 'Checkpoint'], [16, 55, 'Spring'], [15, 60, 'Pipe'], [16, 60, 'Pipe']],
    coins: [[11, 10], [11, 12], [12, 23], [10, 28], [12, 37], [10, 43], [12, 53], [12, 64]],
    boss: { movement: 'leap', ability: 'both', health: 4, speed: 65, size: 144 },
    reward: 'Random'
  }
];

function createLevelSnapshot(baseSnapshot, recipe, levelIndex) {
  const tiles = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, () => row === ROWS - 1 ? 'Ground' : null));
  const tileVariants = tiles.map(row => row.map(tile => tile ? 'classic' : null));
  const put = (row, col, tileType, variant = 'classic') => {
    if (!tiles[row] || col < 0 || col >= COLS) {
      throw new RangeError(`Invalid placement in "${recipe.name}" at row ${row}, column ${col}.`);
    }
    tiles[row][col] = tileType;
    tileVariants[row][col] = tileType ? variant : null;
  };

  for (const [start, end] of recipe.gaps) {
    for (let col = start; col <= end; col += 1) put(ROWS - 1, col, null);
  }
  for (const [row, start, end, type] of recipe.platforms) {
    if (type === 'MovingPlatform') {
      put(row, Math.floor((start + end) / 2), type);
      continue;
    }
    for (let col = start; col <= end; col += 1) put(row, col, type);
  }
  for (const [row, col, type, variant] of recipe.appearances || []) {
    put(row, col, type, variant);
  }
  for (const [row, col, type] of recipe.props) put(row, col, type);
  for (const [row, col, type] of recipe.items) put(row, col, type);
  for (const [row, col] of recipe.coins) put(row, col, 'Coin');
  for (const [type, row, col] of recipe.creeps) put(row, col, type);
  put(16, 2, 'Player');
  put(16, 69, 'Boss');
  put(16, GOAL_COL, 'Flag');

  const bossType = BOSS_TYPES[levelIndex];
  const bossMovement = BOSS_MOVEMENTS.includes(recipe.boss.movement)
    ? recipe.boss.movement
    : 'patrol';
  const bossAbility = BOSS_ABILITIES.includes(recipe.boss.ability)
    ? recipe.boss.ability
    : 'fireballs';

  return {
    ...baseSnapshot,
    cols: COLS,
    rows: ROWS,
    tiles,
    tileVariants,
    worldTheme: WORLD_THEMES.some(theme => theme.id === recipe.theme) ? recipe.theme : 'storybook',
    activeTileType: 'Ground',
    bossConfig: {
      ...baseSnapshot.bossConfig,
      type: bossType.id,
      movement: bossMovement,
      ability: bossAbility,
      health: recipe.boss.health,
      speed: recipe.boss.speed,
      size: recipe.boss.size
    },
    mysteryBoxReward: recipe.reward
  };
}

export function createShowcaseCampaign(baseSnapshot) {
  const campaign = LEVELS.map((recipe, index) => ({
    name: recipe.name,
    hint: recipe.hint,
    snapshot: createLevelSnapshot(baseSnapshot, recipe, index)
  }));
  const duneIndex = 2;
  const meadowIndex = 4;
  campaign[duneIndex].snapshot.pipeDestination = meadowIndex;
  campaign[duneIndex].snapshot.pipeArrival = { row: 16, col: 56 };
  campaign[meadowIndex].snapshot.pipeDestination = duneIndex;
  campaign[meadowIndex].snapshot.pipeArrival = { row: 16, col: 57 };
  campaign[meadowIndex].hint =
    'Press both switches to open the doors. The pipe leads back to Golden Dune Dash; jump on it and press ↓/S.';
  return campaign;
}

export const SHOWCASE_CREEPY_TYPES = CREEPY_TYPES.map(({ id }) => id);
