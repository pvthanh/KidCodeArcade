const COLORS = {
  Ground: 0x58a65c,
  Brick: 0xb9683f,
  MysteryBox: 0xe0aa28,
  Pipe: 0x308c62,
  Spring: 0xd86783,
  MovingPlatform: 0x4c86b8,
  OneWayPlatform: 0xb98b52,
  Switch: 0xe08b48,
  Door: 0x765b90,
  Checkpoint: 0x43a5a1,
  Goomba: 0xa94b38,
  Koopa: 0x4f9b59,
  Bat: 0x64558f,
  Coin: 0xf0c84b,
  Flag: 0x378bd0,
  Mushroom: 0xe47759,
  Star: 0xf1ad3e,
  ExtraLife: 0xe76568,
  FireFlower: 0xed7645
};

export class EntityFactory {
  constructor() {
    this.registry = new Map([
      ['Player', (scene, x, y, options = {}) =>
        scene.physics.add.sprite(x, y, options.textureKey || 'Player').setDisplaySize(32, 32)],
      ['Ground', (scene, x, y, options = {}) => this.createPlatform(scene, 'Ground', x, y, options)],
      ['Brick', (scene, x, y, options = {}) => this.createPlatform(scene, 'Brick', x, y, options)],
      ['MysteryBox', (scene, x, y, options = {}) => this.createPlatform(scene, 'MysteryBox', x, y, options)],
      ['Pipe', (scene, x, y, options = {}) => this.createPlatform(scene, 'Pipe', x, y, options)],
      ['Spring', (scene, x, y, options = {}) => this.createPlatform(scene, 'Spring', x, y, options)],
      ['OneWayPlatform', (scene, x, y, options = {}) => this.createPlatform(scene, 'OneWayPlatform', x, y, options)],
      ['MovingPlatform', (scene, x, y, options = {}) => this.createMovingPlatform(scene, x, y, options)],
      ['Switch', (scene, x, y, options = {}) => this.createStaticSprite(scene, 'Switch', x, y, options)],
      ['Door', (scene, x, y, options = {}) => this.createPlatform(scene, 'Door', x, y, options)],
      ['Checkpoint', (scene, x, y, options = {}) => this.createStaticSprite(scene, 'Checkpoint', x, y, options)],
      ['Goomba', (scene, x, y, options = {}) => this.createEnemy(scene, 'Goomba', x, y, options)],
      ['Koopa', (scene, x, y, options = {}) => this.createEnemy(scene, 'Koopa', x, y, options)],
      ['Bat', (scene, x, y, options = {}) => this.createEnemy(scene, 'Bat', x, y, options)],
      ['Boss', (scene, x, y, options = {}) => this.createBoss(scene, x, y, options)],
      ['Coin', (scene, x, y, options = {}) => this.createStaticSprite(scene, 'Coin', x, y, options)],
      ['Flag', (scene, x, y, options = {}) => this.createStaticSprite(scene, 'Flag', x, y, options)],
      ['Mushroom', (scene, x, y, options = {}) => scene.physics.add.sprite(x, y, options.textureKey || 'Mushroom').setDisplaySize(32, 32)],
      ['Star', (scene, x, y, options = {}) => scene.physics.add.sprite(x, y, options.textureKey || 'Star').setDisplaySize(32, 32)],
      ['ExtraLife', (scene, x, y, options = {}) => scene.physics.add.sprite(x, y, options.textureKey || 'ExtraLife').setDisplaySize(32, 32)],
      ['FireFlower', (scene, x, y, options = {}) => scene.physics.add.sprite(x, y, options.textureKey || 'FireFlower').setDisplaySize(32, 32)]
    ]);
  }

  create(scene, type, x, y, options = {}) {
    const createEntity = this.registry.get(type);
    if (!createEntity) throw new RangeError(`No entity factory is registered for "${type}".`);
    return createEntity(scene, x, y, options);
  }

  createStaticSprite(scene, type, x, y, options = {}) {
    const sprite = scene.physics.add.staticSprite(x, y, options.textureKey || type);
    sprite.setDisplaySize(32, 32);
    sprite.refreshBody();
    return sprite;
  }

  createPlatform(scene, type, x, y, options = {}) {
    const platform = scene.add.sprite(x, y, options.textureKey || type).setDisplaySize(32, 32);
    scene.physics.add.existing(platform, true);
    platform.setData('tileType', type);
    if (type === 'OneWayPlatform') {
      platform.body.checkCollision.down = false;
      platform.body.checkCollision.left = false;
      platform.body.checkCollision.right = false;
      platform.body.checkCollision.up = true;
    }
    return platform;
  }

  createMovingPlatform(scene, x, y, options = {}) {
    const platform = scene.physics.add.sprite(x, y, options.textureKey || 'MovingPlatform')
      .setDisplaySize(64, 16);
    platform.body.setSize(64, 16, true);
    platform.setData('tileType', 'MovingPlatform');
    platform.setData('minX', x - 64);
    platform.setData('maxX', x + 64);
    platform.setData('travelDirection', 1);
    platform.setData('travelSpeed', 56);
    return platform;
  }

  createEnemy(scene, type, x, y, options = {}) {
    return scene.physics.add.sprite(x, y, options.textureKey || type)
      .setDisplaySize(32, 32)
      .setCollideWorldBounds(true);
  }

  createBoss(scene, x, y, options = {}) {
    const type = options.bossConfig?.type || 'slimeKing';
    const texture = `Boss-${type}`;
    const boss = scene.physics.add.sprite(
      x,
      y,
      scene.textures.exists(texture) ? texture : 'Boss-slimeKing'
    ).setDisplaySize(options.bossConfig?.size || 48, options.bossConfig?.size || 48);
    boss.body.setSize(38, 34).setOffset(5, 12);
    return boss.setCollideWorldBounds(true);
  }

  createTextures(scene) {
    const styles = {
      Player: { color: 0x347bd1, shape: 'player' },
      Ground: { color: COLORS.Ground, shape: 'block' },
      Brick: { color: COLORS.Brick, shape: 'block' },
      MysteryBox: { color: COLORS.MysteryBox, shape: 'question' },
      Pipe: { color: COLORS.Pipe, shape: 'pipe' },
      Spring: { color: COLORS.Spring, shape: 'spring' },
      OneWayPlatform: { color: COLORS.OneWayPlatform, shape: 'oneWay' },
      Switch: { color: COLORS.Switch, shape: 'switch' },
      Door: { color: COLORS.Door, shape: 'door' },
      Checkpoint: { color: COLORS.Checkpoint, shape: 'checkpoint' },
      Goomba: { color: COLORS.Goomba, shape: 'enemy' },
      Koopa: { color: COLORS.Koopa, shape: 'turtle' },
      Bat: { color: COLORS.Bat, shape: 'bat' },
      Coin: { color: COLORS.Coin, shape: 'coin' },
      Flag: { color: COLORS.Flag, shape: 'flag' },
      Mushroom: { color: COLORS.Mushroom, shape: 'enemy' },
      Star: { color: COLORS.Star, shape: 'coin' },
      ExtraLife: { color: COLORS.ExtraLife, shape: 'heart' },
      FireFlower: { color: COLORS.FireFlower, shape: 'flower' },
      Fireball: { color: 0xf45d2f, shape: 'fireball' }
    };

    for (const [key, style] of Object.entries(styles)) {
      if (scene.textures.exists(key)) continue;
      const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(style.color, 1);
      if (style.shape === 'coin') {
        graphics.fillCircle(16, 16, 13);
        graphics.lineStyle(3, 0x986c12, 1);
        graphics.strokeCircle(16, 16, 13);
      } else if (style.shape === 'enemy') {
        graphics.fillRoundedRect(2, 8, 28, 22, 9);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(11, 17, 3);
        graphics.fillCircle(22, 17, 3);
      } else if (style.shape === 'turtle') {
        graphics.fillRoundedRect(4, 14, 24, 14, 7);
        graphics.fillStyle(0x74b65c, 1);
        graphics.fillCircle(16, 11, 7);
        graphics.fillRect(6, 25, 7, 5);
        graphics.fillRect(20, 25, 7, 5);
        graphics.fillStyle(0xd7e8a4, 1);
        graphics.lineStyle(2, 0x285b45, 1);
        graphics.strokeRoundedRect(5, 15, 22, 12, 6);
        graphics.lineBetween(16, 16, 16, 26);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(13, 10, 2);
        graphics.fillCircle(21, 10, 2);
        graphics.fillStyle(0x193848, 1);
        graphics.fillCircle(14, 10, 1);
        graphics.fillCircle(22, 10, 1);
      } else if (style.shape === 'bat') {
        graphics.fillTriangle(1, 8, 15, 15, 4, 27);
        graphics.fillTriangle(31, 8, 17, 15, 28, 27);
        graphics.fillRoundedRect(11, 10, 10, 17, 5);
        graphics.fillStyle(0xfff0bd, 1);
        graphics.fillCircle(13, 16, 2);
        graphics.fillCircle(19, 16, 2);
        graphics.fillStyle(0xe76568, 1);
        graphics.fillCircle(14, 16, 1);
        graphics.fillCircle(20, 16, 1);
      } else if (style.shape === 'flag') {
        graphics.fillRect(13, 2, 5, 28);
        graphics.fillTriangle(17, 3, 31, 8, 17, 14);
      } else if (style.shape === 'player') {
        graphics.fillRoundedRect(5, 3, 22, 28, 6);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(12, 13, 2);
        graphics.fillCircle(21, 13, 2);
      } else if (style.shape === 'heart') {
        graphics.fillCircle(10, 11, 7);
        graphics.fillCircle(22, 11, 7);
        graphics.fillTriangle(3, 14, 29, 14, 16, 29);
      } else if (style.shape === 'spring') {
        graphics.fillStyle(0x70495a, 1);
        graphics.fillRect(3, 23, 26, 6);
        graphics.lineStyle(3, style.color, 1);
        graphics.lineBetween(8, 22, 13, 16);
        graphics.lineBetween(13, 16, 19, 22);
        graphics.lineBetween(19, 22, 24, 16);
        graphics.fillStyle(0xf6c2cd, 1);
        graphics.fillRect(4, 26, 24, 3);
      } else if (style.shape === 'oneWay') {
        graphics.fillStyle(0x795631, 1);
        graphics.fillRect(1, 6, 30, 5);
        graphics.fillStyle(0xd1a96a, 1);
        graphics.fillRect(2, 3, 28, 4);
      } else if (style.shape === 'switch') {
        graphics.fillStyle(0x70495a, 1);
        graphics.fillRoundedRect(3, 20, 26, 9, 3);
        graphics.fillStyle(0xf6c776, 1);
        graphics.fillCircle(16, 17, 8);
        graphics.fillStyle(style.color, 1);
        graphics.fillCircle(16, 17, 5);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(14, 15, 2);
      } else if (style.shape === 'door') {
        graphics.fillStyle(style.color, 1);
        graphics.fillRoundedRect(3, 1, 26, 30, 6);
        graphics.fillStyle(0xc9b4d7, 1);
        graphics.fillRect(7, 8, 18, 19);
        graphics.fillStyle(0x765b90, 1);
        graphics.fillCircle(21, 18, 2);
      } else if (style.shape === 'checkpoint') {
        graphics.fillStyle(0x5c5044, 1);
        graphics.fillRect(7, 5, 4, 25);
        graphics.fillStyle(style.color, 1);
        graphics.fillTriangle(11, 6, 27, 11, 11, 16);
      } else if (style.shape === 'flower') {
        graphics.fillStyle(0x438a52, 1);
        graphics.fillRect(14, 17, 4, 12);
        graphics.fillStyle(0x56a65f, 1);
        graphics.fillRect(7, 21, 8, 4);
        graphics.fillRect(17, 24, 8, 4);
        graphics.fillStyle(style.color, 1);
        graphics.fillCircle(16, 12, 6);
        graphics.fillCircle(9, 15, 5);
        graphics.fillCircle(23, 15, 5);
        graphics.fillStyle(0xffe27a, 1);
        graphics.fillCircle(16, 14, 4);
      } else if (style.shape === 'fireball') {
        graphics.fillStyle(0xf45d2f, 1);
        graphics.fillCircle(16, 16, 12);
        graphics.fillStyle(0xffcc55, 1);
        graphics.fillCircle(16, 16, 7);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(12, 12, 3);
      } else {
        graphics.fillRoundedRect(1, 1, 30, 30, 3);
        graphics.lineStyle(2, 0xffffff, 0.6);
        graphics.strokeRect(2, 2, 28, 28);
        if (style.shape === 'question') {
          graphics.fillStyle(0xffffff, 1);
          graphics.fillCircle(16, 12, 3);
          graphics.fillRect(14, 14, 4, 7);
          graphics.fillCircle(16, 25, 2);
        }
        if (style.shape === 'pipe') {
          graphics.fillStyle(0x67bd82, 1);
          graphics.fillRect(6, 8, 20, 20);
        }
      }
      graphics.generateTexture(key, 32, 32);
      graphics.destroy();
    }
    if (!scene.textures.exists('MovingPlatform')) {
      const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0x325c7c, 1);
      graphics.fillRoundedRect(1, 3, 62, 12, 3);
      graphics.fillStyle(COLORS.MovingPlatform, 1);
      graphics.fillRect(3, 1, 58, 6);
      graphics.fillStyle(0xd5e9f7, 1);
      graphics.fillRect(8, 2, 48, 2);
      graphics.generateTexture('MovingPlatform', 64, 16);
      graphics.destroy();
    }

    const bossStyles = {
      slimeKing: { body: 0xb94f91, trim: 0xf6c776 },
      roboCrab: { body: 0x438ab1, trim: 0xf0a85e },
      skyDragon: { body: 0x5ca66b, trim: 0xf07f61 }
    };
    for (const [type, colors] of Object.entries(bossStyles)) {
      const key = `Boss-${type}`;
      if (scene.textures.exists(key)) continue;
      const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0x493a64, 1);
      if (type === 'roboCrab') {
        graphics.fillRect(7, 37, 8, 8);
        graphics.fillRect(33, 37, 8, 8);
        graphics.fillTriangle(8, 22, 0, 15, 7, 9);
        graphics.fillTriangle(40, 22, 48, 15, 41, 9);
        graphics.fillStyle(colors.body, 1);
        graphics.fillRoundedRect(5, 17, 38, 25, 9);
        graphics.fillStyle(colors.trim, 1);
        graphics.fillRoundedRect(12, 12, 24, 21, 8);
        graphics.lineStyle(2, 0x284d6a, 1);
        graphics.strokeRoundedRect(12, 12, 24, 21, 8);
      } else {
        graphics.fillTriangle(6, 18, 12, 3, 18, 20);
        graphics.fillTriangle(30, 20, 36, 3, 42, 18);
        graphics.fillStyle(colors.body, 1);
        graphics.fillRoundedRect(5, 16, 38, 28, 14);
        if (type === 'slimeKing') {
          graphics.fillStyle(colors.trim, 1);
          graphics.fillTriangle(9, 17, 12, 4, 18, 14);
          graphics.fillTriangle(17, 14, 24, 1, 31, 14);
          graphics.fillTriangle(29, 14, 36, 4, 39, 17);
          graphics.fillRect(10, 14, 28, 5);
        } else {
          graphics.fillStyle(colors.trim, 1);
          graphics.fillTriangle(8, 20, 0, 7, 17, 17);
          graphics.fillTriangle(40, 20, 48, 7, 31, 17);
          graphics.fillTriangle(20, 16, 24, 6, 28, 16);
        }
      }
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(16, 25, 4);
      graphics.fillCircle(32, 25, 4);
      graphics.fillStyle(0x243847, 1);
      graphics.fillCircle(17, 26, 2);
      graphics.fillCircle(33, 26, 2);
      graphics.fillStyle(0xffe6a1, 1);
      graphics.fillRect(20, 34, 8, 3);
      graphics.generateTexture(key, 48, 48);
      graphics.destroy();
    }

    if (!scene.textures.exists('BossProjectile')) {
      const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0x8c4dbe, 1);
      graphics.fillCircle(8, 8, 7);
      graphics.fillStyle(0xffd66b, 1);
      graphics.fillCircle(8, 8, 3);
      graphics.generateTexture('BossProjectile', 16, 16);
      graphics.destroy();
    }
  }
}
