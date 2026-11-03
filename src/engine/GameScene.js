import { Input, Scene, Scenes } from 'phaser';
import { characterArt } from '../assets/demo/CharacterArt.js';
import pipeBodySprite from '../assets/demo/PipeBody.svg?inline';
import {
  CREEPY_TYPES,
  MIN_BOSS_SIZE,
  POWER_UP_TYPES,
  THEMED_TILE_TYPES,
  WORLD_THEMES
} from '../core/StateManager.js';
import { CHARACTER_COLLISION_SIZE, CHARACTER_DISPLAY_SIZE } from './EntityFactory.js';
import { SoundManager } from './SoundManager.js';
import { perf } from '../core/Perf.js';

const PLAYER_TILE_ALIGNMENT_OFFSET = (CHARACTER_DISPLAY_SIZE - 32) / 2;
const PLAYER_ART_FOOT_INSET = 4;
const BOOM_COUNTDOWN_MS = 5000;
const BOOM_BLAST_RADIUS = 96;

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
    this.fireCharges = Number.isSafeInteger(campaignProgress.fireCharges) &&
      campaignProgress.fireCharges >= 0
      ? campaignProgress.fireCharges
      : campaignProgress.hasFire === true ? 5 : 0;
    this.hasFire = this.fireCharges > 0;
    this.bombCharges = Number.isSafeInteger(campaignProgress.bombCharges) &&
      campaignProgress.bombCharges >= 0
      ? campaignProgress.bombCharges
      : 0;
    this.tntCharges = Number.isSafeInteger(campaignProgress.tntCharges) &&
      campaignProgress.tntCharges >= 0
      ? campaignProgress.tntCharges
      : 0;
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
    this.bombs = [];
    this.tnts = [];
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

  // Only the artwork this level can actually show is loaded. Decoded images are the
  // largest part of the memory a level uses, so unused creatures and variants are skipped.
  collectUsedAssets() {
    const snapshot = this.worldSnapshot;
    const types = new Set(['Player', 'Coin', ...POWER_UP_TYPES]);
    const variants = new Set();
    snapshot.tiles.forEach((row, rowIndex) => row.forEach((tileType, colIndex) => {
      if (!tileType) return;
      types.add(tileType);
      variants.add(`${tileType}--variant--${snapshot.tileVariants?.[rowIndex]?.[colIndex] || 'classic'}`);
    }));
    for (const type of POWER_UP_TYPES) {
      variants.add(`${type}--variant--${snapshot.selectedTileVariants?.[type] || 'classic'}`);
    }
    return { types, variants };
  }

  preload() {
    const snapshot = this.worldSnapshot;
    const { types, variants } = this.collectUsedAssets();
    let imageCount = 0;
    const loadImage = (key, url) => {
      imageCount++;
      this.load.image(key, url);
    };
    const loadSheet = (key, url, frameWidth, frameHeight) => {
      imageCount++;
      this.load.spritesheet(key, url, { frameWidth, frameHeight });
    };
    perf.start('game.preload');
    this.load.once('complete', () => perf.end('game.preload', { images: imageCount }));

    this.load.image('Pipe-body', pipeBodySprite);
    const bossId = snapshot.bossConfig?.type;
    if (types.has('Boss')) {
      for (const [id, dataUrl] of Object.entries(characterArt.bosses)) {
        if (id === bossId || id === 'slimeKing') loadImage(`Boss-${id}`, dataUrl);
      }
      for (const boss of snapshot.customBosses || []) {
        if (boss.id === bossId) loadImage(`Boss-${boss.id}`, boss.dataUrl);
      }
    }

    for (const [entityType, metadata] of Object.entries(snapshot.spriteMetadata || {})) {
      if (!types.has(entityType)) continue;
      if (metadata.dataUrl) {
        if (metadata.imageWidth && metadata.imageHeight) {
          loadSheet(
            entityType,
            metadata.dataUrl,
            metadata.frameWidth || metadata.imageWidth,
            metadata.frameHeight || metadata.imageHeight
          );
        } else {
          loadImage(entityType, metadata.dataUrl);
        }
      }
      for (const [animationType, animation] of Object.entries(metadata.animations || {})) {
        const key = `${entityType}-${animationType}`;
        if (animation.imageWidth && animation.imageHeight) {
          loadSheet(key, animation.dataUrl, animation.frameWidth, animation.frameHeight);
        } else {
          loadImage(key, animation.dataUrl);
        }
      }
    }

    for (const [tileType, tileVariants] of Object.entries(snapshot.tileVariantCatalog || {})) {
      tileVariants.forEach(variant => {
        const key = `${tileType}--variant--${variant.id}`;
        if (variant.dataUrl && variants.has(key)) loadImage(key, variant.dataUrl);
      });
    }

    for (const creepy of snapshot.customCreeps || []) {
      if (types.has(creepy.tileId)) loadImage(creepy.tileId, creepy.dataUrl);
    }
  }

  create() {
    perf.start('game.create');
    const tileSize = 32;
    const worldWidth = this.worldSnapshot.cols * tileSize;
    const worldHeight = this.worldSnapshot.rows * tileSize;
    this.entityFactory.createTextures(this);
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(1.35);
    this.createBackdrop();
    this.createHazardTextures();

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
    this.environmentHazards = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    const movingPlatforms = this.physics.add.group();
    const animatedEntities = [];
    this.rotatingFirebars = [];
    this.fireGeysers = [];
    let spawnPoint = null;

    const customCreepsByTile = new Map(
      (this.worldSnapshot.customCreeps || []).map(creepy => [creepy.tileId, creepy])
    );
    const creepyTypesById = new Map(CREEPY_TYPES.map(type => [type.id, type]));
    const variantsByTile = new Map(Object.entries(this.worldSnapshot.tileVariantCatalog || {})
      .map(([type, list]) => [type, new Map(list.map(item => [item.id, item]))]));
    this.worldSnapshot.tiles.forEach((row, rowIndex) => {
      row.forEach((tileType, colIndex) => {
        if (!tileType) return;
        const x = colIndex * tileSize + tileSize / 2;
        const y = rowIndex * tileSize + tileSize / 2;
        if (tileType === 'Player') {
          spawnPoint = { x, y: y - PLAYER_TILE_ALIGNMENT_OFFSET };
          return;
        }
        if (tileType === 'RotatingFirebar') {
          this.createRotatingFirebar(x, y, rowIndex, colIndex);
          return;
        }
        if (tileType === 'FireGeyser') {
          this.createFireGeyser(x, y, rowIndex, colIndex);
          return;
        }
        const animations = this.worldSnapshot.spriteMetadata?.[tileType]?.animations || {};
        const animationType = animations.idle ? 'idle' : animations.walk ? 'walk' : null;
        const customCreepy = customCreepsByTile.get(tileType);
        const isCreepy = creepyTypesById.has(tileType) || customCreepy;
        const defaultConfig = creepyTypesById.get(tileType) ||
          { movement: 'ground', speed: 45, health: 1 };
        const config = this.worldSnapshot.creepyConfigs?.[tileType] || defaultConfig;
        const flying = config.movement === 'flying';
        const variantId = this.worldSnapshot.tileVariants?.[rowIndex]?.[colIndex] || 'classic';
        const variant = variantsByTile.get(tileType)?.get(variantId);
        const legacyCustomSprite = variantId === 'classic' &&
          this.worldSnapshot.spriteMetadata?.[tileType]?.fileName;
        const isDefaultPipeBody = tileType === 'Pipe' && rowIndex > 0 &&
          this.worldSnapshot.tiles[rowIndex - 1][colIndex] === 'Pipe' &&
          variantId === 'classic' && !legacyCustomSprite;
        const createOptions = {
          bossConfig: this.worldSnapshot.bossConfig,
          textureKey: isDefaultPipeBody
            ? 'Pipe-body'
            : legacyCustomSprite
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
          entity.setData('pipeRow', rowIndex);
          entity.setData('pipeCol', colIndex);
          pipes.add(entity);
        } else if ([
          'Ground', 'Sand', 'Stone', 'Steel', 'Snow', 'Brick', 'MysteryBox', 'Spring', 'OneWayPlatform'
        ].includes(tileType)) {
          platforms.add(entity);
        } else if (tileType === 'Lava') {
          platforms.add(entity);
          const bubble = this.add.circle(x - 7, y - 11, 2, 0xffdd68).setDepth(4);
          this.tweens.add({
            targets: bubble,
            y: y - 25,
            alpha: 0,
            yoyo: true,
            duration: 720 + (colIndex % 4) * 90,
            repeat: -1,
            delay: (colIndex % 3) * 160
          });
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
        } else if (POWER_UP_TYPES.includes(tileType)) {
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
    this.createFireIndicator();
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
    this.physics.add.overlap(
      this.player,
      this.environmentHazards,
      this.handleEnvironmentalHazard,
      undefined,
      this
    );
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
    perf.end('game.create', {
      tiles: this.worldSnapshot.cols * this.worldSnapshot.rows,
      objects: this.children.length,
      textures: this.textures.getTextureKeys().length
    });
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
    if (!this.player?.active || this.gameEnded) return;
    this.updateBombs();
    if (this.gameEnded || this.isRespawning) return;
    if (this.starPowerUntil && this.time.now >= this.starPowerUntil) {
      this.starPowerUntil = 0;
      this.player.clearTint();
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
    const touchBombPressed = this.touchState.placeBombRequested;
    this.touchState.placeBombRequested = false;
    if (touchBombPressed) this.dropExplosiveAtPlayer();
    if (Input.Keyboard.JustDown(this.keys.shootX) ||
      Input.Keyboard.JustDown(this.keys.shootJ) || touchShootPressed) {
      // Fire detonates planted TNT first; otherwise it shoots a fireball.
      if (this.tnts.length) this.detonateTnt();
      else this.shootFireball();
    }
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
    this.updateEnvironmentalHazards();
    this.updateFireIndicator();
  }

  tryUsePipe(direction) {
    if (!this.worldSnapshot.pipeLinks?.length || !this.pipes?.getChildren().length) return false;
    const playerBody = this.player.body;
    const playerBounds = {
      left: playerBody.left,
      right: playerBody.right,
      top: playerBody.top,
      bottom: playerBody.bottom
    };
    const link = this.worldSnapshot.pipeLinks.find(({ source, destination }) => {
      const endpoint = direction === 'down' ? source : destination;
      const pipe = this.pipes.getChildren().find(item =>
        item.active && item.getData('pipeRow') === endpoint.row &&
        item.getData('pipeCol') === endpoint.col
      );
      if (!pipe?.body) return false;
      const pipeBody = pipe.body;
      if (direction === 'down') {
        return Math.abs(playerBounds.bottom - pipeBody.top) <= 12 &&
          playerBounds.right > pipeBody.left + 3 &&
          playerBounds.left < pipeBody.right - 3;
      }
      let tubeBottom = pipeBody.bottom;
      for (let row = endpoint.row + 1; ; row += 1) {
        const segment = this.pipes.getChildren().find(item =>
          item.active && item.getData('pipeRow') === row &&
          item.getData('pipeCol') === endpoint.col
        );
        if (!segment?.body) break;
        tubeBottom = segment.body.bottom;
      }
      const verticalOverlap = playerBounds.bottom > pipeBody.top + 4 &&
        playerBounds.top < tubeBottom - 4;
      const horizontalGap = Math.max(
        pipeBody.left - playerBounds.right,
        playerBounds.left - pipeBody.right,
        0
      );
      return verticalOverlap && horizontalGap <= 14;
    });
    if (!link) return false;

    const from = direction === 'down' ? link.source : link.destination;
    const to = direction === 'down' ? link.destination : link.source;
    const sourcePipe = this.pipes.getChildren().find(pipe =>
      pipe.getData('pipeRow') === from.row && pipe.getData('pipeCol') === from.col
    );
    const targetPipe = this.pipes.getChildren().find(pipe =>
      pipe.getData('pipeRow') === to.row && pipe.getData('pipeCol') === to.col
    );
    if (!sourcePipe?.body || !targetPipe?.body) return false;

    this.gameEnded = true;
    const player = this.player;
    const camera = this.cameras.main;
    const playerBottomOffset = player.body.bottom - player.y;
    let targetY = targetPipe.body.top - playerBottomOffset;
    let targetX = targetPipe.x;
    if (direction === 'up') {
      let tubeBottomRow = to.row;
      while (this.worldSnapshot.tiles[tubeBottomRow + 1]?.[to.col] === 'Pipe') {
        tubeBottomRow += 1;
      }
      const adjacentCol = to.col + 1 < this.worldSnapshot.cols ? to.col + 1 : to.col - 1;
      targetX = adjacentCol * 32 + 16;
      targetY = (tubeBottomRow + 1) * 32 - playerBottomOffset;
    }
    camera.stopFollow();
    player.setVelocity(0, 0);
    player.body.enable = false;
    this.tweens.add({
      targets: player,
      y: player.y + (direction === 'down' ? 38 : -34),
      alpha: 0,
      duration: 760,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        player.setPosition(targetX, targetY + 36);
        player.body.reset(player.x, player.y);
        const viewWidth = camera.width / camera.zoom;
        const viewHeight = camera.height / camera.zoom;
        const scrollX = Math.max(0, Math.min(
          targetX - viewWidth / 2,
          this.worldSnapshot.cols * 32 - viewWidth
        ));
        const scrollY = Math.max(0, Math.min(
          targetY - viewHeight / 2,
          this.worldSnapshot.rows * 32 - viewHeight
        ));
        this.tweens.add({
          targets: camera,
          scrollX,
          scrollY,
          duration: 1900,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.tweens.add({
              targets: player,
              y: targetY,
              alpha: 1,
              duration: 780,
              ease: 'Cubic.easeOut',
              onComplete: () => {
                player.body.enable = true;
                player.body.reset(player.x, player.y);
                camera.startFollow(player, true, 0.08, 0.08);
                this.gameEnded = false;
              }
            });
          }
        });
      }
    });
    return true;
  }

  updateBoss(boss) {
    if (!boss?.active || !boss.body?.enable || boss.getData('health') <= 0) return;
    // Bosses are clamped to the world bounds, so resting on the bottom edge means no ground is left.
    if (boss.body.bottom >= this.worldSnapshot.rows * 32 - 1 || boss.y > this.worldSnapshot.rows * 32) {
      this.damageBoss(boss, boss.getData('health'), true);
      return;
    }
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
    if (tileType === 'Lava') {
      this.damagePlayer(player);
      return;
    }
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
      this.fireCharges = 0;
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
    const variantId = this.worldSnapshot.selectedTileVariants?.[rewardType] || 'classic';
    const textureKey = `${rewardType}--variant--${variantId}`;
    const item = this.entityFactory.create(this, rewardType, block.x, block.y - 20, {
      textureKey: this.textures.exists(textureKey) ? textureKey : undefined
    });
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
      FireFlower: 0xff8a4c,
      BoomFlower: 0xf3a43b,
      TNTFlower: 0xe2463a
    };
    this.emitBurst(item.x, item.y, powerUpColors[powerUpType] || 0xffffff, 12, 34);
    item.destroy();
    this.soundManager.play('powerUp');

    if (powerUpType === 'Mushroom') {
      this.mushroomGrowth += 1;
      this.applyMushroomGrowth();
    } else if (powerUpType === 'FireFlower') {
      this.fireCharges += 5;
      this.hasFire = true;
    } else if (powerUpType === 'BoomFlower') {
      this.bombCharges += 5;
    } else if (powerUpType === 'TNTFlower') {
      this.tntCharges += 5;
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

  damageEnemy(enemy, ignoreHurtCooldown = false) {
    if (!enemy?.active ||
      (!ignoreHurtCooldown && this.time.now < enemy.getData('hurtUntil'))) return;
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

  damageBoss(boss, damage = 1, ignoreHurtCooldown = false) {
    if (!boss.active || boss.getData('health') <= 0 ||
      (!ignoreHurtCooldown && this.time.now < boss.getData('hurtUntil'))) return;
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

  damagePlayer(player, forceLifeLoss = false) {
    if ((!forceLifeLoss && this.time.now < this.invulnerableUntil) || this.gameEnded) return;
    this.invulnerableUntil = this.time.now + 1000;
    if (forceLifeLoss) {
      this.lives -= 1;
    } else if (this.hasFire) {
      this.hasFire = false;
      this.fireCharges = 0;
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
        { x: 0.72, y: 0.39 }, { x: 0.88, y: 0.29 }, { x: 0.12, y: 0.52 },
        { x: 0.31, y: 0.57 }, { x: 0.51, y: 0.5 }, { x: 0.7, y: 0.56 },
        { x: 0.9, y: 0.48 }, { x: 0.22, y: 0.72 }, { x: 0.45, y: 0.68 },
        { x: 0.68, y: 0.72 }, { x: 0.84, y: 0.66 }, { x: 0.52, y: 0.83 }
      ]
      : [
        { x: 0.2, y: 0.22 }, { x: 0.42, y: 0.16 }, { x: 0.66, y: 0.2 },
        { x: 0.84, y: 0.27 }, { x: 0.28, y: 0.42 }, { x: 0.52, y: 0.35 },
        { x: 0.74, y: 0.43 }, { x: 0.15, y: 0.6 }, { x: 0.48, y: 0.58 },
        { x: 0.82, y: 0.62 }
      ];
    burstPoints.forEach((point, index) => {
      this.time.delayedCall(index * (this.isCampaignFinal ? 220 : 190), () => {
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
    this.time.delayedCall(this.isCampaignFinal ? 5200 : 3000, () => this.finishGame(true));
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
      fireCharges: this.fireCharges,
      bombCharges: this.bombCharges,
      tntCharges: this.tntCharges,
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
    if (this.hasFire) powers.push(`Fire ×${this.fireCharges}`);
    if (this.bombCharges > 0) powers.push(`Bomb ×${this.bombCharges}`);
    if (this.tntCharges > 0 || this.tnts?.length) powers.push(`TNT ×${this.tntCharges}`);
    if (hasStar) powers.push('Star');
    this.powerLabel = powers.length ? powers.join(' + ') : 'Normal';
  }

  shootFireball() {
    if (this.fireCharges <= 0 || this.time.now < this.fireCooldownUntil || this.gameEnded) return;
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
    this.fireCharges -= 1;
    this.hasFire = this.fireCharges > 0;
    this.emitBurst(projectile.x, projectile.y, 0xffb94d, 5, 16, 220);
    this.soundManager.play('fireball');
    this.updateHud();
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
    this.updateFireIndicator();
    this.scoreLabel.setText(
      `Coins: ${this.score}  Best: ${this.bestScore}  Lives: ${this.lives}\nPower: ${this.powerLabel}${this.bossHudHint ? `\n${this.bossHudHint}` : ''}`
    );
  }

  createFireIndicator() {
    const createIndicator = (type, color) => {
      const container = this.add.container(0, 0).setDepth(20);
      const icon = this.add.graphics();
      icon.fillStyle(0x173b4a, 0.98);
      icon.fillCircle(0, 0, 13);
      icon.lineStyle(2.5, 0xffffff, 1);
      icon.strokeCircle(0, 0, 13);
      if (type === 'fire') {
        icon.fillStyle(color, 1);
        icon.beginPath();
        icon.moveTo(0, -9);
        icon.lineTo(7, 0);
        icon.lineTo(5, 6);
        icon.lineTo(0, 9);
        icon.lineTo(-5, 6);
        icon.lineTo(-7, 0);
        icon.closePath();
        icon.fillPath();
        icon.fillStyle(0xffe27a, 1);
        icon.fillCircle(0, 3, 3);
      } else if (type === 'tnt') {
        icon.fillStyle(color, 1);
        icon.fillRoundedRect(-4, -8, 8, 16, 2);
        icon.fillStyle(0xffe9c0, 1);
        icon.fillRect(-4, -2, 8, 3);
        icon.lineStyle(2, 0xffb24c, 1);
        icon.lineBetween(0, -8, 4, -12);
      } else {
        icon.fillStyle(0x263849, 1);
        icon.fillCircle(0, 1, 7);
        icon.lineStyle(2, 0xffb24c, 1);
        icon.lineBetween(4, -5, 8, -10);
        icon.fillStyle(0xffe27a, 1);
        icon.fillCircle(9, -11, 2);
      }
      const countBadge = this.add.circle(10, 10, 8, 0x173b4a)
        .setStrokeStyle(2, 0xffffff, 1);
      const count = this.add.text(10, 10, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
      container.add([icon, countBadge, count]);
      return { container, count };
    };
    const fire = createIndicator('fire', 0xff7848);
    const bomb = createIndicator('bomb', 0xf3a43b);
    this.fireIndicator = fire.container;
    this.fireIndicatorCount = fire.count;
    const tnt = createIndicator('tnt', 0xe2463a);
    this.bombIndicator = bomb.container;
    this.bombIndicatorCount = bomb.count;
    this.tntIndicator = tnt.container;
    this.tntIndicatorCount = tnt.count;
    this.updateFireIndicator();
  }

  updateFireIndicator() {
    if (!this.fireIndicator || !this.player?.body) return;
    this.fireIndicator.setVisible(this.fireCharges > 0);
    this.fireIndicatorCount.setText(this.fireCharges > 99 ? '99+' : String(this.fireCharges));
    this.bombIndicator.setVisible(this.bombCharges > 0);
    this.bombIndicatorCount.setText(this.bombCharges > 99 ? '99+' : String(this.bombCharges));
    this.tntIndicator.setVisible(this.tntCharges > 0 || this.tnts.length > 0);
    this.tntIndicatorCount.setText(this.tnts.length ? `▶${this.tnts.length}` : String(this.tntCharges));
    this.tntIndicator.setPosition(this.player.x, this.player.y - 30);
    const handSide = this.player.flipX ? -1 : 1;
    const badgeY = this.player.y + 8;
    this.fireIndicator.setPosition(this.player.x + handSide * 18, badgeY);
    this.bombIndicator.setPosition(
      this.player.x - handSide * (this.fireCharges > 0 ? 18 : -18),
      badgeY
    );
  }

  // The drop control plants a timed Boom bomb when one is available, otherwise TNT.
  dropExplosiveAtPlayer() {
    if (this.gameEnded || !this.player?.active) return;
    if (this.bombCharges > 0) this.dropBombAtPlayer();
    else this.placeTnt(this.player.x, this.player.body.bottom - 12);
  }

  dropBombAtPlayer() {
    if (this.bombCharges <= 0 || this.gameEnded || !this.player?.active) return;
    this.placeBomb(this.player.x, this.player.body.bottom - 12);
  }

  placeTnt(x, y) {
    if (this.tntCharges <= 0 || this.gameEnded) return;
    const container = this.add.container(x, y).setDepth(10);
    const stick = this.add.rectangle(0, 0, 18, 24, 0xe2463a).setStrokeStyle(2, 0x7a2118, 1);
    const band = this.add.rectangle(0, 0, 18, 8, 0xffe9c0);
    const label = this.add.text(0, 0, 'TNT', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '7px',
      fontStyle: 'bold',
      color: '#7a2118'
    }).setOrigin(0.5);
    const fuse = this.add.graphics();
    fuse.lineStyle(3, 0xf3a43b, 1);
    fuse.lineBetween(0, -12, 5, -18);
    fuse.fillStyle(0xffe27a, 1);
    fuse.fillCircle(6, -19, 3);
    container.add([stick, band, label, fuse]);
    this.tweens.add({
      targets: container,
      scale: 1.12,
      yoyo: true,
      repeat: -1,
      duration: 380
    });
    this.tnts.push({ x, y, container });
    this.tntCharges -= 1;
    this.updateHud();
  }

  detonateTnt() {
    if (!this.tnts.length || this.gameEnded) return;
    const planted = this.tnts;
    this.tnts = [];
    planted.forEach(tnt => {
      this.tweens.killTweensOf(tnt.container);
      tnt.container.destroy();
      this.explodeBomb(tnt.x, tnt.y);
    });
    this.updateHud();
  }

  placeBomb(x, y) {
    if (this.bombCharges <= 0 || this.gameEnded) return;
    const container = this.add.container(x, y).setDepth(10);
    const body = this.add.circle(0, 0, 12, 0x263849)
      .setStrokeStyle(2, 0x101b23, 1);
    const highlight = this.add.circle(-4, -4, 3, 0xc6d7dc);
    const fuse = this.add.graphics();
    fuse.lineStyle(3, 0xf3a43b, 1);
    fuse.lineBetween(5, -8, 10, -14);
    fuse.fillStyle(0xffe27a, 1);
    fuse.fillCircle(11, -15, 3);
    const countdown = this.add.text(0, -22, '5', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#263849',
      strokeThickness: 4
    }).setOrigin(0.5);
    container.add([body, highlight, fuse, countdown]);
    this.bombs.push({
      x,
      y,
      plantedAt: this.time.now,
      container,
      countdown,
      lastShownSecond: 5
    });
    this.bombCharges -= 1;
    this.updateHud();
  }

  updateBombs() {
    if (!this.bombs?.length) return;
    for (let index = this.bombs.length - 1; index >= 0; index -= 1) {
      const bomb = this.bombs[index];
      const elapsed = this.time.now - bomb.plantedAt;
      const secondsLeft = Math.max(0, Math.ceil((BOOM_COUNTDOWN_MS - elapsed) / 1000));
      if (secondsLeft !== bomb.lastShownSecond) {
        bomb.lastShownSecond = secondsLeft;
        bomb.countdown.setText(String(secondsLeft));
      }
      const pulse = 1 + (1 - secondsLeft / 5) * 0.18;
      bomb.container.setScale(pulse);
      if (elapsed < BOOM_COUNTDOWN_MS) continue;
      bomb.container.destroy();
      this.bombs.splice(index, 1);
      this.explodeBomb(bomb.x, bomb.y);
    }
  }

  explodeBomb(x, y) {
    const ring = this.add.circle(x, y, 16, 0xff7438, 0.3)
      .setStrokeStyle(7, 0xffdc70, 1)
      .setDepth(12);
    this.tweens.add({
      targets: ring,
      scale: BOOM_BLAST_RADIUS / 16,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });
    this.emitBurst(x, y, 0xff9a43, 26, BOOM_BLAST_RADIUS, 420);
    this.cameras.main.shake(180, 0.009);
    this.soundManager.play('brickBreak');

    const inBlast = entity => {
      if (!entity?.active) return false;
      const bounds = entity.body || {
        left: entity.x,
        right: entity.x,
        top: entity.y,
        bottom: entity.y
      };
      const dx = Math.max(bounds.left - x, 0, x - bounds.right);
      const dy = Math.max(bounds.top - y, 0, y - bounds.bottom);
      return Math.hypot(dx, dy) <= BOOM_BLAST_RADIUS;
    };

    if (inBlast(this.player)) this.damagePlayer(this.player, true);
    [...this.enemies.getChildren(), ...this.flyingEnemies.getChildren()]
      .filter(inBlast)
      .forEach(enemy => this.damageEnemy(enemy, true));
    this.bosses.getChildren()
      .filter(inBlast)
      .forEach(boss => this.damageBoss(boss, 1, true));

    const terrainTypes = new Set(['Ground', 'Sand', 'Stone', 'Snow', 'Brick']);
    this.platforms.getChildren().slice().forEach(block => {
      if (!inBlast(block)) return;
      const tileType = block.getData('tileType');
      if (tileType === 'MysteryBox' && !block.getData('used')) {
        block.setData('used', true);
        block.setTint(0x777777);
        this.score += 1;
        this.updateScore();
        this.soundManager.play('mysteryBox');
        this.emitBurst(block.x, block.y, 0xf6c776, 8, 24);
        this.spawnPowerUp(block);
      } else if (terrainTypes.has(tileType)) {
        block.body.enable = false;
        this.emitBurst(block.x, block.y, 0xd89562, 8, 24, 300);
        block.destroy();
      }
    });
    this.updateHud();
  }

  createHazardTextures() {
    if (this.textures.exists('HazardFireOrb')) return;
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xd83b25, 1);
    graphics.fillCircle(16, 16, 15);
    graphics.fillStyle(0xff7b2c, 1);
    graphics.fillCircle(16, 17, 11);
    graphics.fillStyle(0xffd64f, 1);
    graphics.fillCircle(16, 18, 7);
    graphics.fillStyle(0xffffc2, 0.95);
    graphics.fillCircle(12, 12, 3);
    graphics.generateTexture('HazardFireOrb', 32, 32);
    graphics.destroy();
  }

  createHazardOrb(x, y, size = 22) {
    const orb = this.physics.add.image(x, y, 'HazardFireOrb')
      .setDisplaySize(size, size)
      .setDepth(5);
    orb.body.setAllowGravity(false);
    orb.body.setImmovable(true);
    orb.body.setCircle(size / 2);
    this.environmentHazards.add(orb);
    return orb;
  }

  createRotatingFirebar(x, y, row, col) {
    const arm = this.add.graphics().setDepth(4);
    const anchor = this.add.graphics().setDepth(6);
    anchor.fillStyle(0x46525e, 1);
    anchor.fillRoundedRect(x - 12, y - 12, 24, 24, 3);
    anchor.lineStyle(2, 0xd5dce2, 1);
    anchor.strokeRoundedRect(x - 10, y - 10, 20, 20, 2);
    anchor.fillStyle(0xc73527, 1);
    anchor.fillCircle(x, y, 5);
    anchor.fillStyle(0xffd36b, 1);
    anchor.fillCircle(x - 1, y - 1, 2);
    const flames = Array.from({ length: 6 }, (_, index) =>
      this.createHazardOrb(x + (index + 1) * 22, y, 20)
    );
    this.rotatingFirebars.push({
      x,
      y,
      row,
      col,
      arm,
      flames,
      startAngle: ((row + col) % 2) * Math.PI,
      rotationSpeed: (col % 2 ? -1 : 1) * 0.9
    });
  }

  createFireGeyser(x, y, row, col) {
    const baseY = y + 16;
    const nozzle = this.add.graphics().setDepth(4);
    const flames = Array.from({ length: 6 }, (_, index) =>
      this.createHazardOrb(x, baseY - 12 - index * 21, 24)
    );
    flames.forEach(flame => {
      flame.setVisible(false);
      flame.body.enable = false;
    });
    this.fireGeysers.push({
      x,
      row,
      col,
      baseY,
      nozzle,
      flames,
      phaseOffset: (col * 613 + row * 271) % 4300,
      period: 4300,
      warningDuration: 1050,
      eruptionDuration: 1350
    });
  }

  updateEnvironmentalHazards() {
    const now = this.time.now;
    this.rotatingFirebars.forEach(bar => {
      const angle = bar.startAngle + now / 1000 * bar.rotationSpeed;
      const endX = bar.x + Math.cos(angle) * (bar.flames.length * 22);
      const endY = bar.y + Math.sin(angle) * (bar.flames.length * 22);
      bar.arm.clear();
      bar.arm.lineStyle(4, 0x5a4a48, 1);
      bar.arm.lineBetween(bar.x, bar.y, endX, endY);
      bar.arm.lineStyle(1.5, 0xffc15b, 0.8);
      bar.arm.lineBetween(bar.x, bar.y, endX, endY);
      bar.flames.forEach((flame, index) => {
        const distance = (index + 1) * 22;
        const flicker = 1 + Math.sin(now / 90 + index * 2) * 0.08;
        flame.setPosition(
          bar.x + Math.cos(angle) * distance,
          bar.y + Math.sin(angle) * distance
        ).setScale(flicker * 0.62);
        flame.body.updateFromGameObject();
      });
    });

    this.fireGeysers.forEach(geyser => {
      const phase = (now + geyser.phaseOffset) % geyser.period;
      const warning = phase < geyser.warningDuration;
      const erupting = phase >= geyser.warningDuration &&
        phase < geyser.warningDuration + geyser.eruptionDuration;
      const pulse = 0.5 + Math.sin(now / 75) * 0.5;
      geyser.nozzle.clear();
      geyser.nozzle.fillStyle(0x46525e, 1);
      geyser.nozzle.fillRoundedRect(geyser.x - 15, geyser.baseY - 13, 30, 13, 3);
      geyser.nozzle.lineStyle(2, 0xc2cbd2, 1);
      geyser.nozzle.strokeRoundedRect(geyser.x - 15, geyser.baseY - 13, 30, 13, 3);
      geyser.nozzle.fillStyle(warning ? 0xffa33b : 0x242b31, warning ? 0.6 + pulse * 0.4 : 1);
      geyser.nozzle.fillRoundedRect(geyser.x - 8, geyser.baseY - 12, 16, 5, 2);
      if (warning) {
        geyser.nozzle.fillStyle(0xff9a32, 0.25 + pulse * 0.35);
        geyser.nozzle.fillCircle(geyser.x, geyser.baseY - 15, 11 + pulse * 5);
      }

      geyser.flames.forEach((flame, index) => {
        flame.setVisible(erupting);
        flame.body.enable = erupting;
        if (!erupting) return;
        const flicker = Math.sin(now / 80 + index * 1.8);
        flame.setPosition(
          geyser.x + flicker * 3,
          geyser.baseY - 12 - index * 21 - Math.max(0, flicker) * 5
        );
        flame.body.updateFromGameObject();
      });
    });
  }

  handleEnvironmentalHazard(player, hazard) {
    if (hazard.active && hazard.body?.enable && !this.gameEnded) {
      this.damagePlayer(player);
    }
  }
}
