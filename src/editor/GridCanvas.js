const TILE_COLORS = {
  Ground: '#58a65c',
  Brick: '#b9683f',
  MysteryBox: '#e0aa28',
  Pipe: '#308c62',
  Spring: '#d86783',
  MovingPlatform: '#4c86b8',
  OneWayPlatform: '#b98b52',
  Switch: '#e08b48',
  Door: '#765b90',
  Checkpoint: '#43a5a1',
  Goomba: '#a94b38',
  Koopa: '#4f9b59',
  Bat: '#64558f',
  Coin: '#f0c84b',
  Flag: '#378bd0',
  Player: '#347bd1',
  Mushroom: '#e47759',
  Star: '#f1ad3e',
  ExtraLife: '#e76568',
  FireFlower: '#ed7645'
};

const TILE_LABELS = {
  Ground: '',
  Brick: '▦',
  MysteryBox: '?',
  Pipe: '▤',
  Spring: '↟',
  MovingPlatform: '↔',
  OneWayPlatform: '━',
  Switch: '●',
  Door: '▥',
  Checkpoint: '⚑',
  Goomba: '●',
  Koopa: 'K',
  Bat: 'B',
  Coin: '●',
  Flag: '⚑',
  Player: '●',
  Mushroom: 'M',
  Star: '★',
  ExtraLife: '+',
  FireFlower: 'F'
};

export class GridCanvas {
  constructor(canvasId, stateManager, eventBus) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`Canvas element "${canvasId}" was not found.`);
    this.stateManager = stateManager;
    this.eventBus = eventBus;
    this.context = this.canvas.getContext('2d');
    if (!this.context) throw new Error('A 2D canvas context is unavailable.');
    this.spriteImages = new Map();
    this.variantImages = new Map();
    this.isPainting = false;
    this.lastPaintedCell = '';
    this.bindEvents();
    this.eventBus.on('spriteAnimationUploaded', ({ entityType, animationType, dataUrl }) => {
      const hasIdle = this.stateManager.spriteMetadata[entityType]?.animations?.idle;
      if (animationType !== 'idle' && hasIdle) return;
      this.loadSprite(entityType, dataUrl);
    });
    this.refresh();
  }

  bindEvents() {
    this.canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      this.isPainting = true;
      this.canvas.setPointerCapture(event.pointerId);
      this.paintAt(event);
    });
    this.canvas.addEventListener('pointermove', event => {
      if (this.isPainting) this.paintAt(event);
    });
    this.canvas.addEventListener('pointerup', () => {
      this.isPainting = false;
      this.lastPaintedCell = '';
    });
    this.canvas.addEventListener('pointercancel', () => {
      this.isPainting = false;
      this.lastPaintedCell = '';
    });
    this.canvas.addEventListener('contextmenu', event => event.preventDefault());
    this.eventBus.on('spriteUploaded', ({ tileId, dataUrl }) => this.loadSprite(tileId, dataUrl));
    this.eventBus.on('tileVariantsChanged', ({ catalog = {} } = {}) => {
      for (const [tileType, variants] of Object.entries(catalog)) {
        variants.forEach(variant => {
          if (variant.dataUrl) this.loadSpriteVariant(tileType, variant);
        });
      }
    });
  }

  paintAt(event) {
    const bounds = this.canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * this.canvas.width / bounds.width;
    const y = (event.clientY - bounds.top) * this.canvas.height / bounds.height;
    const cell = this.stateManager.getTileFromPixel(x, y);
    if (!cell) return;
    const key = `${cell.row}:${cell.col}`;
    if (this.lastPaintedCell === key) return;
    this.lastPaintedCell = key;
    this.eventBus.emit('paintTile', cell);
  }

  loadSprite(tileId, dataUrl) {
    const image = new Image();
    image.onload = () => {
      this.spriteImages.set(tileId, image);
      this.refresh();
    };
    image.onerror = () => this.eventBus.emit('status', `Could not display the uploaded ${tileId} image.`);
    image.src = dataUrl;
  }

  loadSpriteVariant(tileType, variant) {
    const key = `${tileType}:${variant.id}`;
    if (this.variantImages.has(key)) return;
    const image = new Image();
    image.onload = () => {
      this.variantImages.set(key, image);
      this.refresh();
    };
    image.onerror = () => this.eventBus.emit('status', `Could not display the ${variant.name} ${tileType} image.`);
    image.src = variant.dataUrl;
  }

  updateCanvasSize() {
    const { width, height } = this.stateManager.getWorldSize();
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  refresh() {
    this.updateCanvasSize();
    const ctx = this.context;
    const tileSize = this.stateManager.tileSize;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackdrop(ctx);

    for (let row = 0; row < this.stateManager.rows; row++) {
      for (let col = 0; col < this.stateManager.cols; col++) {
        const type = this.stateManager.getTile(row, col);
        const x = col * tileSize;
        const y = row * tileSize;
        if (type) {
          this.drawTile(ctx, type, x, y, tileSize);
          if (type === 'MysteryBox') this.drawRewardBadge(ctx, x, y, tileSize);
        }
      }
    }

  }

  drawRewardBadge(ctx, x, y, tileSize) {
    const reward = this.stateManager.mysteryBoxReward || 'Mushroom';
    const colors = { Mushroom: '#e47759', Star: '#f1ad3e', ExtraLife: '#e76568' };
    ctx.beginPath();
    ctx.arc(x + tileSize - 5, y + tileSize - 5, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff8e6';
    ctx.fill();
    ctx.strokeStyle = '#604b45';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = colors[reward] || colors.Mushroom;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TILE_LABELS[reward], x + tileSize - 5, y + tileSize - 5);
  }

  drawBackdrop(ctx) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#9bd7e8');
    sky.addColorStop(0.68, '#d6e8d8');
    sky.addColorStop(1, '#e8d4a3');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#f8edc8';
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.24, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c1dfc8';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.68);
    for (let x = 0; x <= width; x += 256) {
      ctx.quadraticCurveTo(x + 128, height * 0.42, x + 256, height * 0.68);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    ctx.fillStyle = '#9bc99d';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.82);
    for (let x = 0; x <= width; x += 320) {
      ctx.quadraticCurveTo(x + 160, height * 0.6, x + 320, height * 0.82);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    ctx.fillStyle = 'rgb(255 255 255 / 55%)';
    for (let x = 90; x < width; x += 480) {
      const y = height * (0.2 + ((x / 480) % 2) * 0.15);
      ctx.fillRect(x, y + 8, 52, 12);
      ctx.fillRect(x + 12, y, 34, 10);
      ctx.fillRect(x + 24, y + 18, 22, 6);
    }
  }

  drawTile(ctx, type, x, y, tileSize) {
    const row = Math.floor(y / tileSize);
    const col = Math.floor(x / tileSize);
    const variantId = this.stateManager.getTileVariant(row, col);
    const variantMetadata = this.stateManager.tileVariantCatalog[type]
      ?.find(variant => variant.id === variantId);
    const spriteMetadata = this.stateManager.spriteMetadata[type];
    const legacyCustomSprite = variantId === 'classic' && spriteMetadata?.fileName;
    const image = legacyCustomSprite
      ? this.spriteImages.get(type)
      : this.variantImages.get(`${type}:${variantId}`) || this.spriteImages.get(type);
    const metadata = legacyCustomSprite
      ? spriteMetadata
      : variantMetadata?.dataUrl
      ? variantMetadata
      : spriteMetadata?.dataUrl
      ? spriteMetadata
      : spriteMetadata?.animations?.idle || Object.values(spriteMetadata?.animations || {})[0];
    if (image?.complete && image.naturalWidth) {
      const frameWidth = metadata?.frameWidth || image.naturalWidth;
      const frameHeight = metadata?.frameHeight || image.naturalHeight;
      ctx.drawImage(image, 0, 0, frameWidth, frameHeight, x, y, tileSize, tileSize);
      return;
    }

    ctx.fillStyle = TILE_COLORS[type] || '#85939c';
    if (type === 'OneWayPlatform') {
      ctx.fillStyle = '#795631';
      ctx.fillRect(x + 1, y + 6, tileSize - 2, 5);
      ctx.fillStyle = '#d1a96a';
      ctx.fillRect(x + 2, y + 3, tileSize - 4, 4);
    } else if (type === 'Spring') {
      ctx.fillStyle = '#70495a';
      ctx.fillRect(x + 3, y + 23, tileSize - 6, 6);
      ctx.strokeStyle = TILE_COLORS.Spring;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 22);
      ctx.lineTo(x + 13, y + 16);
      ctx.lineTo(x + 19, y + 22);
      ctx.lineTo(x + 24, y + 16);
      ctx.stroke();
      ctx.fillStyle = '#f6c2cd';
      ctx.fillRect(x + 4, y + 26, tileSize - 8, 3);
    } else if (type === 'MovingPlatform') {
      ctx.fillStyle = '#325c7c';
      ctx.fillRect(x - 15, y + 11, 62, 12);
      ctx.fillStyle = TILE_COLORS.MovingPlatform;
      ctx.fillRect(x - 13, y + 9, 58, 6);
      ctx.fillStyle = '#d5e9f7';
      ctx.fillRect(x - 8, y + 10, 48, 2);
    } else if (type === 'Door') {
      ctx.fillStyle = TILE_COLORS.Door;
      ctx.fillRect(x + 3, y + 2, tileSize - 6, tileSize - 4);
      ctx.fillStyle = '#c9b4d7';
      ctx.fillRect(x + 7, y + 8, tileSize - 14, tileSize - 11);
      ctx.fillStyle = '#765b90';
      ctx.beginPath();
      ctx.arc(x + tileSize - 11, y + 18, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'Switch') {
      ctx.fillStyle = '#70495a';
      ctx.fillRect(x + 3, y + 21, tileSize - 6, 8);
      ctx.fillStyle = '#f6c776';
      ctx.beginPath();
      ctx.arc(x + tileSize / 2, y + 17, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = TILE_COLORS.Switch;
      ctx.beginPath();
      ctx.arc(x + tileSize / 2, y + 17, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'Checkpoint') {
      ctx.fillStyle = '#5c5044';
      ctx.fillRect(x + 7, y + 5, 4, 25);
      ctx.fillStyle = TILE_COLORS.Checkpoint;
      ctx.beginPath();
      ctx.moveTo(x + 11, y + 6);
      ctx.lineTo(x + 27, y + 11);
      ctx.lineTo(x + 11, y + 16);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'FireFlower') {
      ctx.fillStyle = '#438a52';
      ctx.fillRect(x + 14, y + 17, 4, 12);
      ctx.fillStyle = '#56a65f';
      ctx.fillRect(x + 7, y + 21, 8, 4);
      ctx.fillRect(x + 17, y + 24, 8, 4);
      ctx.fillStyle = '#ed7645';
      ctx.beginPath();
      ctx.arc(x + 16, y + 12, 6, 0, Math.PI * 2);
      ctx.arc(x + 9, y + 15, 5, 0, Math.PI * 2);
      ctx.arc(x + 23, y + 15, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.arc(x + 16, y + 14, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'Ground' || type === 'Brick') {
      ctx.fillRect(x, y, tileSize, tileSize);
      if (type === 'Brick') {
        ctx.strokeStyle = 'rgba(255, 242, 220, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + tileSize / 2);
        ctx.lineTo(x + tileSize, y + tileSize / 2);
        ctx.moveTo(x + tileSize / 2, y);
        ctx.lineTo(x + tileSize / 2, y + tileSize / 2);
        ctx.moveTo(x + tileSize / 4, y + tileSize / 2);
        ctx.lineTo(x + tileSize / 4, y + tileSize);
        ctx.moveTo(x + tileSize * 3 / 4, y + tileSize / 2);
        ctx.lineTo(x + tileSize * 3 / 4, y + tileSize);
        ctx.stroke();
      }
    } else if (['Goomba', 'Koopa', 'Bat'].includes(type)) {
      ctx.fillStyle = TILE_COLORS[type];
      ctx.beginPath();
      if (type === 'Bat') {
        ctx.moveTo(x + 2, y + 9);
        ctx.lineTo(x + tileSize / 2, y + tileSize / 2);
        ctx.lineTo(x + tileSize - 2, y + 9);
        ctx.lineTo(x + tileSize - 5, y + tileSize - 4);
        ctx.lineTo(x + tileSize / 2, y + tileSize * 0.68);
        ctx.lineTo(x + 5, y + tileSize - 4);
        ctx.closePath();
      } else {
        ctx.ellipse(
          x + tileSize / 2,
          y + tileSize * 0.63,
          tileSize * 0.42,
          tileSize * 0.31,
          0,
          0,
          Math.PI * 2
        );
      }
      ctx.fill();
    } else if (type === 'Player') {
      ctx.fillStyle = TILE_COLORS[type];
      ctx.beginPath();
      ctx.roundRect(x + 7, y + 3, tileSize - 14, tileSize - 5, 7);
      ctx.fill();
    } else {
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
    }
    if (type === 'Coin') {
      ctx.beginPath();
      ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = '#ffdf62';
      ctx.fill();
      ctx.strokeStyle = '#bd8b16';
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(TILE_LABELS[type] || '', x + tileSize / 2, y + tileSize / 2 + 1);
    }
  }
}
