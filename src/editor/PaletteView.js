import {
  BOSS_ABILITIES,
  BOSS_MOVEMENTS,
  BOSS_TYPES,
  DEFAULT_BOSS_CONFIG
} from '../core/StateManager.js';

const TILES = [
  { id: 'Player', name: 'Player', icon: '🧑', description: 'Place the player start', color: '#347bd1' },
  { id: 'Ground', name: 'Ground', icon: '🟩', description: 'Solid platform', color: '#58a65c' },
  { id: 'Brick', name: 'Brick', icon: '🧱', description: 'Breakable block', color: '#b9683f' },
  { id: 'MysteryBox', name: 'Mystery Box', icon: '❔', description: 'Bump from below', color: '#e0aa28' },
  { id: 'Pipe', name: 'Pipe', icon: '🟩', description: 'Solid obstacle', color: '#308c62' },
  { id: 'Spring', name: 'Spring', icon: '🌀', description: 'Bounce high when you land on it', color: '#d86783' },
  { id: 'MovingPlatform', name: 'Moving platform', icon: '↔️', description: 'Ride a platform that moves side to side', color: '#4c86b8' },
  { id: 'OneWayPlatform', name: 'One-way platform', icon: '🪵', description: 'Jump up through it and land on top', color: '#b98b52' },
  { id: 'Switch', name: 'Switch', icon: '🔘', description: 'Touch it to open every door in the level', color: '#e08b48' },
  { id: 'Door', name: 'Door', icon: '🚪', description: 'A solid barrier opened by a switch', color: '#765b90' },
  { id: 'Checkpoint', name: 'Checkpoint', icon: '🚩', description: 'Touch it to respawn here after falling', color: '#43a5a1' },
  { id: 'Goomba', name: 'Goomba', icon: '🍄', description: 'Slow ground walker', color: '#a94b38' },
  { id: 'Koopa', name: 'Koopa', icon: '🐢', description: 'Armored ground patrol', color: '#4f9b59' },
  { id: 'Bat', name: 'Bat', icon: '🦇', description: 'Flying enemy', color: '#64558f' },
  { id: 'Boss', name: 'Boss', icon: '👹', description: 'A powerful level boss with custom moves', color: '#9b4b96' },
  { id: 'Coin', name: 'Coin', icon: '🪙', description: 'Collect for points', color: '#f0c84b' },
  { id: 'Mushroom', name: 'Super mushroom', icon: '🍄', description: 'Grow big and jump higher', color: '#e47759' },
  { id: 'Star', name: 'Star power', icon: '⭐', description: 'Invincible for 8 seconds', color: '#f1ad3e' },
  { id: 'ExtraLife', name: 'Extra life', icon: '❤️', description: 'Add one player life', color: '#e76568' },
  { id: 'FireFlower', name: 'Fire flower', icon: '🔥', description: 'Unlock fireballs with X or J', color: '#ed7645' },
  { id: 'Flag', name: 'Goal', icon: '🏁', description: 'Reach to win', color: '#378bd0' },
  { id: 'Eraser', name: 'Eraser', icon: '🧽', description: 'Remove a tile', color: '#85939c' }
];

const MYSTERY_REWARDS = [
  { id: 'Mushroom', label: 'Super mushroom' },
  { id: 'Star', label: 'Star power' },
  { id: 'ExtraLife', label: 'Extra life' },
  { id: 'FireFlower', label: 'Fire flower' }
];

const ANIMATIONS = {
  Player: [
    { id: 'idle', label: 'Idle', description: 'Standing still' },
    { id: 'walk', label: 'Walk', description: 'Moving at normal speed' },
    { id: 'run', label: 'Run', description: 'Moving at full speed' },
    { id: 'jump', label: 'Jump', description: 'In the air' }
  ],
  Goomba: [
    { id: 'idle', label: 'Idle', description: 'Standing still' },
    { id: 'walk', label: 'Walk', description: 'Walking around' }
  ],
  Koopa: [
    { id: 'idle', label: 'Idle', description: 'Standing still' },
    { id: 'walk', label: 'Walk', description: 'Patrolling' }
  ],
  Bat: [
    { id: 'idle', label: 'Idle', description: 'Hovering' },
    { id: 'walk', label: 'Fly', description: 'Flapping wings' }
  ]
};

export class PaletteView {
  constructor(containerId, eventBus) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Palette element "${containerId}" was not found.`);
    this.eventBus = eventBus;
    this.tileTypes = TILES.map(tile => ({ ...tile }));
    this.selectedTileId = 'Ground';
    this.tileVariantCatalog = {};
    this.selectedTileVariants = {};
    this.customBosses = [];
    this.renderPalette();
    this.bindEvents();
    this.selectTile('Ground');
    this.eventBus.emit('getTileVariants');
  }

  bindEvents() {
    this.container.addEventListener('click', event => {
      if (event.target.closest('[data-add-boss]')) {
        event.stopPropagation();
        this.openBossUploadDialog();
        return;
      }

      const applyVariantButton = event.target.closest('[data-apply-variant]');
      if (applyVariantButton) {
        event.stopPropagation();
        const tileId = applyVariantButton.dataset.tileId;
        const variantId = this.container.querySelector(`[data-variant-select="${tileId}"]`).value;
        this.eventBus.emit('applyTileVariantToAll', { tileId, variantId });
        return;
      }

      if (event.target.closest('#btn-undo')) {
        this.eventBus.emit('undo');
        return;
      }
      if (event.target.closest('#btn-redo')) {
        this.eventBus.emit('redo');
        return;
      }

      const animationButton = event.target.closest('.animation-configure');
      if (animationButton) {
        event.stopPropagation();
        this.selectTile(animationButton.dataset.tileId, { configure: false });
        this.openAnimationDialog(animationButton.dataset.tileId);
        return;
      }

      const tile = event.target.closest('.tile-item');
      if (tile && event.target.closest('.tile-select')) {
        this.selectTile(tile.dataset.tileId);
      }
    });

    this.container.addEventListener('change', event => {
      const variantSelect = event.target.closest('[data-variant-select]');
      if (variantSelect) {
        const tileId = variantSelect.dataset.variantSelect;
        this.selectTile(tileId, { configure: false });
        this.selectedTileVariants[tileId] = variantSelect.value;
        this.updateTilePreview(tileId, variantSelect.value);
        this.eventBus.emit('tileVariantSelected', { tileId, variantId: variantSelect.value });
        return;
      }

      const rewardSelect = event.target.closest('[data-mystery-reward]');
      if (rewardSelect) {
        this.eventBus.emit('mysteryBoxRewardSelected', rewardSelect.value);
        return;
      }

      if (event.target.closest('[data-boss-setting]')) {
        this.emitBossConfig();
        return;
      }

      const variantInput = event.target.closest('[data-variant-upload]');
      if (!variantInput || !variantInput.files?.[0]) return;
      this.handleTileVariantUpload(variantInput.dataset.variantUpload, variantInput.files[0]);
      variantInput.value = '';
    });

    this.container.addEventListener('input', event => {
      if (!event.target.matches('[data-boss-setting="speed"]')) return;
      const output = this.container.querySelector('[data-boss-speed-value]');
      output.value = `${event.target.value} px/s`;
      this.emitBossConfig();
    });

    this.eventBus.on('historyChanged', ({ canUndo, canRedo }) => {
      this.container.querySelector('#btn-undo').disabled = !canUndo;
      this.container.querySelector('#btn-redo').disabled = !canRedo;
    });
    this.eventBus.on('levelLoaded', ({
      mysteryBoxReward = 'Mushroom',
      bossConfig = DEFAULT_BOSS_CONFIG,
      customBosses = []
    } = {}) => {
      const rewardSelect = this.container.querySelector('[data-mystery-reward]');
      if (rewardSelect) rewardSelect.value = mysteryBoxReward;
      this.setBossTypes(customBosses);
      this.setBossConfigControls(bossConfig);
    });
    this.eventBus.on('bossTypesChanged', ({ customBosses = [], bossConfig = DEFAULT_BOSS_CONFIG } = {}) => {
      this.setBossTypes(customBosses);
      this.setBossConfigControls(bossConfig);
    });
    this.eventBus.on('tileVariantsChanged', ({ catalog, selectedTileVariants = {} } = {}) => {
      this.tileVariantCatalog = catalog || {};
      this.selectedTileVariants = { ...selectedTileVariants };
      this.container.querySelectorAll('[data-variant-select]').forEach(select => {
        const tileId = select.dataset.variantSelect;
        const variants = this.tileVariantCatalog[tileId] || [];
        select.replaceChildren(...variants.map(variant => new Option(variant.name, variant.id)));
        const selected = this.selectedTileVariants[tileId] || 'classic';
        select.value = variants.some(variant => variant.id === selected) ? selected : 'classic';
        this.updateTilePreview(tileId, select.value);
      });
    });
    this.eventBus.on('spriteUploaded', ({ tileId, dataUrl }) => {
      const preview = this.container.querySelector(`[data-tile-id="${tileId}"] .tile-icon`);
      if (!preview) return;
      const image = document.createElement('img');
      image.src = dataUrl;
      image.alt = `${tileId} sprite preview`;
      preview.replaceChildren(image);
    });
    this.eventBus.on('animationRegistered', ({ entityType, animationType, dataUrl }) => {
      const preview = this.container.querySelector(`[data-tile-id="${entityType}"] .tile-icon`);
      if (!preview) return;
      const image = document.createElement('img');
      image.src = dataUrl;
      image.alt = `${entityType} ${animationType} animation preview`;
      preview.replaceChildren(image);
      const dialogPreview = this.motionDialog?.querySelector(`[data-animation-preview="${animationType}"]`);
      if (dialogPreview) dialogPreview.replaceChildren(image.cloneNode());
    });
  }

  selectTile(tileId, { configure = true } = {}) {
    if (!this.tileTypes.some(tile => tile.id === tileId)) return;
    this.selectedTileId = tileId;
    this.container.querySelectorAll('.tile-item').forEach(item => {
      const selected = item.dataset.tileId === tileId;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    this.eventBus.emit('tileSelected', tileId);
    if (configure && ANIMATIONS[tileId]) this.openAnimationDialog(tileId);
  }

  renderPalette() {
    this.container.innerHTML = `
      <header class="palette-header">
        <div class="eyebrow">LEVEL BUILDER</div>
        <h1>Tile toolbox</h1>
        <p>Choose an object, then paint it on the board.</p>
      </header>
      <div class="history-controls">
        <button id="btn-undo" class="secondary-button" type="button" title="Undo (Ctrl+Z)" disabled>↶ Undo</button>
        <button id="btn-redo" class="secondary-button" type="button" title="Redo (Ctrl+Y)" disabled>↷ Redo</button>
      </div>
      <div class="tiles-container">
        ${this.tileTypes.map(tile => {
          const animated = Boolean(ANIMATIONS[tile.id]);
            const configurable = !animated && tile.id !== 'Player' && tile.id !== 'Boss';
          return `
            <article class="tile-item" data-tile-id="${tile.id}">
              <button class="tile-select" type="button" aria-pressed="false">
                <span class="tile-icon" style="--tile-color:${tile.color}">${tile.icon}</span>
                <span class="tile-copy">
                  <span class="tile-name">${tile.name}</span>
                  <span class="tile-description">${tile.description}</span>
                </span>
              </button>
              ${tile.id === 'Boss' ? `
                <div class="tile-settings boss-settings">
                  <label>
                    <span>Boss character</span>
                    <span class="boss-character-control">
                      <select data-boss-setting="type" aria-label="Boss character">
                        ${BOSS_TYPES.map(boss => `<option value="${boss.id}">${boss.name}</option>`).join('')}
                      </select>
                      <button class="secondary-button boss-add-button" type="button" data-add-boss aria-label="Add custom boss" title="Add a boss character">＋ Add</button>
                    </span>
                  </label>
                  <label>
                    Movement
                    <select data-boss-setting="movement" aria-label="Boss movement">
                      ${BOSS_MOVEMENTS.map(movement => `<option value="${movement.id}">${movement.name}</option>`).join('')}
                    </select>
                  </label>
                  <label>
                    Special ability
                    <select data-boss-setting="ability" aria-label="Boss ability">
                      ${BOSS_ABILITIES.map(ability => `<option value="${ability.id}">${ability.name}</option>`).join('')}
                    </select>
                  </label>
                  <label class="boss-range-label">
                    Health <output data-boss-health-value>5 hits</output>
                    <input type="range" min="3" max="10" step="1" value="${DEFAULT_BOSS_CONFIG.health}" data-boss-setting="health" aria-label="Boss health">
                  </label>
                  <label class="boss-range-label">
                    Speed <output data-boss-speed-value>70 px/s</output>
                    <input type="range" min="40" max="120" step="10" value="${DEFAULT_BOSS_CONFIG.speed}" data-boss-setting="speed" aria-label="Boss speed">
                  </label>
                  <span class="variant-help">These settings apply to every Boss tile in this level.</span>
                </div>
              ` : animated
                ? `<button class="animation-configure" type="button" data-tile-id="${tile.id}">Motion</button>`
                : configurable ? `
                  <div class="tile-variant-actions">
                    <label class="upload-button" title="Add another image for this tile">
                      <span>＋ Image</span>
                      <input type="file" data-variant-upload="${tile.id}" accept="image/png,image/jpeg,image/webp">
                    </label>
                    <button class="apply-variant-button" type="button" data-apply-variant data-tile-id="${tile.id}" title="Apply this appearance to all ${tile.name} tiles">Apply all</button>
                  </div>
                  <div class="tile-settings">
                    <label class="variant-select-label">
                      Appearance
                      <select data-variant-select="${tile.id}" aria-label="${tile.name} appearance"></select>
                    </label>
                    <span class="variant-help">Choose the look to paint; use Apply all for existing tiles.</span>
                    ${tile.id === 'MysteryBox' ? `
                      <label class="mystery-reward-settings">
                        Reward for all boxes
                        <select data-mystery-reward aria-label="Mystery box reward">
                          ${MYSTERY_REWARDS.map(reward => `
                            <option value="${reward.id}">${reward.label}</option>
                          `).join('')}
                        </select>
                      </label>
                    ` : ''}
                  </div>
                ` : ''}
            </article>
          `;
        }).join('')}
      </div>
      <p class="palette-hint">Try the ready-made demo, or drag across the board to paint.</p>
    `;
  }

  emitBossConfig() {
    const config = {};
    for (const setting of this.container.querySelectorAll('[data-boss-setting]')) {
      config[setting.dataset.bossSetting] = setting.type === 'range'
        ? Number(setting.value)
        : setting.value;
    }
    const healthValue = this.container.querySelector('[data-boss-health-value]');
    healthValue.value = `${config.health} hits`;
    this.eventBus.emit('bossConfigChanged', config);
  }

  setBossConfigControls(config = DEFAULT_BOSS_CONFIG) {
    for (const setting of this.container.querySelectorAll('[data-boss-setting]')) {
      setting.value = config[setting.dataset.bossSetting] ?? DEFAULT_BOSS_CONFIG[setting.dataset.bossSetting];
    }
    const healthValue = this.container.querySelector('[data-boss-health-value]');
    const speedValue = this.container.querySelector('[data-boss-speed-value]');
    if (healthValue) healthValue.value = `${config.health ?? DEFAULT_BOSS_CONFIG.health} hits`;
    if (speedValue) speedValue.value = `${config.speed ?? DEFAULT_BOSS_CONFIG.speed} px/s`;
    this.updateBossPreview(config.type);
  }

  setBossTypes(customBosses = []) {
    this.customBosses = customBosses;
    const select = this.container.querySelector('[data-boss-setting="type"]');
    if (!select) return;
    const options = [...BOSS_TYPES, ...customBosses].map(boss => new Option(boss.name, boss.id));
    select.replaceChildren(...options);
  }

  updateBossPreview(type) {
    const preview = this.container.querySelector('[data-tile-id="Boss"] .tile-icon');
    if (!preview) return;
    const customBoss = this.customBosses.find(boss => boss.id === type);
    if (!customBoss) {
      preview.textContent = '👹';
      return;
    }
    const image = document.createElement('img');
    image.src = customBoss.dataUrl;
    image.alt = `${customBoss.name} boss preview`;
    preview.replaceChildren(image);
  }

  openBossUploadDialog() {
    this.closeBossUploadDialog();
    this.bossDialog = document.createElement('section');
    this.bossDialog.className = 'animation-modal';
    this.bossDialog.setAttribute('role', 'dialog');
    this.bossDialog.setAttribute('aria-modal', 'true');
    this.bossDialog.setAttribute('aria-labelledby', 'boss-dialog-title');
    this.bossDialog.innerHTML = `
      <div class="animation-dialog boss-dialog">
        <header class="animation-dialog-header">
          <div>
            <span class="eyebrow">CUSTOM BOSS</span>
            <h2 id="boss-dialog-title">Add a boss character</h2>
            <p>Upload an image, then choose its movement and special ability in the toolbox.</p>
          </div>
          <button class="animation-dialog-close" type="button" aria-label="Close boss dialog">✕</button>
        </header>
        <div class="boss-upload-content">
          <div class="boss-upload-preview" data-boss-upload-preview aria-label="Boss image preview">👹</div>
          <label class="boss-upload-field">
            Boss name
            <input type="text" data-boss-upload-name maxlength="40" placeholder="My Boss" autocomplete="off">
          </label>
          <label class="animation-upload-button boss-image-upload">
            <span>Choose image</span>
            <input type="file" data-boss-upload-image accept="image/png,image/jpeg,image/webp" aria-label="Upload boss image">
          </label>
          <span class="variant-help">PNG, JPEG, or WebP · up to 5 MB and 4096 × 4096 pixels.</span>
          <p class="boss-upload-error" data-boss-upload-error role="alert" hidden></p>
        </div>
        <footer class="animation-dialog-footer">
          <span>Custom bosses are saved with this level.</span>
          <span>
            <button class="secondary-button" type="button" data-cancel-boss>Cancel</button>
            <button class="primary-button" type="button" data-save-boss>Add boss</button>
          </span>
        </footer>
      </div>
    `;
    document.body.appendChild(this.bossDialog);
    const dialog = this.bossDialog;
    dialog.querySelector('.animation-dialog-close').addEventListener('click', () => this.closeBossUploadDialog());
    dialog.querySelector('[data-cancel-boss]').addEventListener('click', () => this.closeBossUploadDialog());
    dialog.addEventListener('pointerdown', event => {
      if (event.target === dialog) this.closeBossUploadDialog();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.closeBossUploadDialog();
    });
    const nameInput = dialog.querySelector('[data-boss-upload-name]');
    const fileInput = dialog.querySelector('[data-boss-upload-image]');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (!nameInput.value.trim()) {
        nameInput.value = file.name.replace(/\.[^.]+$/, '').slice(0, 40);
      }
      this.previewBossUpload(file, dialog);
    });
    dialog.querySelector('[data-save-boss]').addEventListener('click', () => {
      this.handleBossTypeUpload(dialog);
    });
    dialog.querySelector('.animation-dialog-close').focus();
  }

  closeBossUploadDialog() {
    this.bossDialog?.remove();
    this.bossDialog = null;
  }

  async previewBossUpload(file, dialog) {
    const preview = dialog.querySelector('[data-boss-upload-preview]');
    try {
      if (file.size > 5 * 1024 * 1024) throw new RangeError('Choose an image that is 5 MB or smaller.');
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        throw new TypeError('Choose a PNG, JPEG, or WebP image for your boss.');
      }
      const dataUrl = await this.readBossImage(file);
      const image = await this.decodeBossImage(dataUrl);
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        throw new RangeError('Boss images must be no larger than 4096 × 4096 pixels.');
      }
      preview.replaceChildren(image);
      dialog.querySelector('[data-boss-upload-error]').hidden = true;
    } catch (error) {
      this.showBossUploadError(dialog, error);
    }
  }

  async handleBossTypeUpload(dialog) {
    const button = dialog.querySelector('[data-save-boss]');
    const file = dialog.querySelector('[data-boss-upload-image]').files?.[0];
    const name = dialog.querySelector('[data-boss-upload-name]').value.trim();
    button.disabled = true;
    try {
      if (!name || name.length > 40) throw new TypeError('Enter a boss name up to 40 characters long.');
      if (!file) throw new TypeError('Choose an image for your boss.');
      if (file.size > 5 * 1024 * 1024) throw new RangeError('Choose an image that is 5 MB or smaller.');
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        throw new TypeError('Choose a PNG, JPEG, or WebP image for your boss.');
      }
      const dataUrl = await this.readBossImage(file);
      const image = await this.decodeBossImage(dataUrl);
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        throw new RangeError('Boss images must be no larger than 4096 × 4096 pixels.');
      }
      const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      this.eventBus.emit('bossTypeUploaded', {
        id,
        name,
        dataUrl,
        fileName: file.name,
        fileType: file.type,
        imageWidth: image.naturalWidth,
        imageHeight: image.naturalHeight
      });
      this.closeBossUploadDialog();
    } catch (error) {
      this.showBossUploadError(dialog, error);
    } finally {
      if (dialog.isConnected) button.disabled = false;
    }
  }

  readBossImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('The image file could not be read.'));
          return;
        }
        resolve(reader.result);
      };
      reader.onerror = () => reject(new Error('The image file could not be read.'));
      reader.readAsDataURL(file);
    });
  }

  decodeBossImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The selected file is not a supported image.'));
      image.src = dataUrl;
    });
  }

  showBossUploadError(dialog, error) {
    const errorElement = dialog.querySelector('[data-boss-upload-error]');
    errorElement.textContent = error.message || 'The boss image could not be added.';
    errorElement.hidden = false;
    this.eventBus.emit('status', errorElement.textContent);
  }

  openAnimationDialog(entityType) {
    this.motionDialog?.remove();
    const animations = ANIMATIONS[entityType];
    if (!animations) return;
    this.motionDialog = document.createElement('section');
    this.motionDialog.className = 'animation-modal';
    this.motionDialog.setAttribute('role', 'dialog');
    this.motionDialog.setAttribute('aria-modal', 'true');
    this.motionDialog.setAttribute('aria-labelledby', 'animation-dialog-title');
    this.motionDialog.innerHTML = `
      <div class="animation-dialog">
        <header class="animation-dialog-header">
          <div>
            <span class="eyebrow">CUSTOM SPRITES</span>
            <h2 id="animation-dialog-title">${entityType} animations</h2>
            <p>Upload one image or sprite sheet for each movement.</p>
          </div>
          <button class="animation-dialog-close" type="button" aria-label="Close animations">✕</button>
        </header>
        <div class="animation-list">
          ${animations.map(animation => `
            <article class="animation-row" data-animation="${animation.id}">
              <div class="animation-preview" data-animation-preview="${animation.id}">🎞️</div>
              <div class="animation-copy">
                <strong>${animation.label}</strong>
                <span>${animation.description}</span>
                <span class="animation-file-name" data-animation-file="${animation.id}">No image uploaded</span>
              </div>
              <div class="animation-settings">
                <label>Frame W <input type="number" min="1" max="2048" data-animation-width value="32" aria-label="${animation.label} frame width"></label>
                <label>H <input type="number" min="1" max="2048" data-animation-height value="32" aria-label="${animation.label} frame height"></label>
                <label>FPS <input type="number" min="1" max="60" data-animation-fps value="8" aria-label="${animation.label} frames per second"></label>
                <label class="animation-upload-button">
                  <span>Choose image</span>
                  <input type="file" data-animation-upload accept="image/png,image/jpeg,image/webp" aria-label="Upload ${animation.label} animation image">
                </label>
              </div>
            </article>
          `).join('')}
        </div>
        <footer class="animation-dialog-footer">
          <span>Each uploaded image is used only for its matching movement.</span>
          <button class="primary-button animation-done" type="button">Done</button>
        </footer>
      </div>
    `;
    document.body.appendChild(this.motionDialog);
    const dialog = this.motionDialog;
    dialog.querySelector('.animation-dialog-close').addEventListener('click', () => this.closeAnimationDialog());
    dialog.querySelector('.animation-done').addEventListener('click', () => this.closeAnimationDialog());
    dialog.addEventListener('pointerdown', event => {
      if (event.target === dialog) this.closeAnimationDialog();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.closeAnimationDialog();
    });
    dialog.querySelectorAll('[data-animation-upload]').forEach(input => {
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        const row = input.closest('.animation-row');
        this.handleAnimationUpload(entityType, row.dataset.animation, file, {
          frameWidth: Number(row.querySelector('[data-animation-width]').value),
          frameHeight: Number(row.querySelector('[data-animation-height]').value),
          frameRate: Number(row.querySelector('[data-animation-fps]').value)
        });
        input.value = '';
      });
    });
    this.eventBus.emit('getAnimationMetadata', entityType);
    this.motionDialog.querySelector('.animation-dialog-close').focus();
  }

  closeAnimationDialog() {
    this.motionDialog?.remove();
    this.motionDialog = null;
  }

  showAnimationMetadata({ entityType, metadata }) {
    if (this.motionDialog?.querySelector('#animation-dialog-title')?.textContent !== `${entityType} animations`) return;
    for (const [animationType, animation] of Object.entries(metadata?.animations || {})) {
      const preview = this.motionDialog.querySelector(`[data-animation-preview="${animationType}"]`);
      if (preview && animation.dataUrl) {
        const image = document.createElement('img');
        image.src = animation.dataUrl;
        image.alt = `${animationType} animation preview`;
        preview.replaceChildren(image);
      }
      const fileName = this.motionDialog.querySelector(`[data-animation-file="${animationType}"]`);
      if (fileName) fileName.textContent = animation.fileName || 'Image uploaded';
      const row = this.motionDialog.querySelector(`[data-animation="${animationType}"]`);
      if (row && animation.frameWidth && animation.frameHeight) {
        row.querySelector('[data-animation-width]').value = animation.frameWidth;
        row.querySelector('[data-animation-height]').value = animation.frameHeight;
        row.querySelector('[data-animation-fps]').value = animation.frameRate || 8;
      }
    }
  }

  async handleAnimationUpload(entityType, animationType, file, settings) {
    const row = this.motionDialog?.querySelector(`[data-animation="${animationType}"]`);
    row?.classList.add('loading');
    try {
      if (!file.type.startsWith('image/')) throw new TypeError('Choose an image file for this animation.');
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The image file could not be read.'));
        reader.readAsDataURL(file);
      });
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('The selected file is not a supported image.'));
        img.src = dataUrl;
      });
      const frameWidth = settings.frameWidth || Math.min(32, image.naturalWidth);
      const frameHeight = settings.frameHeight || Math.min(32, image.naturalHeight);
      if (!Number.isInteger(frameWidth) || !Number.isInteger(frameHeight) ||
        frameWidth > image.naturalWidth || frameHeight > image.naturalHeight ||
        !Number.isInteger(settings.frameRate) || settings.frameRate < 1 || settings.frameRate > 60) {
        throw new RangeError('Set valid frame dimensions and an FPS value from 1 to 60.');
      }
      const frameCount = Math.floor(image.naturalWidth / frameWidth) * Math.floor(image.naturalHeight / frameHeight);
      if (frameCount < 1) throw new RangeError('The selected image does not contain a complete frame.');
      this.eventBus.emit('spriteAnimationUploaded', {
        entityType,
        animationType,
        dataUrl,
        fileName: file.name,
        fileType: file.type,
        imageWidth: image.naturalWidth,
        imageHeight: image.naturalHeight,
        frameWidth,
        frameHeight,
        frameCount,
        frameRate: settings.frameRate
      });
      const fileName = this.motionDialog?.querySelector(`[data-animation-file="${animationType}"]`);
      if (fileName) fileName.textContent = `${file.name} · ${frameCount} frame${frameCount === 1 ? '' : 's'}`;
      this.eventBus.emit('status', `${entityType} ${animationType} animation uploaded.`);
    } catch (error) {
      console.error('Animation upload failed:', error);
      this.eventBus.emit('status', error.message || 'The animation upload failed.');
    } finally {
      row?.classList.remove('loading');
    }
  }

  async handleTileVariantUpload(tileId, file) {
    const card = this.container.querySelector(`.tile-item[data-tile-id="${tileId}"]`);
    card?.classList.add('loading');
    try {
      if (!file.type.startsWith('image/')) throw new TypeError('Choose an image file to add a tile appearance.');
      if (file.size > 5 * 1024 * 1024) throw new RangeError('Choose an image that is 5 MB or smaller.');
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The image file could not be read.'));
        reader.readAsDataURL(file);
      });
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('The selected file is not a supported image.'));
        img.src = dataUrl;
      });
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        throw new RangeError('Tile images must be no larger than 4096 × 4096 pixels.');
      }
      const variantId = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const name = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 40) || 'Custom';
      this.selectTile(tileId, { configure: false });
      this.eventBus.emit('tileVariantUploaded', {
        tileId,
        variant: {
          id: variantId,
          name,
          dataUrl,
          fileName: file.name,
          fileType: file.type,
          imageWidth: image.naturalWidth,
          imageHeight: image.naturalHeight
        }
      });
      const select = card.querySelector('[data-variant-select]');
      if (select && ![...select.options].some(option => option.value === variantId)) {
        select.add(new Option(name, variantId));
      }
      select.value = variantId;
      this.selectedTileVariants[tileId] = variantId;
      this.updateTilePreview(tileId, variantId);
      this.eventBus.emit('tileVariantSelected', { tileId, variantId });
      this.eventBus.emit('status', `Added "${name}" as a ${tileId} appearance.`);
    } catch (error) {
      console.error('Tile image upload failed:', error);
      this.eventBus.emit('status', error.message || 'The tile image upload failed.');
    } finally {
      card?.classList.remove('loading');
    }
  }

  updateTilePreview(tileId, variantId) {
    const tile = this.tileTypes.find(item => item.id === tileId);
    const preview = this.container.querySelector(`[data-tile-id="${tileId}"] .tile-icon`);
    if (!tile || !preview) return;
    const variant = this.tileVariantCatalog[tileId]?.find(item => item.id === variantId);
    if (variant?.dataUrl) {
      const image = document.createElement('img');
      image.src = variant.dataUrl;
      image.alt = `${tile.name} ${variant.name} appearance`;
      preview.replaceChildren(image);
    } else {
      preview.textContent = tile.icon;
    }
  }

  getSelectedTileId() {
    return this.selectedTileId;
  }

  getTileTypes() {
    return this.tileTypes;
  }

  setInitialSelection(tileId) {
    this.selectTile(tileId, { configure: false });
  }

  getTileColor(tileId) {
    return this.tileTypes.find(tile => tile.id === tileId)?.color || '#85939c';
  }
}
