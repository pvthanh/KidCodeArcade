import { THEMED_TILE_TYPES, WORLD_THEMES } from '../core/StateManager.js';

const TILE_COLORS = {
  Ground: '#58a65c',
  Sand: '#d8b56b',
  Stone: '#788994',
  Snow: '#b8ddeb',
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
  Boss: '#9b4b96',
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
  Sand: '',
  Stone: '',
  Snow: '',
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
  Boss: '★',
  Coin: '●',
  Flag: '⚑',
  Player: '●',
  Random: '?',
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
    this.board = document.getElementById('editor-board');
    if (!this.board) throw new Error('The editor board was not found.');
    this.context = this.canvas.getContext('2d');
    if (!this.context) throw new Error('A 2D canvas context is unavailable.');
    this.tileTintCanvas = document.createElement('canvas');
    this.tileTintCanvas.width = this.stateManager.tileSize;
    this.tileTintCanvas.height = this.stateManager.tileSize;
    this.tileTintContext = this.tileTintCanvas.getContext('2d');
    if (!this.tileTintContext) throw new Error('A 2D tile preview context is unavailable.');
    this.spriteImages = new Map();
    this.variantImages = new Map();
    this.loadingSpriteIds = new Set();
    this.isPainting = false;
    this.isPanning = false;
    this.panMode = false;
    this.selectionMode = false;
    this.selectedCells = [];
    this.movePreview = null;
    this.linkDragSource = null;
    this.pointerPosition = null;
    this.isMovingSelection = false;
    this.isLinkingPipes = false;
    this.lastPanPosition = null;
    this.lastPaintedCell = '';
    this.bindEvents();
    this.eventBus.on('spriteAnimationUploaded', ({ entityType, animationType, dataUrl }) => {
      const hasIdle = this.stateManager.spriteMetadata[entityType]?.animations?.idle;
      if (animationType !== 'idle' && hasIdle) return;
      this.loadSprite(entityType, dataUrl);
    });
    this.eventBus.on('levelLoaded', ({ customCreeps = [] } = {}) => this.loadCreepySprites(customCreeps));
    this.eventBus.on('creepyTypesChanged', ({ customCreeps = [] } = {}) => this.loadCreepySprites(customCreeps));
    this.refresh();
  }

  loadCreepySprites(customCreeps) {
    customCreeps.forEach(creepy => this.loadSprite(creepy.tileId, creepy.dataUrl));
  }

  bindEvents() {
    this.canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      if (this.panMode) {
        event.preventDefault();
        this.isPanning = true;
        this.lastPanPosition = { x: event.clientX, y: event.clientY };
        this.canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (this.selectionMode) {
        this.beginSelectionGesture(event);
        return;
      }
      this.isPainting = true;
      this.canvas.setPointerCapture(event.pointerId);
      this.paintAt(event);
    });
    this.canvas.addEventListener('pointermove', event => {
      if (this.isPanning && this.lastPanPosition) {
        const deltaX = event.clientX - this.lastPanPosition.x;
        const deltaY = event.clientY - this.lastPanPosition.y;
        this.board.scrollLeft -= deltaX;
        this.board.scrollTop -= deltaY;
        this.lastPanPosition = { x: event.clientX, y: event.clientY };
        return;
      }
      if (this.isMovingSelection || this.isLinkingPipes) {
        this.updateSelectionGesture(event);
        return;
      }
      if (this.isPainting) this.paintAt(event);
    });
    this.canvas.addEventListener('pointerup', event => {
      if (this.isMovingSelection || this.isLinkingPipes) this.finishSelectionGesture(event);
      this.isPainting = false;
      this.isPanning = false;
      this.lastPanPosition = null;
      this.lastPaintedCell = '';
    });
    this.canvas.addEventListener('pointercancel', () => {
      this.isPainting = false;
      this.isPanning = false;
      this.lastPanPosition = null;
      this.lastPaintedCell = '';
      this.clearSelectionGesture();
      this.refresh();
    });
    this.canvas.addEventListener('lostpointercapture', () => {
      this.isPainting = false;
      this.isPanning = false;
      this.lastPanPosition = null;
      this.lastPaintedCell = '';
      this.clearSelectionGesture();
      this.refresh();
    });
    this.canvas.addEventListener('contextmenu', event => event.preventDefault());
    this.eventBus.on('boardPanModeChanged', enabled => {
      this.panMode = enabled;
      this.isPainting = false;
      this.isPanning = false;
      this.lastPanPosition = null;
      this.lastPaintedCell = '';
      this.board.classList.toggle('is-panning', enabled);
    });
    this.eventBus.on('selectionModeChanged', enabled => {
      this.selectionMode = enabled;
      this.selectedCells = [];
      this.clearSelectionGesture();
      this.board.classList.toggle('is-selecting', enabled);
      this.refresh();
    });
    this.eventBus.on('selectionMoved', ({ cells, deltaRow, deltaCol }) => {
      this.selectedCells = cells.map(cell => ({
        row: cell.row + deltaRow,
        col: cell.col + deltaCol
      }));
      this.refresh();
    });
    this.eventBus.on('levelLoaded', () => {
      this.selectedCells = [];
      this.clearSelectionGesture();
      this.refresh();
    });
    this.eventBus.on('spriteUploaded', ({ tileId, dataUrl }) => this.loadSprite(tileId, dataUrl));
    this.eventBus.on('creepyTypesChanged', ({ customCreeps = [] } = {}) => this.loadCreepySprites(customCreeps));
    this.eventBus.on('tileVariantsChanged', ({ catalog = {} } = {}) => {
      for (const [tileType, variants] of Object.entries(catalog)) {
        variants.forEach(variant => {
          if (variant.dataUrl) this.loadSpriteVariant(tileType, variant);
        });
      }
    });
  }

  paintAt(event) {
    const point = this.canvasPoint(event);
    const cell = this.stateManager.getTileFromPixel(point.x, point.y);
    if (!cell) return;
    const key = `${cell.row}:${cell.col}`;
    if (this.lastPaintedCell === key) return;
    this.lastPaintedCell = key;
    this.eventBus.emit('paintTile', cell);
  }

  canvasPoint(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * this.canvas.width / bounds.width,
      y: (event.clientY - bounds.top) * this.canvas.height / bounds.height
    };
  }

  pipeGroupAt(cell) {
    if (this.stateManager.getTile(cell.row, cell.col) !== 'Pipe') return [cell];
    let firstRow = cell.row;
    let lastRow = cell.row;
    while (this.stateManager.getTile(firstRow - 1, cell.col) === 'Pipe') firstRow -= 1;
    while (this.stateManager.getTile(lastRow + 1, cell.col) === 'Pipe') lastRow += 1;
    return Array.from({ length: lastRow - firstRow + 1 }, (_, index) => ({
      row: firstRow + index,
      col: cell.col
    }));
  }

  beginSelectionGesture(event) {
    const point = this.canvasPoint(event);
    const cell = this.stateManager.getTileFromPixel(point.x, point.y);
    if (!cell) return;
    const tileType = this.stateManager.getTile(cell.row, cell.col);
    if (!tileType) {
      this.selectedCells = [];
      this.refresh();
      return;
    }

    const nextSelection = this.pipeGroupAt(cell);
    this.selectedCells = nextSelection;
    const isPipe = tileType === 'Pipe';
    const groupBottom = nextSelection.at(-1);
    const handleX = (groupBottom.col + 1) * this.stateManager.tileSize - 7;
    const handleY = (groupBottom.row + 1) * this.stateManager.tileSize - 7;
    const onPipeHandle = isPipe &&
      Math.hypot(point.x - handleX, point.y - handleY) <= 11;
    const startCell = this.stateManager.getTileFromPixel(point.x, point.y);
    if (onPipeHandle) {
      this.isLinkingPipes = true;
      this.linkDragSource = { ...nextSelection[0] };
      this.pointerPosition = point;
    } else {
      this.isMovingSelection = true;
      this.moveStartCell = startCell;
      this.movePreview = { deltaRow: 0, deltaCol: 0 };
    }
    this.canvas.setPointerCapture(event.pointerId);
    this.refresh();
  }

  updateSelectionGesture(event) {
    const point = this.canvasPoint(event);
    this.pointerPosition = point;
    if (this.isMovingSelection && this.moveStartCell) {
      const cell = this.stateManager.getTileFromPixel(point.x, point.y);
      if (cell) {
        this.movePreview = {
          deltaRow: cell.row - this.moveStartCell.row,
          deltaCol: cell.col - this.moveStartCell.col
        };
      }
    }
    this.refresh();
  }

  finishSelectionGesture(event) {
    const point = this.canvasPoint(event);
    if (this.isLinkingPipes && this.linkDragSource) {
      const targetCell = this.stateManager.getTileFromPixel(point.x, point.y);
      if (targetCell && this.stateManager.getTile(targetCell.row, targetCell.col) === 'Pipe') {
        const target = this.pipeGroupAt(targetCell)[0];
        if (target.row !== this.linkDragSource.row || target.col !== this.linkDragSource.col) {
          this.eventBus.emit('pipeLinkRequested', {
            source: this.linkDragSource,
            destination: target
          });
        } else {
          this.eventBus.emit('status', 'Choose a different pipe for the connection.');
        }
      } else {
        this.eventBus.emit('status', 'Drop the pipe connection on another pipe.');
      }
    } else if (this.isMovingSelection && this.movePreview &&
      (this.movePreview.deltaRow || this.movePreview.deltaCol)) {
      const { deltaRow, deltaCol } = this.movePreview;
      const originalCells = this.selectedCells.map(cell => ({ ...cell }));
      this.eventBus.emit('moveTiles', {
        cells: originalCells,
        deltaRow,
        deltaCol
      });
    }
    this.clearSelectionGesture();
    this.refresh();
  }

  clearSelectionGesture() {
    this.isMovingSelection = false;
    this.isLinkingPipes = false;
    this.linkDragSource = null;
    this.pointerPosition = null;
    this.moveStartCell = null;
    this.movePreview = null;
  }

  loadSprite(tileId, dataUrl) {
    if (this.loadingSpriteIds.has(tileId)) return;
    this.loadingSpriteIds.add(tileId);
    const image = new Image();
    image.onload = () => {
      this.loadingSpriteIds.delete(tileId);
      this.spriteImages.set(tileId, image);
      this.refresh();
    };
    image.onerror = () => {
      this.loadingSpriteIds.delete(tileId);
      this.eventBus.emit('status', `Could not display the uploaded ${tileId} image.`);
    };
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
    this.theme = WORLD_THEMES.find(item => item.id === this.stateManager.worldTheme) || WORLD_THEMES[0];
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
    if (this.selectionMode) this.drawSelectionOverlay(ctx, tileSize);
  }

  drawSelectionOverlay(ctx, tileSize) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1684c7';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.setLineDash([7, 5]);
    for (const link of this.stateManager.pipeLinks) {
      const sourceX = (link.source.col + 0.5) * tileSize;
      const sourceY = (link.source.row + 0.5) * tileSize;
      const targetX = (link.destination.col + 0.5) * tileSize;
      const targetY = (link.destination.row + 0.5) * tileSize;
      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY);
      ctx.quadraticCurveTo((sourceX + targetX) / 2, (sourceY + targetY) / 2 - 28, targetX, targetY);
      ctx.strokeStyle = 'rgba(20, 118, 176, 0.76)';
      ctx.lineWidth = 3;
      ctx.stroke();
      this.drawPipeLinkNode(ctx, sourceX, sourceY);
      this.drawPipeLinkNode(ctx, targetX, targetY);
    }

    if (this.selectedCells.length) {
      const offset = this.movePreview || { deltaRow: 0, deltaCol: 0 };
      for (const cell of this.selectedCells) {
        const x = (cell.col + offset.deltaCol) * tileSize;
        const y = (cell.row + offset.deltaRow) * tileSize;
        const inside = x >= 0 && y >= 0 &&
          x + tileSize <= this.canvas.width && y + tileSize <= this.canvas.height;
        ctx.fillStyle = this.isMovingSelection
          ? inside ? 'rgba(64, 190, 132, 0.2)' : 'rgba(228, 77, 77, 0.2)'
          : 'rgba(255, 255, 255, 0.17)';
        ctx.strokeStyle = this.isMovingSelection
          ? inside ? '#20a873' : '#dc4d4d'
          : '#1684c7';
        ctx.setLineDash(this.isMovingSelection ? [5, 3] : []);
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        ctx.strokeRect(x + 1.5, y + 1.5, tileSize - 3, tileSize - 3);
      }

      if (this.selectedCells.length > 1 || this.stateManager.getTile(
        this.selectedCells[0].row,
        this.selectedCells[0].col
      ) === 'Pipe') {
        const end = this.selectedCells.at(-1);
        const centerX = (end.col + 1) * tileSize - 7;
        const centerY = (end.row + 1) * tileSize - 7;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = this.isLinkingPipes ? '#f2ad3f' : '#f7fbff';
        ctx.fill();
        ctx.strokeStyle = this.isLinkingPipes ? '#945b05' : '#1476b0';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#145b7e';
        ctx.fillText('↗', centerX, centerY);
      }
    }

    if (this.isLinkingPipes && this.linkDragSource && this.pointerPosition) {
      const startX = (this.linkDragSource.col + 0.5) * tileSize;
      const startY = (this.linkDragSource.row + 0.5) * tileSize;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(this.pointerPosition.x, this.pointerPosition.y);
      ctx.strokeStyle = '#f2ad3f';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 5]);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPipeLinkNode(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#e7f7ff';
    ctx.fill();
    ctx.strokeStyle = '#1476b0';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawRewardBadge(ctx, x, y, tileSize) {
    const reward = this.stateManager.mysteryBoxReward || 'Mushroom';
    const colors = {
      Random: '#8b70b5',
      Mushroom: '#e47759',
      Star: '#f1ad3e',
      ExtraLife: '#e76568',
      FireFlower: '#ed7645'
    };
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
    const theme = this.theme;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(0.68, theme.sky[1]);
    sky.addColorStop(1, theme.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = theme.sun;
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.24, theme.stars ? 27 : 34, 0, Math.PI * 2);
    ctx.fill();
    if (theme.stars) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (let x = 45; x < width; x += 173) {
        const y = 28 + ((x * 7) % Math.max(50, height * 0.35));
        ctx.fillRect(x, y, 3, 3);
        ctx.fillRect(x + 54, y + 31, 2, 2);
      }
    }

    ctx.fillStyle = theme.far;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.68);
    for (let x = 0; x <= width; x += 256) {
      ctx.quadraticCurveTo(x + 128, height * 0.42, x + 256, height * 0.68);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    ctx.fillStyle = theme.near;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.82);
    for (let x = 0; x <= width; x += 320) {
      ctx.quadraticCurveTo(x + 160, height * 0.6, x + 320, height * 0.82);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    if (!theme.stars) {
      ctx.fillStyle = 'rgb(255 255 255 / 55%)';
      for (let x = 90; x < width; x += 480) {
        const y = height * (0.2 + ((x / 480) % 2) * 0.15);
        ctx.fillRect(x, y + 8, 52, 12);
        ctx.fillRect(x + 12, y, 34, 10);
        ctx.fillRect(x + 24, y + 18, 22, 6);
      }
    }
  }

  drawTile(ctx, type, x, y, tileSize) {
    const row = Math.floor(y / tileSize);
    const col = Math.floor(x / tileSize);
    const variantId = this.stateManager.getTileVariant(row, col);
    const variantMetadata = this.stateManager.tileVariantCatalog[type]
      ?.find(variant => variant.id === variantId);
    const spriteMetadata = this.stateManager.spriteMetadata[type];
    const customCreepy = this.stateManager.getCreepyType(type);
    if (customCreepy && !this.spriteImages.has(type)) {
      this.loadSprite(type, customCreepy.dataUrl);
    }
    const legacyCustomSprite = variantId === 'classic' && spriteMetadata?.fileName;
    const selectedBoss = type === 'Boss'
      ? this.stateManager.customBosses.find(boss => boss.id === this.stateManager.bossConfig.type)
      : null;
    const bossImageKey = selectedBoss ? `Boss:${selectedBoss.id}` : null;
    let image = selectedBoss ? this.spriteImages.get(bossImageKey) : undefined;
    if (selectedBoss && !image) {
      this.loadBossSprite(bossImageKey, selectedBoss);
    }
    image ||= legacyCustomSprite
      ? this.spriteImages.get(type)
      : this.variantImages.get(`${type}:${variantId}`) || this.spriteImages.get(type);
    const metadata = customCreepy
      ? { frameWidth: customCreepy.imageWidth, frameHeight: customCreepy.imageHeight }
      : legacyCustomSprite
      ? spriteMetadata
      : variantMetadata?.dataUrl
      ? variantMetadata
      : spriteMetadata?.dataUrl
      ? spriteMetadata
      : spriteMetadata?.animations?.idle || Object.values(spriteMetadata?.animations || {})[0];
    if (image?.complete && image.naturalWidth) {
      const frameWidth = metadata?.frameWidth || image.naturalWidth;
      const frameHeight = metadata?.frameHeight || image.naturalHeight;
      if (THEMED_TILE_TYPES.has(type)) {
        const theme = this.theme;
        const tintContext = this.tileTintContext;
        tintContext.clearRect(0, 0, tileSize, tileSize);
        tintContext.drawImage(image, 0, 0, frameWidth, frameHeight, 0, 0, tileSize, tileSize);
        tintContext.globalCompositeOperation = 'source-atop';
        tintContext.fillStyle = theme.tileOverlay;
        tintContext.fillRect(0, 0, tileSize, tileSize);
        tintContext.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.tileTintCanvas, x, y);
      } else {
        ctx.drawImage(image, 0, 0, frameWidth, frameHeight, x, y, tileSize, tileSize);
      }
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
    } else if (type === 'Sand') {
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = 'rgba(255, 239, 190, 0.62)';
      ctx.fillRect(x + 1, y + 5, tileSize - 2, 2);
      ctx.fillRect(x + 1, y + 17, tileSize - 2, 2);
      ctx.fillStyle = 'rgba(132, 95, 43, 0.55)';
      ctx.fillRect(x + 7, y + 12, 2, 2);
      ctx.fillRect(x + 22, y + 25, 2, 2);
    } else if (type === 'Stone') {
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.strokeStyle = 'rgba(229, 238, 241, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 11);
      ctx.lineTo(x + tileSize, y + 11);
      ctx.moveTo(x, y + 22);
      ctx.lineTo(x + tileSize, y + 22);
      ctx.moveTo(x + 12, y);
      ctx.lineTo(x + 12, y + 11);
      ctx.moveTo(x + 21, y + 11);
      ctx.lineTo(x + 21, y + 22);
      ctx.moveTo(x + 8, y + 22);
      ctx.lineTo(x + 8, y + tileSize);
      ctx.stroke();
    } else if (type === 'Snow') {
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#f3fbff';
      ctx.beginPath();
      ctx.moveTo(x, y + 9);
      ctx.quadraticCurveTo(x + 7, y + 3, x + 14, y + 9);
      ctx.quadraticCurveTo(x + 21, y + 3, x + tileSize, y + 9);
      ctx.lineTo(x + tileSize, y + tileSize);
      ctx.lineTo(x, y + tileSize);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(215, 239, 248, 0.9)';
      ctx.fillRect(x + 3, y + 14, 8, 2);
    } else if (type === 'Boss') {
      ctx.fillStyle = TILE_COLORS.Boss;
      ctx.beginPath();
      ctx.ellipse(x + 16, y + 20, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd36e';
      ctx.fillRect(x + 5, y + 5, 5, 9);
      ctx.fillRect(x + 22, y + 5, 5, 9);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 10, y + 15, 4, 5);
      ctx.fillRect(x + 19, y + 15, 4, 5);
      ctx.fillStyle = '#243847';
      ctx.fillRect(x + 11, y + 16, 2, 3);
      ctx.fillRect(x + 20, y + 16, 2, 3);
      ctx.fillStyle = '#ffe27a';
      ctx.fillRect(x + 14, y + 26, 5, 2);
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

  loadBossSprite(key, boss) {
    if (this.spriteImages.has(key)) return;
    this.spriteImages.set(key, null);
    const image = new Image();
    image.onload = () => {
      this.spriteImages.set(key, image);
      this.refresh();
    };
    image.onerror = () => {
      this.spriteImages.delete(key);
      this.eventBus.emit('status', `Could not display the ${boss.name} boss image.`);
    };
    image.src = boss.dataUrl;
  }
}
