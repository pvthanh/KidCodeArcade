import { Input, Scene, Scenes } from 'phaser';
import { characterArt } from '../assets/demo/CharacterArt.js';
import {
  CREEPY_TYPES,
  MIN_BOSS_SIZE,
  POWER_UP_TYPES,
  THEMED_TILE_TYPES,
  WORLD_THEMES
} from '../core/StateManager.js';
import { CHARACTER_COLLISION_SIZE, CHARACTER_DISPLAY_SIZE } from './EntityFactory.js';
import { SoundManager } from './SoundManager.js';

const PLAYER_TILE_ALIGNMENT_OFFSET = (CHARACTER_DISPLAY_SIZE - 32) / 2;
const PLAYER_ART_FOOT_INSET = 4;

export class GameScene extends Scene {
  constructor(
    worldSnapshot,
    entityFactory,
    spriteAnimator,
    touchState,
    eventBus,
    levelRecordId = 'level',
    campaignProgress = {},
    isCampaignFinal = false
  ) {
    super({ key: 'GameScene' });
    this.worldSnapshot = worldSnapshot;
    this.worldTheme = WORLD_THEMES.find(theme => theme.id === worldSnapshot.worldTheme) || WORLD_THEMES[0];
    this.entityFactory = entityFactory;
    this.spriteAnimator = spriteAnimator;
    this.touchState = touchState;
    this.eventBus = eventBus;
    this.isCampaignFinal = isCampaignFinal;
    this.levelRecordKey = `little-level-lab:best:${encodeURIComponent(levelRecordId)}`;
    this.bestScore = this.loadBestScore();
    this.score = Number.isSafeInteger(campaignProgress.score) && campaignProgress.score >= 0
      ? campaignProgress.score
      : 0;
    this.lives = Number.isSafeInteger(campaignProgress.lives) && campaignProgress.lives >= 0
      ? campaignProgress.lives
      : 3;
    this.mushroomGrowth = Number.isSafeInteger(campaignProgress.mushroomGrowth) &&
      campaignProgress.mushroomGrowth >= 0
      ? campaignProgress.mushroomGrowth
      : 0;
    this.hasFire = campaignProgress.hasFire === true;
    this.starPowerRemainingMs = Number.isFinite(campaignProgress.starPowerRemainingMs)
      ? Math.max(0, campaignProgress.starPowerRemainingMs)
      : 0;
    this.starPowerUntil = 0;
    this.fireCooldownUntil = 0;
    this.checkpointPoint = null;
    this.isRespawning = false;
    this.powerLabel = 'Normal';
    this.gameEnded = false;
    this.invulnerableUntil = 0;
    this.jumpBufferUntil = 0;
    this.coyoteUntil = 0;
    this.touchJumpWasDown = false;
    this.touchShootWasDown = false;
    this.touchPipeWasDown = false;
    this.jumpWasHeld = false;
    this.wallJumpDirection = 0;
    this.wallJumpUntil = 0;
    this.soundManager = new SoundManager(
      eventBus,
      worldSnapshot.soundEffects || {},
      worldSnapshot.backgroundMusic || null
    );
  }

  preload() {
    for (const [bossId, dataUrl] of Object.entries(characterArt.bosses)) {
      this.load.image(`Boss-${bossId}`, dataUrl);
    }

    for (const [entityType, metadata] of Object.entries(this.worldSnapshot.spriteMetadata || {})) {
      if (!metadata.dataUrl) continue;
      if (metadata.imageWidth && metadata.imageHeight) {
        this.load.spritesheet(entityType, metadata.dataUrl, {
          frameWidth: metadata.frameWidth || metadata.imageWidth,
          frameHeight: metadata.frameHeight || metadata.imageHeight
        });
      } else {
        this.load.image(entityType, metadata.dataUrl);
      }
    }

    for (const [tileType, variants] of Object.entries(this.worldSnapshot.tileVariantCatalog || {})) {
      variants.forEach(variant => {
        if (variant.dataUrl) {
          this.load.image(`${tileType}--variant--${variant.id}`, variant.dataUrl);
        }
      });
    }

    for (const [entityType, metadata] of Object.entries(this.worldSnapshot.spriteMetadata || {})) {
      for (const [animationType, animation] of Object.entries(metadata.animations || {})) {
        const key = `${entityType}-${animationType}`;
        if (animation.imageWidth && animation.imageHeight) {
          this.load.spritesheet(key, animation.dataUrl, {
            frameWidth: animation.frameWidth,
            frameHeight: animation.frameHeight
          });
        } else {
          this.load.image(key, animation.dataUrl);
        }
      }

      for (const boss of this.worldSnapshot.customBosses || []) {
        this.load.image(`Boss-${boss.id}`, boss.dataUrl);
      }
    }
    for (const creepy of this.worldSnapshot.customCreeps || []) {
      this.load.image(creepy.tileId, creepy.dataUrl);
    }
  }

  create() {
    const tileSize = 32;
    const worldWidth = this.worldSnapshot.cols * tileSize;
    const worldHeight = this.worldSnapshot.rows * tileSize;
    this.entityFactory.createTextures(this);
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(1.35);
    this.createBackdrop();

    const platforms = this.physics.add.staticGroup();
    const coins = this.physics.add.staticGroup();
    const flags = this.physics.add.staticGroup();
    const pipes = this.physics.add.staticGroup();
    const switches = this.physics.add.staticGroup();
    const doors = this.physics.add.staticGroup();
    const checkpoints = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.flyingEnemies = this.physics.add.group();
    this.bosses = this.physics.add.group();
    this.powerUps = this.physics.add.group();
    const projectiles = this.physics.add.group();
    this.bossProjectiles = this.physics.add.group();
    const movingPlatforms = this.physics.add.group();
    const animatedEntities = [];
    let spawnPoint = null;

    this.worldSnapshot.tiles.forEach((row, rowIndex) => {
      row.forEach((tileType, colIndex) => {
        if (!tileType) return;
        const x = colIndex * tileSize + tileSize / 2;
        const y = rowIndex * tileSize + tileSize / 2;
        if (tileType === 'Player') {
          spawnPoint = { x, y: y - PLAYER_TILE_ALIGNMENT_OFFSET };
          return;
        }
        const animations = this.worldSnapshot.spriteMetadata?.[tileType]?.animations || {};
        const animationType = animations.idle ? 'idle' : animations.walk ? 'walk' : null;
        const customCreepy = (this.worldSnapshot.customCreeps || [])
          .find(creepy => creepy.tileId === tileType);
        const isCreepy = CREEPY_TYPES.some(type => type.id === tileType) || customCreepy;
        const defaultConfig = CREEPY_TYPES.find(type => type.id === tileType) ||
          { movement: 'ground', speed: 45, health: 1 };
        const config = this.worldSnapshot.creepyConfigs?.[tileType] || defaultConfig;
        const flying = config.movement === 'flying';
        const variantId = this.worldSnapshot.tileVariants?.[rowIndex]?.[colIndex] || 'classic';
        const variant = this.worldSnapshot.tileVariantCatalog?.[tileType]
          ?.find(item => item.id === variantId);
        const legacyCustomSprite = variantId === 'classic' &&
          this.worldSnapshot.spriteMetadata?.[tileType]?.fileName;
        const createOptions = {
          bossConfig: this.worldSnapshot.bossConfig,
          textureKey: legacyCustomSprite
            ? tileType
            : variant?.dataUrl
            ? `${tileType}--variant--${variant.id}`
            : animationType ? `${tileType}-${animationType}` : undefined
        };
        const bossSize = Math.max(
          MIN_BOSS_SIZE,
          this.worldSnapshot.bossConfig?.size || MIN_BOSS_SIZE
        );
        const enemyY = tileType === 'Boss'
          ? y - PLAYER_TILE_ALIGNMENT_OFFSET - (bossSize - CHARACTER_DISPLAY_SIZE) / 2
          : isCreepy && !flying ? y - PLAYER_TILE_ALIGNMENT_OFFSET : y;
        const entity = isCreepy
          ? this.entityFactory.createEnemy(this, tileType, x, enemyY, createOptions)
          : this.entityFactory.create(this, tileType, x, enemyY, createOptions);
        if (THEMED_TILE_TYPES.has(tileType)) {
          entity.setTint(this.worldTheme.tileTint);
        }
        if (this.worldSnapshot.spriteMetadata?.[tileType]?.frames > 1) {
          animatedEntities.push({ entity, tileType });
        }
        if (tileType === 'Switch') {
          entity.setData('tileType', tileType);
          switches.add(entity);
        } else if (tileType === 'Checkpoint') {
          entity.setData('tileType', tileType);
          checkpoints.add(entity);
        } else if (tileType === 'Door') {
          entity.setData('tileType', tileType);
          doors.add(entity);
        } else if (tileType === 'Pipe') {
          pipes.add(entity);
        } else if ([
          'Ground', 'Sand', 'Stone', 'Snow', 'Brick', 'MysteryBox', 'Spring', 'OneWayPlatform'
        ].includes(tileType)) {
          platforms.add(entity);
        } else if (tileType === 'MovingPlatform') {
          movingPlatforms.add(entity);
          entity.body.setAllowGravity(false);
          entity.body.setImmovable(true);
          entity.setVelocityX(entity.getData('travelSpeed'));
        } else if (isCreepy) {
          entity.body.setSize(
            CHARACTER_COLLISION_SIZE / entity.scaleX,
            CHARACTER_COLLISION_SIZE / entity.scaleY
          ).setOffset(
            (CHARACTER_DISPLAY_SIZE - CHARACTER_COLLISION_SIZE) / 2 / entity.scaleX,
            (CHARACTER_DISPLAY_SIZE - CHARACTER_COLLISION_SIZE) / entity.scaleY
          );
          (flying ? this.flyingEnemies : this.enemies).add(entity);
          entity.setData('tileType', tileType);
          entity.setData('patrolSpeed', config.speed);
          entity.setData('health', config.health);
          entity.setData('maxHealth', config.health);
          entity.setData('hurtUntil', 0);
          if (!flying) {
            entity.setVelocityX(-config.speed);
            entity.setBounceX(1);
          } else {
            entity.setData('flightOrigin', y);
            entity.setData('flightPhase', colIndex);
            entity.body.setAllowGravity(false);
            entity.setVelocityX(-config.speed);
          }
        } else if (tileType === 'Boss') {
          const config = this.worldSnapshot.bossConfig;
          this.bosses.add(entity);
          entity.setData('bossType', config.type);
          entity.setData('movement', config.movement);
          entity.setData('ability', config.ability);
          entity.setData('maxHealth', config.health);
          entity.setData('health', config.health);
          entity.setData('speed', config.speed);
          const size = Math.max(MIN_BOSS_SIZE, config.size || MIN_BOSS_SIZE);
          const collisionScale = size / CHARACTER_DISPLAY_SIZE;
          entity.setData('size', size);
          entity.setData('originX', x);
          entity.setData('minX', Math.max(size / 2, x - 160));
          entity.setData('maxX', Math.min(worldWidth - size / 2, x + 160));
          entity.setData('nextLeapAt', this.time.now + 1800);
          entity.setData('nextAttackAt', this.time.now + 1200);
          entity.setData('nextGroundPoundAt', this.time.now + 2200);
          entity.setData('wasAirborne', false);
          entity.setData('hurtUntil', 0);
          entity.body.setAllowGravity(true);
          entity.body.setSize(38 * collisionScale / entity.scaleX, 34.5 * collisionScale / entity.scaleY)
            .setOffset(5 * collisionScale / entity.scaleX, 10.5 * collisionScale / entity.scaleY);
          entity.setVelocityX(-config.speed);
          const barWidth = 52 * size / CHARACTER_DISPLAY_SIZE;
          const barY = entity.y - size / 2 - 10;
          entity.setData('healthBar', this.add.rectangle(x - barWidth / 2, barY, barWidth, 6, 0x7d344d)
            .setOrigin(0, 0.5).setDepth(8));
          entity.setData('healthFill', this.add.rectangle(x - barWidth / 2, barY, barWidth, 6, 0x78d66b)
            .setOrigin(0, 0.5).setDepth(9));
        } else if (tileType === 'Coin') {
          coins.add(entity);
        } else if (tileType === 'Flag') {
          flags.add(entity);
        } else if (['Mushroom', 'Star', 'ExtraLife', 'FireFlower'].includes(tileType)) {
          entity.setData('powerUpType', tileType);
          entity.body.setSize(22 / entity.scaleX, 24 / entity.scaleY);
          this.powerUps.add(entity);
        }
      });
    });

    this.goalGates = [];
    this.goalGateLabels = [];
    const activeBossCount = this.bosses.getChildren().filter(boss => boss.active).length;
    const activeFlags = flags.getChildren().filter(flag => flag.active);
    if (activeBossCount > 0 && activeFlags.length > 0) {
      const spawnX = spawnPoint?.x ?? 0;
      activeFlags.forEach(flag => {
        const direction = Math.sign(flag.x - spawnX) || 1;
        const gateX = flag.x - direction * 48;
        const gate = this.add.rectangle(
          gateX,
          worldHeight / 2,
          24,
          worldHeight,
          0xd94b62,
          0.88
        ).setStrokeStyle(3, 0xffd36b, 1).setDepth(6);
        this.physics.add.existing(gate, true);
        const label = this.add.text(gateX, worldHeight - 88, 'BOSS GATE\nDEFEAT ALL BOSSES', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#893a63',
          padding: { x: 7, y: 5 }
        }).setOrigin(0.5, 0).setDepth(9);
        this.goalGates.push(gate);
        this.goalGateLabels.push(label);
      });
      this.bossHudHint = activeBossCount === 1
        ? 'Defeat the boss to open the goal!'
        : `Defeat all ${activeBossCount} bosses to open the goal!`;
    }

    if (this.worldSnapshot.pipeArrival) {
      const { row, col } = this.worldSnapshot.pipeArrival;
      spawnPoint = {
        x: col * tileSize + tileSize / 2,
        y: row * tileSize + tileSize / 2 - PLAYER_TILE_ALIGNMENT_OFFSET
      };
    }
    this.player = this.entityFactory.create(
      this,
      'Player',
      spawnPoint?.x ?? Math.min(tileSize * 2, worldWidth / 2),
      spawnPoint?.y ?? Math.max(tileSize, (this.worldSnapshot.rows - 2) * tileSize),
      {
        textureKey: this.getInitialTexture('Player')
      }
    );
    this.configurePlayerCollisionBody(this.player);
    this.playerBaseScale = this.player.scaleX;
    this.applyMushroomGrowth();
    this.player.body.reset(this.player.x, this.player.y);
    if (this.hasFire) this.player.setTint(0xff7848);
    if (this.starPowerRemainingMs > 0) {
      this.starPowerUntil = this.time.now + this.starPowerRemainingMs;
      this.player.setTint(0xffe477);
    }
    this.physics.add.collider(this.player, platforms, this.handleBlockCollision, undefined, this);
    this.goalGates.forEach(gate => this.physics.add.collider(this.player, gate));
    this.physics.add.collider(this.player, pipes);
    this.physics.add.collider(this.player, doors);
    this.physics.add.collider(
      this.player,
      movingPlatforms,
      this.handleMovingPlatformCollision,
      this.shouldLandOnMovingPlatform,
      this
    );
    this.physics.add.collider(this.enemies, platforms);
    this.physics.add.collider(this.enemies, pipes);
    this.physics.add.collider(this.enemies, doors);
    this.physics.add.collider(this.enemies, movingPlatforms);
    this.physics.add.collider(this.bosses, platforms);
    this.physics.add.collider(this.bosses, pipes);
    this.physics.add.collider(this.bosses, doors);
    this.physics.add.collider(this.bosses, movingPlatforms);
    this.physics.add.collider(this.powerUps, platforms);
    this.physics.add.collider(this.powerUps, pipes);
    this.physics.add.collider(this.powerUps, doors);
    this.physics.add.overlap(this.player, switches, this.activateSwitch, undefined, this);
    this.physics.add.overlap(this.player, checkpoints, this.activateCheckpoint, undefined, this);
    this.physics.add.collider(this.powerUps, movingPlatforms);
    this.physics.add.collider(projectiles, platforms, this.destroyProjectile, undefined, this);
    this.physics.add.collider(projectiles, pipes, this.destroyProjectile, undefined, this);
    this.physics.add.collider(projectiles, doors, this.destroyProjectile, undefined, this);
    this.physics.add.collider(projectiles, movingPlatforms, this.destroyProjectile, undefined, this);
    this.physics.add.collider(this.bossProjectiles, platforms, this.destroyProjectile, undefined, this);
    this.physics.add.collider(this.bossProjectiles, pipes, this.destroyProjectile, undefined, this);
    this.physics.add.collider(this.bossProjectiles, doors, this.destroyProjectile, undefined, this);
    this.physics.add.collider(this.bossProjectiles, movingPlatforms, this.destroyProjectile, undefined, this);
    this.physics.add.overlap(projectiles, this.enemies, this.hitEnemyWithFireball, undefined, this);
    this.physics.add.overlap(projectiles, this.flyingEnemies, this.hitEnemyWithFireball, undefined, this);
    this.physics.add.overlap(projectiles, this.bosses, this.hitBossWithFireball, undefined, this);
    this.physics.add.overlap(this.player, coins, this.collectCoin, undefined, this);
    this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this);
    this.physics.add.overlap(this.player, this.flyingEnemies, this.handleEnemyCollision, undefined, this);
    this.physics.add.overlap(this.player, this.bosses, this.handleBossCollision, undefined, this);
    this.physics.add.overlap(this.player, this.bossProjectiles, this.hitByBossProjectile, undefined, this);
    this.physics.add.overlap(this.player, flags, this.reachGoal, undefined, this);
    this.platforms = platforms;
    this.pipes = pipes;
    this.movingPlatforms = movingPlatforms;
    this.projectiles = projectiles;
    this.switches = switches;
    this.doors = doors;
    this.checkpoints = checkpoints;
    this.events.once(Scenes.Events.DESTROY, () => this.soundManager.stopAll());

    this.keys = this.input.keyboard.addKeys({
      left: Input.Keyboard.KeyCodes.LEFT,
      right: Input.Keyboard.KeyCodes.RIGHT,
      up: Input.Keyboard.KeyCodes.UP,
      down: Input.Keyboard.KeyCodes.DOWN,
      a: Input.Keyboard.KeyCodes.A,
      d: Input.Keyboard.KeyCodes.D,
      w: Input.Keyboard.KeyCodes.W,
      s: Input.Keyboard.KeyCodes.S,
      space: Input.Keyboard.KeyCodes.SPACE,
      shift: Input.Keyboard.KeyCodes.SHIFT,
      shootX: Input.Keyboard.KeyCodes.X,
      shootJ: Input.Keyboard.KeyCodes.J
    });
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setRoundPixels(true);
    const camera = this.cameras.main;
    const hudX = camera.centerX + (16 - camera.centerX) / camera.zoom;
    const hudY = camera.centerY + (16 - camera.centerY) / camera.zoom;
    this.scoreLabel = this.add.text(hudX, hudY, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#15334dcc',
      padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setScale(1 / camera.zoom).setDepth(10);
    this.updateScore();
    this.spriteAnimator.createAnimations(this, this.worldSnapshot.spriteMetadata || {});
    animatedEntities.forEach(({ entity, tileType }) => this.spriteAnimator.animate(entity, tileType));
    this.spriteAnimator.play(this.player, 'Player', 'idle');
    this.enemies.children.iterate(enemy =>
      this.spriteAnimator.play(enemy, enemy.getData('tileType'), 'walk'));
    this.flyingEnemies.children.iterate(enemy =>
      this.spriteAnimator.play(enemy, enemy.getData('tileType'), 'walk'));
    this.updateHud();
    this.eventBus.emit('gameReady');
  }

  createBackdrop() {
    const key = 'demo-backdrop';
    const texture = this.textures.createCanvas(key, 960, 540);
    const context = texture.getContext();
    const theme = this.worldTheme;
    const sky = context.createLinearGradient(0, 0, 0, 540);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(0.7, theme.sky[1]);
    sky.addColorStop(1, theme.sky[2]);
    context.fillStyle = sky;
    context.fillRect(0, 0, 960, 540);

    context.fillStyle = theme.sun;
    context.beginPath();
    context.arc(760, 114, theme.stars ? 34 : 42, 0, Math.PI * 2);
    context.fill();
    if (theme.stars) {
      context.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (const [x, y, size] of [
        [88, 52, 3], [185, 128, 2], [314, 66, 3], [452, 108, 2], [575, 42, 2],
        [668, 162, 3], [840, 68, 2], [910, 148, 3], [113, 211, 2], [520, 194, 2]
      ]) context.fillRect(x, y, size, size);
    } else {
      context.fillStyle = theme.sun;
      for (const [x, y] of [[760, 58], [760, 170], [704, 114], [816, 114], [720, 74], [800, 154], [800, 74], [720, 154]]) {
        context.fillRect(x - 2, y - 2, 4, 4);
      }
    }

    context.fillStyle = 'rgb(255 255 255 / 72%)';
    for (const [x, y] of theme.stars ? [] : [[85, 100], [385, 145], [625, 72], [860, 178]]) {
      context.fillRect(x, y + 12, 72, 18);
      context.fillRect(x + 14, y, 44, 18);
      context.fillRect(x + 26, y + 26, 34, 8);
      context.fillStyle = '#537e94';
      context.fillRect(x + 28, y + 15, 3, 3);
      context.fillRect(x + 40, y + 15, 3, 3);
      context.fillRect(x + 33, y + 21, 6, 2);
      context.fillStyle = 'rgb(255 255 255 / 72%)';
    }

    context.fillStyle = theme.far;
    context.beginPath();
    context.moveTo(0, 355);
    context.quadraticCurveTo(180, 230, 350, 354);
    context.quadraticCurveTo(540, 238, 720, 354);
    context.quadraticCurveTo(860, 267, 960, 333);
    context.lineTo(960, 540);
    context.lineTo(0, 540);
    context.fill();

    context.fillStyle = theme.near;
    context.beginPath();
    context.moveTo(0, 425);
    context.quadraticCurveTo(200, 320, 390, 425);
    context.quadraticCurveTo(620, 310, 790, 415);
    context.quadraticCurveTo(880, 368, 960, 400);
    context.lineTo(960, 540);
    context.lineTo(0, 540);
    context.fill();

    if (theme.id === 'storybook' || theme.id === 'forest' || theme.id === 'candy') {
      for (const [x, y] of [[80, 382], [285, 402], [530, 380], [850, 393]]) {
        context.fillStyle = theme.near;
        context.fillRect(x + 10, y + 24, 8, 34);
        context.fillStyle = theme.far;
        context.fillRect(x, y + 8, 28, 22);
        context.fillRect(x + 5, y, 18, 14);
        context.fillRect(x + 5, y + 10, 8, 5);
      }
    }

    texture.refresh();
    this.add.image(480, 270, key).setScrollFactor(0).setDepth(-10);
  }

  update() {
    if (!this.player?.active || this.gameEnded || this.isRespawning) return;
    if (this.starPowerUntil && this.time.now >= this.starPowerUntil) {
      this.starPowerUntil = 0;
      if (this.hasFire) this.player.setTint(0xff7848);
      else this.player.clearTint();
      this.refreshPowerLabel();
    }
    if (this.player.body.bottom > this.worldSnapshot.rows * 32) {
      if (this.checkpointPoint) this.respawnAtCheckpoint();
      else this.endGame(false, 'fall');
      return;
    }
    const worldWidth = this.worldSnapshot.cols * 32;
    this.movingPlatforms.children.iterate(platform => {
      if (!platform?.active) return;
      if (this.player.getData('ridingPlatform') === platform &&
        (this.player.body.touching.down || this.player.body.blocked.down) &&
        this.player.body.velocity.y >= 0) {
        this.player.x += platform.x - platform.getData('previousX');
      } else if (this.player.getData('ridingPlatform') === platform) {
        this.player.setData('ridingPlatform', null);
      }
      platform.setData('previousX', platform.x);
      const direction = platform.getData('travelDirection');
      const speed = platform.getData('travelSpeed');
      if (direction > 0 && platform.x >= platform.getData('maxX')) {
        platform.setX(platform.getData('maxX'));
        platform.setData('travelDirection', -1);
        platform.setVelocityX(-speed);
      } else if (direction < 0 && platform.x <= platform.getData('minX')) {
        platform.setX(platform.getData('minX'));
        platform.setData('travelDirection', 1);
        platform.setVelocityX(speed);
      }
    });
    const halfPlayerWidth = this.player.body.width / 2;
    if (this.player.x < halfPlayerWidth) {
      this.player.setX(halfPlayerWidth);
      if (this.player.body.velocity.x < 0) this.player.setVelocityX(0);
    } else if (this.player.x > worldWidth - halfPlayerWidth) {
      this.player.setX(worldWidth - halfPlayerWidth);
      if (this.player.body.velocity.x > 0) this.player.setVelocityX(0);
    }
    const left = this.keys.left.isDown || this.keys.a.isDown || this.touchState.left;
    const right = this.keys.right.isDown || this.keys.d.isDown || this.touchState.right;
    const touchUpPressed = this.touchState.up && !this.touchJumpWasDown;
    this.touchJumpWasDown = Boolean(this.touchState.up);
    const touchDownPressed = this.touchState.down && !this.touchPipeWasDown;
    this.touchPipeWasDown = Boolean(this.touchState.down);
    const upPressed = Input.Keyboard.JustDown(this.keys.up) || touchUpPressed;
    const downPressed = Input.Keyboard.JustDown(this.keys.down) ||
      Input.Keyboard.JustDown(this.keys.s) || touchDownPressed;
    if ((downPressed && this.tryUsePipe('down')) ||
      (upPressed && this.tryUsePipe('up'))) return;
    const jumpPressed = upPressed ||
      Input.Keyboard.JustDown(this.keys.w) ||
      Input.Keyboard.JustDown(this.keys.space);
    const jumpHeld = this.keys.up.isDown || this.keys.w.isDown ||
      this.keys.space.isDown || this.touchState.up;
    const touchShootPressed = this.touchState.shoot && !this.touchShootWasDown;
    this.touchShootWasDown = this.touchState.shoot;
    if (Input.Keyboard.JustDown(this.keys.shootX) ||
      Input.Keyboard.JustDown(this.keys.shootJ) || touchShootPressed) this.shootFireball();
    if (jumpPressed) this.jumpBufferUntil = this.time.now + 120;
    if (this.player.body.blocked.down || this.player.body.touching.down) {
      this.coyoteUntil = this.time.now + 120;
    }

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const touchingWallLeft = this.player.body.blocked.left || this.player.body.touching.left;
    const touchingWallRight = this.player.body.blocked.right || this.player.body.touching.right;
    const wallDirection = touchingWallLeft ? -1 : touchingWallRight ? 1 : 0;
    const pressingIntoWall = wallDirection === -1 ? left && !right : right && !left;
    const wallSliding = !onGround && this.player.body.velocity.y > 0 &&
      wallDirection !== 0 && pressingIntoWall;

    if (this.wallJumpUntil > this.time.now) {
      this.player.setVelocityX(this.wallJumpDirection * 260);
      this.player.setFlipX(this.wallJumpDirection < 0);
    } else if (left === right) {
      this.player.setVelocityX(0);
      this.spriteAnimator.play(this.player, 'Player', 'idle');
    } else {
      const speed = this.keys.shift?.isDown ? 290 : this.mushroomGrowth > 0 ? 220 : 180;
      this.player.setVelocityX(left ? -speed : speed);
      this.player.setFlipX(left);
      this.spriteAnimator.play(this.player, 'Player', speed > 200 ? 'run' : 'walk');
    }

    if (this.jumpBufferUntil > this.time.now && wallSliding) {
      this.player.setVelocity(wallDirection * -260, this.mushroomGrowth > 0 ? -520 : -430);
      this.jumpBufferUntil = 0;
      this.coyoteUntil = 0;
      this.wallJumpDirection = wallDirection * -1;
      this.wallJumpUntil = this.time.now + 180;
      this.player.setFlipX(this.wallJumpDirection < 0);
      this.player.body.setGravityY(0);
      this.jumpWasHeld = false;
      this.soundManager.play('jump');
    } else if (this.jumpBufferUntil > this.time.now && this.coyoteUntil > this.time.now) {
      this.player.setVelocityY(this.mushroomGrowth > 0 ? -520 : -430);
      this.jumpBufferUntil = 0;
      this.coyoteUntil = 0;
      this.jumpWasHeld = jumpHeld;
      this.player.body.setGravityY(jumpHeld ? -260 : 0);
      this.soundManager.play('jump');
    } else if (wallSliding) {
      this.player.setVelocityY(120);
      this.player.body.setGravityY(0);
      this.jumpWasHeld = false;
    } else if (this.player.body.velocity.y < 0 && this.jumpWasHeld && !jumpHeld) {
      this.player.setVelocityY(this.player.body.velocity.y * 0.5);
      this.player.body.setGravityY(0);
      this.jumpWasHeld = false;
    } else if (this.player.body.velocity.y >= 0) {
      this.player.body.setGravityY(0);
      this.jumpWasHeld = false;
    }
    if (!this.player.body.blocked.down && !this.player.body.touching.down) {
      this.spriteAnimator.play(this.player, 'Player', 'jump');
    }

    this.enemies.children.iterate(enemy => {
      if (!enemy?.active) return;
      const speed = enemy.getData('patrolSpeed');
      if (enemy.body.blocked.left) enemy.setVelocityX(speed);
      if (enemy.body.blocked.right) enemy.setVelocityX(-speed);
      enemy.setFlipX(enemy.body.velocity.x > 0);
      this.spriteAnimator.play(
        enemy,
        enemy.getData('tileType'),
        Math.abs(enemy.body.velocity.x) ? 'walk' : 'idle'
      );
    });

    this.flyingEnemies.children.iterate(enemy => {
      if (!enemy?.active) return;
      const halfWidth = enemy.body.width / 2;
      const speed = enemy.getData('patrolSpeed');
      if (enemy.x < halfWidth) enemy.setVelocityX(speed);
      if (enemy.x > worldWidth - halfWidth) enemy.setVelocityX(-speed);
      enemy.setFlipX(enemy.body.velocity.x > 0);
      enemy.setY(enemy.getData('flightOrigin') +
        Math.sin(this.time.now / 240 + enemy.getData('flightPhase')) * 12);
      this.spriteAnimator.play(enemy, enemy.getData('tileType'), 'walk');
    });

    this.bosses.children.iterate(boss => this.updateBoss(boss));
    this.bossProjectiles.children.iterate(projectile => {
      if (!projectile?.active) return;
      projectile.setRotation(projectile.rotation + 0.08);
    });
  }

  tryUsePipe(direction) {
    const destinationIndex = this.worldSnapshot.pipeDestination;
    if (!Number.isInteger(destinationIndex) || !this.pipes?.getChildren().length) return false;
    const playerBody = this.player.body;
    const playerBounds = {
      left: playerBody.left,
      right: playerBody.right,
      top: playerBody.top,
      bottom: playerBody.bottom
    };
    const candidate = this.pipes.getChildren().find(pipe => {
      if (!pipe.active || !pipe.body) return false;
      const pipeBody = pipe.body;
      if (direction === 'down') {
        return Math.abs(playerBounds.bottom - pipeBody.top) <= 10 &&
          playerBounds.right > pipeBody.left + 3 &&
          playerBounds.left < pipeBody.right - 3;
      }
      const verticalOverlap = playerBounds.bottom > pipeBody.top + 6 &&
        playerBounds.top < pipeBody.bottom - 6;
      const horizontalGap = Math.max(
        pipeBody.left - playerBounds.right,
        playerBounds.left - pipeBody.right,
        0
      );
      return verticalOverlap && horizontalGap <= 10;
    });
    if (!candidate) return false;
    this.gameEnded = true;
    this.player.setVelocity(0, 0).setAlpha(0.45);
    this.cameras.main.flash(220, 184, 255, 213);
    this.time.delayedCall(240, () => {
      this.eventBus.emit('pipeTravel', {
        destinationIndex,
        campaignProgress: this.getCampaignProgress()
      });
    });
    return true;
  }

  updateBoss(boss) {
    if (!boss?.active || !boss.body?.enable || boss.getData('health') <= 0) return;
    const movement = boss.getData('movement');
    const ability = boss.getData('ability');
    const speed = boss.getData('speed');
    const grounded = boss.body.blocked.down || boss.body.touching.down;
    const wasAirborne = boss.getData('wasAirborne');

    if (movement === 'chase') {
      boss.setVelocityX(Math.sign(this.player.x - boss.x) * speed);
    } else if (movement === 'patrol') {
      if (boss.x <= boss.getData('minX') || boss.body.blocked.left) {
        boss.setVelocityX(speed);
      } else if (boss.x >= boss.getData('maxX') || boss.body.blocked.right) {
        boss.setVelocityX(-speed);
      }
    } else if (movement === 'leap' && grounded && this.time.now >= boss.getData('nextLeapAt') &&
      Math.abs(this.player.x - boss.x) < 360) {
      this.leapBoss(boss, speed);
      boss.setData('nextLeapAt', this.time.now + 2000);
    }

    const usesGroundPound = ability === 'groundPound' || ability === 'both';
    if (usesGroundPound && movement !== 'leap' && grounded &&
      this.time.now >= boss.getData('nextGroundPoundAt') &&
      Math.abs(this.player.x - boss.x) < 280) {
      this.leapBoss(boss, speed * 0.8);
      boss.setData('nextGroundPoundAt', this.time.now + 2600);
    }

    if (usesGroundPound && wasAirborne && grounded) {
      this.spawnGroundShockwaves(boss);
    }
    boss.setData('wasAirborne', !grounded);

    const usesFireballs = ability === 'fireballs' || ability === 'both';
    if (usesFireballs && this.time.now >= boss.getData('nextAttackAt') &&
      Math.abs(this.player.x - boss.x) < 850) {
      this.spawnBossFireball(boss);
      boss.setData('nextAttackAt', this.time.now + 1700);
    }

    const health = boss.getData('health');
    const maxHealth = boss.getData('maxHealth');
    const size = boss.getData('size') || MIN_BOSS_SIZE;
    const barWidth = 52 * size / CHARACTER_DISPLAY_SIZE;
    const barY = boss.y - size / 2 - 10;
    boss.getData('healthBar')?.setPosition(boss.x - barWidth / 2, barY)
      .setSize(barWidth, 6);
    boss.getData('healthFill')
      ?.setPosition(boss.x - barWidth / 2, barY)
      .setSize(barWidth, 6)
      .setScale(health / maxHealth, 1);
    boss.setFlipX(boss.body.velocity.x > 0);
  }

  leapBoss(boss, speed) {
    const direction = Math.sign(this.player.x - boss.x) || 1;
    boss.setVelocity(direction * speed * 1.4, -470);
    boss.setData('wasAirborne', true);
  }

  spawnBossFireball(boss) {
    const direction = Math.sign(this.player.x - boss.x) || 1;
    const size = boss.getData('size') || MIN_BOSS_SIZE;
    this.spawnBossProjectile(
      boss.x + direction * size * 0.42,
      boss.y - size * 0.1,
      direction * 320,
      0,
      4500
    );
  }

  spawnGroundShockwaves(boss) {
    this.cameras.main.shake(100, 0.004);
    this.emitBurst(boss.x, boss.body.bottom, 0xf6c776, 8, 24);
    for (const direction of [-1, 1]) {
      this.spawnBossProjectile(
        boss.x + direction * (boss.getData('size') || MIN_BOSS_SIZE) * 0.42,
        boss.body.bottom - 5,
        direction * 150,
        0
      );
    }
  }

  spawnBossProjectile(x, y, velocityX, velocityY, lifetime = 2600) {
    const projectile = this.physics.add.sprite(x, y, 'BossProjectile');
    projectile.body.setAllowGravity(false);
    projectile.body.setSize(14, 14);
    projectile.setData('bossProjectile', true);
    this.bossProjectiles.add(projectile);
    projectile.setVelocity(velocityX, velocityY);
    this.time.delayedCall(lifetime, () => {
      if (projectile.active) projectile.destroy();
    });
  }

  getInitialTexture(entityType) {
    const animations = this.worldSnapshot.spriteMetadata?.[entityType]?.animations || {};
    for (const animationType of ['idle', 'walk', 'run', 'jump']) {
      if (animations[animationType]) return `${entityType}-${animationType}`;
    }
    return entityType;
  }

  handleBlockCollision(player, block) {
    const tileType = block.getData('tileType');
    if (tileType === 'Spring' && (player.body.touching.down || player.body.blocked.down)) {
      if ((block.getData('bounceCooldown') || 0) <= this.time.now) {
        block.setData('bounceCooldown', this.time.now + 250);
        player.setVelocityY(-640);
        this.coyoteUntil = 0;
        this.jumpBufferUntil = 0;
        this.jumpWasHeld = false;
        player.body.setGravityY(0);
        block.setTint(0xffd5e0);
        this.time.delayedCall(120, () => {
          if (block.active) block.clearTint();
        });
        this.emitBurst(block.x, block.y - 8, 0xf6c2cd, 7, 24);
        this.soundManager.play('spring');
      }
      return;
    }
    if (player.body.touching.up || player.body.blocked.up) {
      if (tileType === 'Brick') {
        this.breakBrick(block);
      }
      if (tileType === 'MysteryBox' && !block.getData('used')) {
        block.setData('used', true);
        block.setTint(0x777777);
        this.score += 1;
        this.updateScore();
        this.soundManager.play('mysteryBox');
        this.emitBurst(block.x, block.y, 0xf6c776, 8, 24);
        this.spawnPowerUp(block);
      }
    }
  }

  handleMovingPlatformCollision(player, platform) {
    player.setData('ridingPlatform', platform);
  }

  shouldLandOnMovingPlatform(player, platform) {
    if (player.body.velocity.y < 0) return false;
    const previousBottom = player.body.prev.y + player.body.height;
    return previousBottom <= platform.body.top + 6;
  }

  activateSwitch(player, switchEntity) {
    if (switchEntity.getData('activated')) return;
    switchEntity.setData('activated', true);
    switchEntity.setTint(0x9de8a7);
    this.soundManager.play('switch');
    this.emitBurst(switchEntity.x, switchEntity.y, 0xf6c776, 10, 30);
    this.cameras.main.shake(100, 0.003);
    this.doors.children.iterate(door => {
      if (!door?.active || door.getData('open')) return;
      door.setData('open', true);
      door.body.enable = false;
      this.tweens.add({
        targets: door,
        alpha: 0,
        scaleY: 0.2,
        duration: 220,
        onComplete: () => door.destroy()
      });
    });
  }

  activateCheckpoint(player, checkpoint) {
    if (checkpoint.getData('activated')) return;
    this.checkpoints.children.iterate(previous => {
      if (previous?.getData('activated')) previous.clearTint();
      previous?.setData('activated', false);
    });
    checkpoint.setData('activated', true);
    checkpoint.setTint(0x9de8a7);
    this.checkpointPoint = {
      x: checkpoint.x,
      y: checkpoint.y - PLAYER_TILE_ALIGNMENT_OFFSET
    };
    this.soundManager.play('checkpoint');
    this.emitBurst(checkpoint.x, checkpoint.y - 8, 0x72d5a5, 12, 34);
    this.updateHud();
  }

  respawnAtCheckpoint() {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.endGame(false, 'fall');
      return;
    }
    this.isRespawning = true;
    const player = this.player;
    player.body.checkCollision.none = true;
    player.setVelocity(0, 0);
    player.setAngularVelocity(360);
    this.cameras.main.shake(180, 0.008);
    this.tweens.add({
      targets: player,
      alpha: 0,
      duration: 450,
      ease: 'Cubic.easeIn'
    });
    this.time.delayedCall(500, () => {
      if (!player.active) return;
      player.setPosition(this.checkpointPoint.x, this.checkpointPoint.y);
      player.setAlpha(1).setRotation(0).setAngularVelocity(0);
      player.body.reset(player.x, player.y);
      player.body.checkCollision.none = false;
      player.setVelocity(0, 0);
      this.mushroomGrowth = 0;
      player.setDisplaySize(CHARACTER_DISPLAY_SIZE, CHARACTER_DISPLAY_SIZE);
      this.configurePlayerCollisionBody(player);
      this.playerBaseScale = player.scaleX;
      player.body.reset(player.x, player.y);
      player.clearTint();
      this.hasFire = false;
      this.starPowerUntil = 0;
      this.starPowerRemainingMs = 0;
      this.jumpBufferUntil = 0;
      this.coyoteUntil = 0;
      this.jumpWasHeld = false;
      this.invulnerableUntil = this.time.now + 1200;
      this.isRespawning = false;
      this.updateHud();
    });
    this.updateHud();
  }

  breakBrick(block) {
    if (block.getData('breaking')) return;
    block.setData('breaking', true);
    block.body.enable = false;
    this.soundManager.play('brickBreak');
    this.emitBurst(block.x, block.y, 0xe7a176, 12, 34);
    this.cameras.main.shake(120, 0.006);

    const debris = [
      { x: -1, y: -1, color: 0xd8795b, size: 12 },
      { x: 1, y: -1, color: 0xe7a176, size: 10 },
      { x: -1, y: 1, color: 0xa84f43, size: 11 },
      { x: 1, y: 1, color: 0x713f43, size: 9 }
    ];
    debris.forEach(({ x, y, color, size }) => {
      const fragment = this.add.rectangle(
        block.x + x * 5,
        block.y + y * 5,
        size,
        size,
        color
      ).setDepth(block.depth + 1);
      this.tweens.add({
        targets: fragment,
        x: block.x + x * 26,
        y: block.y + (y < 0 ? -30 : 18),
        angle: x * 180 + y * 120,
        alpha: 0,
        scale: 0.45,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => fragment.destroy()
      });
    });

    this.tweens.add({
      targets: block,
      y: block.y - 3,
      scaleX: 0.55,
      scaleY: 0.55,
      alpha: 0,
      duration: 100,
      onComplete: () => block.destroy()
    });
  }

  spawnPowerUp(block) {
    const configuredReward = this.worldSnapshot.mysteryBoxReward || 'Mushroom';
    const rewardType = configuredReward === 'Random'
      ? POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)]
      : configuredReward;
    const item = this.entityFactory.create(this, rewardType, block.x, block.y - 20);
    item.setData('powerUpType', rewardType);
    item.body.setSize(22 / item.scaleX, 24 / item.scaleY);
    item.setCollideWorldBounds(true).setBounceX(1);
    this.powerUps.add(item);
    this.tweens.add({
      targets: item,
      y: block.y - 36,
      duration: 300,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!item.active) return;
        this.emitBurst(item.x, item.y, 0xffd66b, 8, 24);
        item.body.setAllowGravity(true);
        item.body.setGravityY(-350);
        item.setVelocity(90, -20);
      }
    });
  }

  collectCoin(player, coin) {
    this.emitBurst(coin.x, coin.y, 0xffdf62, 9, 28);
    coin.destroy();
    this.score += 1;
    this.updateScore();
    this.soundManager.play('coin');
  }

  collectPowerUp(player, item) {
    if (!item.active) return;
    const powerUpType = item.getData('powerUpType');
    const powerUpColors = {
      Mushroom: 0xff9673,
      Star: 0xffe477,
      ExtraLife: 0xff7183,
      FireFlower: 0xff8a4c
    };
    this.emitBurst(item.x, item.y, powerUpColors[powerUpType] || 0xffffff, 12, 34);
    item.destroy();
    this.soundManager.play('powerUp');

    if (powerUpType === 'Mushroom') {
      this.mushroomGrowth += 1;
      this.applyMushroomGrowth();
    } else if (powerUpType === 'FireFlower') {
      this.hasFire = true;
      player.setTint(0xff7848);
    } else if (powerUpType === 'Star') {
      this.starPowerUntil = this.time.now + 8000;
      player.setTint(0xffe477);
    } else if (powerUpType === 'ExtraLife') {
      this.lives += 1;
    }

    this.refreshPowerLabel();
    this.updateHud();
  }

  handleEnemyCollision(player, enemy) {
    if (!enemy.active || this.gameEnded) return;
    const stomping = player.body.velocity.y > 0 && player.body.bottom < enemy.body.center.y + 10;
    if (this.starPowerUntil > this.time.now) {
      this.emitBurst(enemy.x, enemy.y, 0xffe477, 10, 30);
      enemy.destroy();
      this.score += 1;
      this.updateScore();
      this.soundManager.play('enemyStomp');
      return;
    }
    if (stomping) {
      this.damageEnemy(enemy);
      player.setVelocityY(-300);
      this.soundManager.play('enemyStomp');
    } else {
      this.damagePlayer(player);
    }
  }

  damageEnemy(enemy) {
    if (!enemy?.active || this.time.now < enemy.getData('hurtUntil')) return;
    const health = Math.max(0, enemy.getData('health') - 1);
    enemy.setData('health', health);
    enemy.setData('hurtUntil', this.time.now + 250);
    if (health > 0) {
      enemy.setTint(0xffffff);
      this.time.delayedCall(100, () => {
        if (enemy.active) enemy.clearTint();
      });
      this.emitBurst(enemy.x, enemy.y, 0xf6c776, 6, 20);
      return;
    }
    this.emitBurst(enemy.x, enemy.y, 0x9fe278, 10, 30);
    enemy.destroy();
    this.score += 1;
    this.updateScore();
  }

  handleBossCollision(player, boss) {
    if (!boss.active || boss.getData('health') <= 0 || this.gameEnded) return;
    const stompTolerance = Math.min(18, boss.body.height * 0.2);
    const stomping = player.body.velocity.y > 0 &&
      player.body.bottom < boss.body.top + stompTolerance;
    if (this.starPowerUntil > this.time.now) {
      this.damageBoss(boss, 2);
      player.setVelocityY(-330);
    } else if (stomping) {
      this.damageBoss(boss);
      player.setVelocityY(-360);
    } else {
      this.damagePlayer(player);
    }
  }

  hitBossWithFireball(projectile, boss) {
    if (!projectile.active || !boss.active || boss.getData('health') <= 0 || this.gameEnded) return;
    projectile.destroy();
    this.damageBoss(boss);
  }

  hitByBossProjectile(player, projectile) {
    if (!projectile.active || this.gameEnded) return;
    projectile.destroy();
    this.damagePlayer(player);
  }

  damageBoss(boss, damage = 1) {
    if (!boss.active || boss.getData('health') <= 0 ||
      this.time.now < boss.getData('hurtUntil')) return;
    boss.setData('hurtUntil', this.time.now + 550);
    const health = Math.max(0, boss.getData('health') - damage);
    boss.setData('health', health);
    this.emitBurst(boss.x, boss.y, health ? 0xf6c776 : 0x9fe278, health ? 7 : 16, 34);
    this.soundManager.play('enemyStomp');
    this.score += health ? 1 : 5;
    this.updateScore();
    if (health > 0) {
      boss.setTint(0xffffff);
      this.time.delayedCall(110, () => {
        if (boss.active) boss.clearTint();
      });
      return;
    }

    boss.body.enable = false;
    boss.setVelocity(0, 0);
    boss.getData('healthBar')?.destroy();
    boss.getData('healthFill')?.destroy();
    this.tweens.add({
      targets: boss,
      alpha: 0,
      scale: 0.4,
      angle: 180,
      duration: 360,
      onComplete: () => boss.destroy()
    });
    const bossesRemain = this.bosses.getChildren().some(other =>
      other.active && other !== boss && other.getData('health') > 0
    );
    this.bossHudHint = bossesRemain
      ? 'Boss defeated! Defeat the remaining bosses to open the goal.'
      : 'Boss defeated! The goal is open.';
    if (!bossesRemain) this.openGoalGate();
    this.updateHud();
  }

  openGoalGate() {
    if (!this.goalGates?.length) return;
    this.goalGates.forEach((gate, index) => {
      gate.body.enable = false;
      const label = this.goalGateLabels[index];
      label?.setText('GOAL OPEN!');
      this.tweens.add({
        targets: [gate, label].filter(Boolean),
        alpha: 0,
        duration: 700,
        delay: 150,
        onComplete: () => {
          gate.destroy();
          label?.destroy();
        }
      });
    });
    this.goalGates = [];
    this.goalGateLabels = [];
  }

  damagePlayer(player) {
    if (this.time.now < this.invulnerableUntil || this.gameEnded) return;
    this.invulnerableUntil = this.time.now + 1000;
    if (this.hasFire) {
      this.hasFire = false;
      if (this.starPowerUntil > this.time.now) player.setTint(0xffe477);
      else player.clearTint();
      this.refreshPowerLabel();
    } else if (this.mushroomGrowth > 0) {
      this.mushroomGrowth -= 1;
      this.applyMushroomGrowth();
      this.refreshPowerLabel();
    } else {
      this.lives -= 1;
    }
    player.setTint(0xff7777);
    player.setVelocityY(-260);
    this.emitBurst(player.x, player.y, 0xff7777, 10, 32);
    this.time.delayedCall(500, () => {
      if (player.active && this.starPowerUntil <= this.time.now) player.clearTint();
    });
    this.updateScore();
    if (this.lives <= 0) this.endGame(false, 'hit');
    else this.soundManager.play('playerHit');
  }

  reachGoal() {
    const activeBosses = this.bosses.getChildren().filter(boss =>
      boss.active && boss.getData('health') > 0
    );
    if (activeBosses.length) {
      this.bossHudHint = activeBosses.length === 1
        ? 'Defeat the boss to open the goal!'
        : `Defeat all ${activeBosses.length} bosses to open the goal!`;
      this.updateHud();
      return;
    }
    this.endGame(true);
  }

  endGame(won, cause = 'hit') {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.soundManager.play(won ? 'win' : 'lose');
    if (won) {
      this.celebrateWin();
      return;
    }

    const player = this.player;
    this.emitBurst(player?.x || 0, player?.y || 0, 0xff7777, 14, 42);
    if (!player?.active) {
      this.finishGame(false);
      return;
    }
    const camera = this.cameras.main;
    camera.stopFollow();
    const view = camera.worldView;
    if (cause === 'fall' ||
      player.x < view.left || player.x > view.right || player.y < view.top || player.y > view.bottom) {
      player.setPosition(
        Math.max(view.left + 48, Math.min(view.right - 48, player.x)),
        view.top + view.height * 0.55
      );
    }
    player.body.checkCollision.none = true;
    player.body.enable = false;
    player.setVelocity(0, 0);
    player.setAngularVelocity(0);
    player.setFlipY(true);
    player.setAlpha(1);
    this.physics.world.pause();
    const startY = player.y;
    const landingY = Math.min(startY + 92, view.bottom - 48);
    this.cameras.main.shake(220, 0.012);
    this.tweens.add({
      targets: player,
      y: startY - 92,
      angle: 360,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (!player.active) {
          this.finishGame(false);
          return;
        }
        this.tweens.add({
          targets: player,
          y: landingY,
          angle: 720,
          alpha: 0,
          duration: 520,
          ease: 'Cubic.easeIn',
          onComplete: () => this.finishGame(false)
        });
      }
    });
  }

  celebrateWin() {
    const player = this.player;
    if (!player?.active) {
      this.finishGame(true);
      return;
    }

    player.body.checkCollision.none = true;
    player.body.enable = false;
    player.setVelocity(0, 0);
    player.setAngularVelocity(0);
    player.setAlpha(1);
    this.cameras.main.stopFollow();
    this.physics.world.pause();
    const view = this.cameras.main.worldView;

    const burstColors = [
      0xffd34e, 0xff6d8b, 0x71dcff, 0x8be28b,
      0xc98bff, 0xffa45c, 0x68e0c3, 0xff8ad1
    ];
    const burstPoints = this.isCampaignFinal
      ? [
        { x: 0.16, y: 0.22 }, { x: 0.36, y: 0.15 }, { x: 0.56, y: 0.22 },
        { x: 0.78, y: 0.16 }, { x: 0.27, y: 0.4 }, { x: 0.49, y: 0.34 },
        { x: 0.72, y: 0.39 }, { x: 0.88, y: 0.29 }
      ]
      : [
        { x: 0.24, y: 0.22 },
        { x: 0.5, y: 0.16 },
        { x: 0.76, y: 0.24 },
        { x: 0.36, y: 0.42 },
        { x: 0.66, y: 0.4 }
      ];
    burstPoints.forEach((point, index) => {
      this.time.delayedCall(index * (this.isCampaignFinal ? 180 : 210), () => {
        const x = view.left + view.width * point.x;
        const y = view.top + view.height * point.y;
        this.emitFirework(x, y, burstColors[index]);
      });
    });
    this.tweens.add({
      targets: player,
      y: player.y - 36,
      angle: 360,
      duration: 650,
      ease: 'Cubic.easeOut',
      yoyo: true,
      onComplete: () => player.setAngle(0)
    });
    this.cameras.main.flash(220, 255, 249, 218, false);
    this.time.delayedCall(this.isCampaignFinal ? 2600 : 1450, () => this.finishGame(true));
  }

  emitFirework(x, y, color) {
    const burst = this.add.circle(x, y, 4, color).setDepth(20);
    const ring = this.add.circle(x, y, 3, color, 0).setStrokeStyle(2, color, 0.9)
      .setDepth(19);
    this.tweens.add({
      targets: burst,
      radius: 30,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy()
    });
    this.tweens.add({
      targets: ring,
      radius: 38,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    });
    for (let index = 0; index < 24; index += 1) {
      const angle = Math.PI * 2 * index / 24;
      const distance = 48 + Math.random() * 48;
      const spark = this.add.circle(x, y, 2 + Math.random() * 2, color)
        .setDepth(20);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.15,
        duration: 540 + Math.random() * 180,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy()
      });
    }
  }

  finishGame(won) {
    this.eventBus.emit('gameMessage', {
      won,
      campaignComplete: won && this.isCampaignFinal,
      message: won
        ? this.isCampaignFinal
          ? 'CAMPAIGN COMPLETE! Every challenge conquered!'
          : 'Goal reached! You win!'
        : 'Game over! Try again.',
      campaignProgress: won ? this.getCampaignProgress() : null
    });
    this.scene.pause();
  }

  getCampaignProgress() {
    return {
      score: this.score,
      lives: this.lives,
      mushroomGrowth: this.mushroomGrowth,
      hasFire: this.hasFire,
      starPowerRemainingMs: Math.max(0, this.starPowerUntil - this.time.now)
    };
  }

  configurePlayerCollisionBody(player) {
    player.setSize(22 / player.scaleX, 28 / player.scaleY)
      .setOffset(
        (CHARACTER_DISPLAY_SIZE - 22) / 2 / player.scaleX,
        (CHARACTER_DISPLAY_SIZE - 28 - PLAYER_ART_FOOT_INSET) / player.scaleY
      );
  }

  applyMushroomGrowth() {
    if (!this.player?.body) return;
    const previousBottom = this.player.body.bottom;
    this.player.setScale(this.playerBaseScale * (1 + this.mushroomGrowth * 0.25));
    this.player.body.updateFromGameObject();
    this.player.y += previousBottom - this.player.body.bottom;
    this.player.body.updateFromGameObject();
  }

  updateScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(this.levelRecordKey, String(this.bestScore));
      } catch (error) {
        console.error('Could not save this level record:', error);
        this.eventBus.emit('status', 'Could not save the level record in this browser.');
      }
    }
    this.updateHud();
  }

  emitBurst(x, y, color, count = 8, spread = 28, duration = 360) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.PI * 2 * index / count;
      const distance = spread * (0.65 + Math.random() * 0.35);
      const particle = this.add.circle(x, y, 2 + Math.random() * 2, color).setDepth(4);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.15,
        duration,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  loadBestScore() {
    try {
      const saved = Number(localStorage.getItem(this.levelRecordKey) || 0);
      if (!Number.isSafeInteger(saved) || saved < 0) {
        throw new TypeError('The saved level record is invalid.');
      }
      return saved;
    } catch (error) {
      console.error('Could not load this level record:', error);
      this.eventBus.emit('status', 'Could not load the level record in this browser.');
      return 0;
    }
  }

  refreshPowerLabel() {
    const hasStar = this.starPowerUntil > this.time.now;
    const powers = [];
    if (this.mushroomGrowth > 0) powers.push(`Big ×${this.mushroomGrowth}`);
    if (this.hasFire) powers.push('Fire');
    if (hasStar) powers.push('Star');
    this.powerLabel = powers.length ? powers.join(' + ') : 'Normal';
  }

  shootFireball() {
    if (!this.hasFire || this.time.now < this.fireCooldownUntil || this.gameEnded) return;
    this.fireCooldownUntil = this.time.now + 300;
    const direction = this.player.flipX ? -1 : 1;
    const projectile = this.physics.add.sprite(
      this.player.x + direction * 18,
      this.player.y,
      'Fireball'
    );
    this.projectiles.add(projectile);
    projectile.body.setAllowGravity(false);
    projectile.setSize(14, 14).setOffset(9, 9);
    projectile.setVelocity(direction * 360, 0);
    this.emitBurst(projectile.x, projectile.y, 0xffb94d, 5, 16, 220);
    this.soundManager.play('fireball');
    this.time.delayedCall(1500, () => {
      if (projectile.active) projectile.destroy();
    });
  }

  destroyProjectile(projectile) {
    if (projectile.active) projectile.destroy();
  }

  hitEnemyWithFireball(projectile, enemy) {
    if (!projectile.active || !enemy.active || this.gameEnded) return;
    projectile.destroy();
    this.damageEnemy(enemy);
    this.soundManager.play('enemyStomp');
  }

  updateHud() {
    if (!this.scoreLabel) return;
    this.refreshPowerLabel();
    this.scoreLabel.setText(
      `Coins: ${this.score}  Best: ${this.bestScore}  Lives: ${this.lives}\nPower: ${this.powerLabel}${this.bossHudHint ? `\n${this.bossHudHint}` : ''}`
    );
  }
}
