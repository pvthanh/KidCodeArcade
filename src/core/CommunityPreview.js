const tileCodes = {
  Player: 'p', Ground: 'g', Sand: 's', Stone: 't', Steel: 't', Snow: 'n', Brick: 'b',
  MysteryBox: 'q', Pipe: 'i', Spring: 'l', MovingPlatform: 'l', OneWayPlatform: 'l',
  RotatingFirebar: 'h', FireGeyser: 'h', Lava: 'h', Switch: 'w', Door: 'w',
  Checkpoint: 'f', Goomba: 'e', Koopa: 'e', Bat: 'e', Coin: 'c', Flag: 'f',
  Boss: 'o', Mushroom: 'c', Star: 'c', ExtraLife: 'c', FireFlower: 'c',
  BoomFlower: 'c', TNTFlower: 'c'
};

export function createCommunityPreview(level) {
  return {
    cols: level.cols,
    rows: level.rows,
    theme: level.worldTheme,
    tiles: level.tiles.map(row => row.map(tile => {
      if (tile === null) return '.';
      if (tile.startsWith('Creepy-')) return 'e';
      const code = tileCodes[tile];
      if (!code) throw new TypeError(`Unsupported preview tile: ${tile}`);
      return code;
    }).join(''))
  };
}
