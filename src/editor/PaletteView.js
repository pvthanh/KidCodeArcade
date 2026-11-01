import {
  BOSS_ABILITIES,
  BOSS_MOVEMENTS,
  BOSS_TYPES,
  CREEPY_TYPES,
  DEFAULT_BOSS_CONFIG,
  DEFAULT_CREEPY_CONFIGS,
  PLAYER_CHARACTERS
} from '../core/StateManager.js';
import { characterArt } from '../assets/demo/CharacterArt.js';

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
  { id: 'Creepy', name: 'Creepy', icon: '👾', description: 'Choose or create a creature', color: '#64558f' },
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

const TOOL_GROUPS = [
  { id: 'start-goal', name: 'Start & Goal', tileIds: ['Player', 'Checkpoint', 'Flag'] },
  { id: 'terrain', name: 'Terrain', tileIds: ['Ground', 'Brick', 'Pipe'] },
  {
    id: 'mechanics',
    name: 'Platforms & Mechanics',
    tileIds: ['Spring', 'MovingPlatform', 'OneWayPlatform', 'MysteryBox', 'Switch', 'Door']
  },
  { id: 'creepy', name: 'Creepy', tileIds: ['Creepy'] },
  { id: 'boss', name: 'Boss', tileIds: ['Boss'] },
  {
    id: 'collectibles',
    name: 'Collectibles & Power-ups',
    tileIds: ['Coin', 'Mushroom', 'Star', 'ExtraLife', 'FireFlower']
  }
];

const GROUP_TILE_DEFAULTS = {
  'start-goal': 'Player',
  terrain: 'Ground',
  mechanics: 'Spring',
  creepy: 'Creepy',
  boss: 'Boss',
  collectibles: 'Coin'
};

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

const bossPreviewDataUrl = type => {
  const styles = {
    slimeKing: { body: '#b94f91', trim: '#f6c776', shape: 'slime' },
    roboCrab: { body: '#438ab1', trim: '#f0a85e', shape: 'crab' },
    skyDragon: { body: '#5ca66b', trim: '#f07f61', shape: 'dragon' }
  };
  const style = styles[type] || styles.slimeKing;
  const body = style.shape === 'crab'
    ? `<path d="M7 39h8v5H7zm26 0h8v5h-8zM8 22 1 15l6-6 7 11m26 2 7-7-6-6-7 11" fill="#493a64"/><rect x="5" y="17" width="38" height="25" rx="9" fill="${style.body}"/><rect x="12" y="12" width="24" height="21" rx="8" fill="${style.trim}" stroke="#284d6a" stroke-width="2"/>`
    : `<path d="m6 18 6-15 6 17M30 20l6-17 6 15" fill="${style.trim}"/><rect x="5" y="16" width="38" height="28" rx="14" fill="${style.body}"/>${style.shape === 'slime'
      ? `<path d="m9 17 3-13 6 10 6-13 7 13 5-10 3 13z" fill="${style.trim}"/>`
      : `<path d="M8 20 1 7l16 10m23 3 7-13-16 10m-7-4 3-7 4 7" fill="${style.trim}"/>`}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${body}<circle cx="16" cy="25" r="4" fill="white"/><circle cx="32" cy="25" r="4" fill="white"/><circle cx="17" cy="26" r="2" fill="#243847"/><circle cx="33" cy="26" r="2" fill="#243847"/><path d="M20 35h8" stroke="#ffe6a1" stroke-width="3"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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
    this.customCreeps = [];
    this.creepyConfigs = { ...DEFAULT_CREEPY_CONFIGS };
    this.selectedCreepyType = 'Goomba';
    this.selectedGroupTiles = { ...GROUP_TILE_DEFAULTS };
    this.renderPalette();
    this.bindEvents();
    this.setPlayerCharacter('storybookHero');
    this.selectTile('Ground');
    this.updateBossPreview(DEFAULT_BOSS_CONFIG.type);
    this.eventBus.emit('getTileVariants');
  }

  bindEvents() {
    this.container.addEventListener('click', event => {
      const groupSummary = event.target.closest('.tool-group-header');
      if (groupSummary) {
        const group = groupSummary.closest('[data-tool-group]');
        if (group && !group.open) {
          this.container.querySelectorAll('[data-tool-group]').forEach(otherGroup => {
            if (otherGroup !== group) otherGroup.open = false;
          });
        }
        return;
      }

      if (event.target.closest('[data-add-boss]')) {
        event.stopPropagation();
        this.openBossUploadDialog();
        return;
      }

      if (event.target.closest('[data-add-creepy]')) {
        event.stopPropagation();
        this.openCreepyUploadDialog();
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
        const entityType = animationButton.dataset.tileId === 'Creepy'
          ? this.selectedCreepyType
          : animationButton.dataset.tileId;
        this.selectTile(entityType, { configure: false });
        this.openAnimationDialog(entityType);
        return;
      }

      const tile = event.target.closest('.tile-item');
      if (tile && event.target.closest('.tile-select')) {
        this.selectTile(tile.dataset.tileId === 'Creepy' ? this.selectedCreepyType : tile.dataset.tileId);
      }
    });

    this.container.addEventListener('change', event => {
      const groupSelect = event.target.closest('[data-group-tile-select]');
      if (!groupSelect) return;
      const groupId = groupSelect.dataset.groupTileSelect;
      this.selectedGroupTiles[groupId] = groupSelect.value;
      this.selectTile(groupSelect.value, { configure: false });
    });

    this.container.addEventListener('change', event => {
      const playerCharacterSelect = event.target.closest('[data-player-character]');
      if (playerCharacterSelect) {
        this.eventBus.emit('playerCharacterSelected', playerCharacterSelect.value);
        return;
      }

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

      const creepyTypeSelect = event.target.closest('[data-creepy-setting="type"]');
      if (creepyTypeSelect) {
        this.selectedCreepyType = creepyTypeSelect.value;
        this.setCreepyConfigControls(this.creepyConfigs[this.selectedCreepyType]);
        this.selectTile(this.selectedCreepyType, { configure: false });
        this.updateCreepyPreview();
        return;
      }

      if (event.target.closest('[data-creepy-setting]')) {
        this.emitCreepyConfig();
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
      if (event.target.matches('[data-boss-setting="speed"], [data-boss-setting="size"], [data-boss-setting="health"]')) {
        const key = event.target.dataset.bossSetting;
        const output = this.container.querySelector(`[data-boss-${key}-value]`);
        output.value = key === 'health' ? `${event.target.value} hits`
          : key === 'size' ? `${event.target.value} px`
            : `${event.target.value} px/s`;
        this.emitBossConfig();
      } else if (event.target.matches('[data-creepy-setting="speed"], [data-creepy-setting="health"]')) {
        const key = event.target.dataset.creepySetting;
        const output = this.container.querySelector(`[data-creepy-${key}-value]`);
        output.value = key === 'health' ? `${event.target.value} hits` : `${event.target.value} px/s`;
        this.emitCreepyConfig();
      }
    });

    this.eventBus.on('historyChanged', ({ canUndo, canRedo }) => {
      this.container.querySelector('#btn-undo').disabled = !canUndo;
      this.container.querySelector('#btn-redo').disabled = !canRedo;
    });
    this.eventBus.on('levelLoaded', ({
      mysteryBoxReward = 'Mushroom',
      bossConfig = DEFAULT_BOSS_CONFIG,
      customBosses = [],
      customCreeps = [],
      creepyConfigs = DEFAULT_CREEPY_CONFIGS,
      playerCharacterId = 'storybookHero'
    } = {}) => {
      const rewardSelect = this.container.querySelector('[data-mystery-reward]');
      if (rewardSelect) rewardSelect.value = mysteryBoxReward;
      this.setBossTypes(customBosses);
      this.setBossConfigControls(bossConfig);
      this.setCreepyTypes(customCreeps, creepyConfigs);
      this.setPlayerCharacter(playerCharacterId);
    });
    this.eventBus.on('bossTypesChanged', ({ customBosses = [], bossConfig = DEFAULT_BOSS_CONFIG } = {}) => {
      this.setBossTypes(customBosses);
      this.setBossConfigControls(bossConfig);
    });
    this.eventBus.on('creepyTypesChanged', ({ customCreeps = [], creepyConfigs = {}, selectedType } = {}) => {
      this.setCreepyTypes(customCreeps, creepyConfigs, selectedType);
    });
    this.eventBus.on('creepyConfigUpdated', ({ tileType, config } = {}) => {
      if (!tileType || !config) return;
      this.creepyConfigs[tileType] = { ...config };
      if (tileType === this.selectedCreepyType) this.setCreepyConfigControls(config);
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
      if (tileId === 'Player') {
        this.setPlayerCharacter(this.playerCharacterId || 'storybookHero');
        return;
      }
      const preview = this.container.querySelector(`[data-tile-id="${tileId}"] .tile-icon`) ||
        (this.customCreeps.some(creepy => creepy.tileId === tileId)
          ? this.container.querySelector('[data-tile-id="Creepy"] .tile-icon')
          : null);
      if (!preview) return;
      const image = document.createElement('img');
      image.src = dataUrl;
      image.alt = `${tileId} sprite preview`;
      preview.replaceChildren(image);
    });
    this.eventBus.on('creepyPreviewChanged', ({ tileType, dataUrl, frameWidth, frameHeight } = {}) => {
      if (tileType === this.selectedCreepyType) {
        this.renderCreepyPreview(dataUrl, frameWidth, frameHeight);
      }
    });
    this.eventBus.on('animationRegistered', ({ entityType, animationType, dataUrl }) => {
      if (CREEPY_TYPES.some(type => type.id === entityType) ||
        this.customCreeps.some(creepy => creepy.tileId === entityType)) {
        if (entityType === this.selectedCreepyType) this.updateCreepyPreview();
        const dialogPreview = this.motionDialog?.querySelector(`[data-animation-preview="${animationType}"]`);
        if (dialogPreview) {
          const animationImage = document.createElement('img');
          animationImage.src = dataUrl;
          animationImage.alt = `${entityType} ${animationType} animation preview`;
          dialogPreview.replaceChildren(animationImage);
        }
        return;
      }
      if (entityType === 'Player') {
        this.setPlayerCharacter(this.playerCharacterId || 'storybookHero');
        return;
      }
      const preview = this.container.querySelector(`[data-tile-id="${entityType}"] .tile-icon`) ||
        (this.customCreeps.some(creepy => creepy.tileId === entityType)
          ? this.container.querySelector('[data-tile-id="Creepy"] .tile-icon')
          : null);
      if (!preview) return;
      const image = document.createElement('img');
      image.src = dataUrl;
      image.alt = `${entityType} ${animationType} animation preview`;
      preview.replaceChildren(image);
    });
  }

  selectTile(tileId, { configure = false } = {}) {
    const isCreepy = CREEPY_TYPES.some(type => type.id === tileId) ||
      this.customCreeps.some(creepy => creepy.tileId === tileId);
    if (!this.tileTypes.some(tile => tile.id === tileId) && !isCreepy) return;
    if (isCreepy) {
      this.selectedCreepyType = tileId;
      this.setCreepyConfigControls(this.creepyConfigs[tileId]);
    }
    this.selectedTileId = tileId;
    const selectedCardId = isCreepy ? 'Creepy' : tileId;
    const selectedCard = this.container.querySelector(`.tile-item[data-tile-id="${selectedCardId}"]`);
    const group = selectedCard?.closest('[data-tool-group]');
    if (group) {
      this.openToolGroup(group);
      const groupId = group.dataset.toolGroup;
      if (groupId !== 'creepy' && groupId !== 'boss') {
        this.selectedGroupTiles[groupId] = selectedCardId;
        const groupSelect = group.querySelector('[data-group-tile-select]');
        if (groupSelect) groupSelect.value = selectedCardId;
        const activeLabel = group.querySelector(`[data-group-active="${groupId}"]`);
        if (activeLabel) {
          activeLabel.textContent = groupSelect?.selectedOptions[0]?.textContent || selectedCardId;
        }
        group.querySelectorAll('.tile-item').forEach(item => {
          item.hidden = item !== selectedCard;
        });
      } else {
        const activeLabel = group.querySelector(`[data-group-active="${group.dataset.toolGroup}"]`);
        if (activeLabel) {
          activeLabel.textContent = groupId === 'creepy'
            ? this.container.querySelector('[data-creepy-setting="type"]')?.selectedOptions[0]?.textContent || 'Creepy'
            : this.container.querySelector('[data-boss-setting="type"]')?.selectedOptions[0]?.textContent || 'Boss';
        }
      }
    }
    this.container.querySelectorAll('.tile-item').forEach(item => {
      const selected = item.dataset.tileId === selectedCardId;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    this.eventBus.emit('tileSelected', tileId);
    if (configure && (ANIMATIONS[tileId] || isCreepy)) this.openAnimationDialog(tileId);
  }

  openToolGroup(group) {
    this.container.querySelectorAll('[data-tool-group]').forEach(otherGroup => {
      otherGroup.open = otherGroup === group;
    });
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
      <div class="editor-tools">
        <span class="editor-tools-label">Editor tool</span>
        ${this.tileTypes.filter(tile => tile.id === 'Eraser').map(tile => `
          <article class="tile-item" data-tile-id="${tile.id}">
            <button class="tile-select" type="button" aria-pressed="false">
              <span class="tile-icon" style="--tile-color:${tile.color}">${tile.icon}</span>
              <span class="tile-copy">
                <span class="tile-name">${tile.name}</span>
                <span class="tile-description">${tile.description}</span>
              </span>
            </button>
          </article>
        `).join('')}
      </div>
      <div class="tiles-container">
        ${TOOL_GROUPS.map(group => {
          const tiles = group.tileIds
            .map(tileId => this.tileTypes.find(tile => tile.id === tileId))
            .filter(Boolean);
          const hasGroupSelector = group.id !== 'creepy' && group.id !== 'boss';
          const selectedTileId = this.selectedGroupTiles[group.id];
          return `
            <details class="tool-group" data-tool-group="${group.id}" ${group.id === 'terrain' ? 'open' : ''}>
              <summary class="tool-group-header">
                <span>${group.name}</span>
                <span class="tool-group-active" data-group-active="${group.id}">
                  ${group.id === 'creepy'
                    ? CREEPY_TYPES.find(type => type.id === this.selectedCreepyType)?.name || 'Creepy'
                    : group.id === 'boss'
                      ? BOSS_TYPES.find(type => type.id === DEFAULT_BOSS_CONFIG.type)?.name || 'Boss'
                      : tiles.find(tile => tile.id === selectedTileId)?.name || ''}
                </span>
              </summary>
              <div class="tool-group-content">
                ${hasGroupSelector ? `
                  <label class="tool-group-select-label">
                    Choose item
                    <select data-group-tile-select="${group.id}" aria-label="${group.name} item">
                      ${tiles.map(tile => `<option value="${tile.id}" ${tile.id === selectedTileId ? 'selected' : ''}>${tile.name}</option>`).join('')}
                    </select>
                  </label>
                ` : ''}
        ${tiles.map(tile => {
          const animated = Boolean(ANIMATIONS[tile.id]);
          const configurable = !animated && tile.id !== 'Player' && tile.id !== 'Boss' && tile.id !== 'Creepy';
          return `
            <article class="tile-item" data-tile-id="${tile.id}"
              ${hasGroupSelector && tile.id !== selectedTileId ? 'hidden' : ''}>
              <button class="tile-select" type="button" aria-pressed="false">
                <span class="tile-icon" style="--tile-color:${tile.color}">${tile.icon}</span>
                <span class="tile-copy">
                  <span class="tile-name">${tile.name}</span>
                  <span class="tile-description">${tile.description}</span>
                </span>
              </button>
              ${tile.id === 'Player' ? `
                <div class="tile-settings player-settings">
                  <label>
                    Character
                    <select data-player-character aria-label="Player character">
                      ${PLAYER_CHARACTERS.map(character => `
                        <option value="${character.id}">${character.icon} ${character.name}</option>
                      `).join('')}
                    </select>
                  </label>
                  <button class="animation-configure" type="button" data-tile-id="Player">Motion</button>
                </div>
              ` : tile.id === 'Boss' ? `
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
                  <label class="boss-range-label">
                    Size <output data-boss-size-value>48 px</output>
                    <input type="range" min="32" max="128" step="8" value="${DEFAULT_BOSS_CONFIG.size}" data-boss-setting="size" aria-label="Boss size">
                  </label>
                  <span class="variant-help">These settings apply to every Boss tile in this level.</span>
                </div>
              ` : tile.id === 'Creepy' ? `
                <div class="tile-settings boss-settings creepy-settings">
                  <label>
                    Creature
                    <span class="boss-character-control">
                      <select data-creepy-setting="type" aria-label="Creature type">
                        ${[...CREEPY_TYPES, ...this.customCreeps.map(creepy => ({
                          id: creepy.tileId, name: creepy.name
                        }))].map(creepy => `<option value="${creepy.id}">${creepy.name}</option>`).join('')}
                      </select>
                      <button class="secondary-button boss-add-button" type="button" data-add-creepy
                        aria-label="Add custom creature" title="Add a creature">＋ Add</button>
                    </span>
                  </label>
                  <label>
                    Movement
                    <select data-creepy-setting="movement" aria-label="Creature movement">
                      <option value="ground">Ground patrol</option>
                      <option value="flying">Flying</option>
                    </select>
                  </label>
                  <label class="boss-range-label">
                    Health <output data-creepy-health-value>1 hit</output>
                    <input type="range" min="1" max="5" step="1" value="1"
                      data-creepy-setting="health" aria-label="Creature health">
                  </label>
                  <label class="boss-range-label">
                    Speed <output data-creepy-speed-value>45 px/s</output>
                    <input type="range" min="20" max="180" step="5" value="45"
                      data-creepy-setting="speed" aria-label="Creature speed">
                  </label>
                  <button class="animation-configure" type="button" data-tile-id="Creepy">Motion</button>
                  <span class="variant-help">Choose a creature, tune its behavior, then paint it on the board.</span>
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
            </details>
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
    this.updateBossPreview(config.type);
    const activeLabel = this.container.querySelector('[data-group-active="boss"]');
    if (activeLabel) {
      activeLabel.textContent = this.container.querySelector('[data-boss-setting="type"]')
        .selectedOptions[0]?.textContent || 'Boss';
    }
    this.eventBus.emit('bossConfigChanged', config);
  }

  setBossConfigControls(config = DEFAULT_BOSS_CONFIG) {
    config = { ...DEFAULT_BOSS_CONFIG, ...config };
    for (const setting of this.container.querySelectorAll('[data-boss-setting]')) {
      setting.value = config[setting.dataset.bossSetting] ?? DEFAULT_BOSS_CONFIG[setting.dataset.bossSetting];
    }
    const healthValue = this.container.querySelector('[data-boss-health-value]');
    const speedValue = this.container.querySelector('[data-boss-speed-value]');
    const sizeValue = this.container.querySelector('[data-boss-size-value]');
    if (healthValue) healthValue.value = `${config.health ?? DEFAULT_BOSS_CONFIG.health} hits`;
    if (speedValue) speedValue.value = `${config.speed ?? DEFAULT_BOSS_CONFIG.speed} px/s`;
    if (sizeValue) sizeValue.value = `${config.size ?? DEFAULT_BOSS_CONFIG.size} px`;
    this.updateBossPreview(config.type);
    const activeLabel = this.container.querySelector('[data-group-active="boss"]');
    if (activeLabel) {
      activeLabel.textContent = this.container.querySelector('[data-boss-setting="type"]')
        .selectedOptions[0]?.textContent || 'Boss';
    }
  }

  emitCreepyConfig() {
    const config = {
      tileType: this.selectedCreepyType,
      movement: this.container.querySelector('[data-creepy-setting="movement"]').value,
      speed: Number(this.container.querySelector('[data-creepy-setting="speed"]').value),
      health: Number(this.container.querySelector('[data-creepy-setting="health"]').value)
    };
    this.creepyConfigs[config.tileType] = {
      movement: config.movement,
      speed: config.speed,
      health: config.health
    };
    this.eventBus.emit('creepyConfigChanged', config);
  }

  setCreepyConfigControls(config = {}) {
    const current = {
      movement: config.movement || 'ground',
      speed: config.speed || 45,
      health: config.health || 1
    };
    for (const setting of this.container.querySelectorAll('[data-creepy-setting]:not([data-creepy-setting="type"])')) {
      setting.value = current[setting.dataset.creepySetting];
    }
    const health = this.container.querySelector('[data-creepy-health-value]');
    const speed = this.container.querySelector('[data-creepy-speed-value]');
    if (health) health.value = `${current.health} ${current.health === 1 ? 'hit' : 'hits'}`;
    if (speed) speed.value = `${current.speed} px/s`;
  }

  setCreepyTypes(customCreeps = [], creepyConfigs = {}, selectedType) {
    this.customCreeps = customCreeps;
    this.creepyConfigs = {
      ...DEFAULT_CREEPY_CONFIGS,
      ...creepyConfigs
    };
    const select = this.container.querySelector('[data-creepy-setting="type"]');
    if (!select) return;
    select.replaceChildren(...[
      ...CREEPY_TYPES,
      ...customCreeps.map(creepy => ({ id: creepy.tileId, name: creepy.name }))
    ].map(creepy => new Option(creepy.name, creepy.id)));
    if (selectedType && [...select.options].some(option => option.value === selectedType)) {
      this.selectedCreepyType = selectedType;
    } else if (![...select.options].some(option => option.value === this.selectedCreepyType)) {
      this.selectedCreepyType = 'Goomba';
    }
    select.value = this.selectedCreepyType;
    this.setCreepyConfigControls(this.creepyConfigs[this.selectedCreepyType]);
    this.updateCreepyPreview();
  }

  updateCreepyPreview() {
    const custom = this.customCreeps.find(creepy => creepy.tileId === this.selectedCreepyType);
    this.renderCreepyPreview(custom?.dataUrl);
    const activeLabel = this.container.querySelector('[data-group-active="creepy"]');
    if (activeLabel) {
      activeLabel.textContent = this.container.querySelector('[data-creepy-setting="type"]')
        ?.selectedOptions[0]?.textContent || 'Creepy';
    }
    this.eventBus.emit('getCreepyPreview', this.selectedCreepyType);
  }

  renderCreepyPreview(dataUrl, frameWidth, frameHeight) {
    const preview = this.container.querySelector('[data-tile-id="Creepy"] .tile-icon');
    if (!preview) return;
    const custom = this.customCreeps.find(creepy => creepy.tileId === this.selectedCreepyType);
    const imageUrl = dataUrl || custom?.dataUrl;
    if (imageUrl) {
      if (frameWidth && frameHeight) {
        const frame = document.createElement('span');
        frame.className = 'sprite-preview-frame';
        frame.setAttribute('role', 'img');
        frame.setAttribute('aria-label', `${custom?.name || this.selectedCreepyType} preview`);
        frame.style.backgroundImage = `url("${imageUrl}")`;
        preview.replaceChildren(frame);
        return;
      }
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = `${custom?.name || this.selectedCreepyType} preview`;
      preview.replaceChildren(image);
      return;
    }
    const icons = {
      Goomba: '🐞', Koopa: '🐢', Bat: '🦇',
      'Creepy-Firefly': '✨', 'Creepy-CloudPuff': '☁️', 'Creepy-Jellyfish': '🪼',
      'Creepy-Ladybug': '🐞', 'Creepy-Hedgehog': '🦔', 'Creepy-Duckling': '🐥',
      'Creepy-FoxKit': '🦊', 'Creepy-Bumblebee': '🐝', 'Creepy-Froglet': '🐸',
      'Creepy-Starfish': '⭐', 'Creepy-Ghost': '👻', 'Creepy-MiniDino': '🦕'
    };
    preview.textContent = icons[this.selectedCreepyType] || '👾';
  }

  openCreepyUploadDialog() {
    this.closeCreepyUploadDialog();
    this.creepyDialog = document.createElement('section');
    this.creepyDialog.className = 'animation-modal';
    this.creepyDialog.setAttribute('role', 'dialog');
    this.creepyDialog.setAttribute('aria-modal', 'true');
    this.creepyDialog.setAttribute('aria-labelledby', 'creepy-dialog-title');
    this.creepyDialog.innerHTML = `
      <div class="animation-dialog boss-dialog">
        <header class="animation-dialog-header">
          <div>
            <span class="eyebrow">CUSTOM CREATURE</span>
            <h2 id="creepy-dialog-title">Add a creepy</h2>
            <p>Upload an image and set its movement, speed, and health. You can add motion sheets later.</p>
          </div>
          <button class="animation-dialog-close" type="button" aria-label="Close creature dialog">✕</button>
        </header>
        <div class="boss-upload-content creepy-upload-content">
          <div class="boss-upload-preview" data-creepy-upload-preview aria-label="Creature image preview">👾</div>
          <label class="boss-upload-field">
            Creature name
            <input type="text" data-creepy-upload-name maxlength="40" placeholder="My creature" autocomplete="off">
          </label>
          <label class="boss-upload-field">Movement
            <select data-creepy-upload-movement>
              <option value="ground">Ground patrol</option>
              <option value="flying">Flying</option>
            </select>
          </label>
          <label class="boss-upload-field">Speed
            <input type="number" data-creepy-upload-speed min="20" max="180" step="5" value="50">
          </label>
          <label class="boss-upload-field">Health
            <input type="number" data-creepy-upload-health min="1" max="5" step="1" value="1">
          </label>
          <label class="animation-upload-button boss-image-upload">
            <span>Choose image</span>
            <input type="file" data-creepy-upload-image accept="image/png,image/jpeg,image/webp" aria-label="Upload creature image">
          </label>
          <span class="variant-help">PNG, JPEG, or WebP · up to 5 MB and 4096 × 4096 pixels.</span>
          <p class="boss-upload-error" data-creepy-upload-error role="alert" hidden></p>
        </div>
        <footer class="animation-dialog-footer">
          <span>Custom creatures are saved with this level.</span>
          <span>
            <button class="secondary-button" type="button" data-cancel-creepy>Cancel</button>
            <button class="primary-button" type="button" data-save-creepy>Add creature</button>
          </span>
        </footer>
      </div>
    `;
    document.body.appendChild(this.creepyDialog);
    const dialog = this.creepyDialog;
    dialog.querySelector('.animation-dialog-close').addEventListener('click', () => this.closeCreepyUploadDialog());
    dialog.querySelector('[data-cancel-creepy]').addEventListener('click', () => this.closeCreepyUploadDialog());
    dialog.addEventListener('pointerdown', event => {
      if (event.target === dialog) this.closeCreepyUploadDialog();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.closeCreepyUploadDialog();
    });
    const nameInput = dialog.querySelector('[data-creepy-upload-name]');
    const fileInput = dialog.querySelector('[data-creepy-upload-image]');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (!nameInput.value.trim()) nameInput.value = file.name.replace(/\.[^.]+$/, '').slice(0, 40);
      this.previewCreepyUpload(file, dialog);
    });
    dialog.querySelector('[data-save-creepy]').addEventListener('click', () => this.handleCreepyUpload(dialog));
    dialog.querySelector('.animation-dialog-close').focus();
  }

  closeCreepyUploadDialog() {
    this.creepyDialog?.remove();
    this.creepyDialog = null;
  }

  async previewCreepyUpload(file, dialog) {
    const preview = dialog.querySelector('[data-creepy-upload-preview]');
    try {
      if (file.size > 5 * 1024 * 1024) throw new RangeError('Choose an image that is 5 MB or smaller.');
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        throw new TypeError('Choose a PNG, JPEG, or WebP image for the creature.');
      }
      const dataUrl = await this.readBossImage(file);
      const image = await this.decodeBossImage(dataUrl);
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        throw new RangeError('Creature images must be no larger than 4096 × 4096 pixels.');
      }
      const previewImage = document.createElement('img');
      previewImage.src = dataUrl;
      previewImage.alt = 'Custom creature preview';
      preview.replaceChildren(previewImage);
      dialog.querySelector('[data-creepy-upload-error]').hidden = true;
    } catch (error) {
      this.showCreepyUploadError(dialog, error);
    }
  }

  async handleCreepyUpload(dialog) {
    const button = dialog.querySelector('[data-save-creepy]');
    const file = dialog.querySelector('[data-creepy-upload-image]').files?.[0];
    button.disabled = true;
    try {
      const name = dialog.querySelector('[data-creepy-upload-name]').value.trim();
      const movement = dialog.querySelector('[data-creepy-upload-movement]').value;
      const speed = Number(dialog.querySelector('[data-creepy-upload-speed]').value);
      const health = Number(dialog.querySelector('[data-creepy-upload-health]').value);
      if (!name || name.length > 40) throw new TypeError('Enter a creature name up to 40 characters long.');
      if (!file) throw new TypeError('Choose an image for your creature.');
      if (!Number.isInteger(speed) || speed < 20 || speed > 180) throw new RangeError('Creature speed must be 20–180 px/s.');
      if (!Number.isInteger(health) || health < 1 || health > 5) throw new RangeError('Creature health must be 1–5 hits.');
      const dataUrl = await this.readBossImage(file);
      const image = await this.decodeBossImage(dataUrl);
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        throw new RangeError('Creature images must be no larger than 4096 × 4096 pixels.');
      }
      this.eventBus.emit('customCreepyUploaded', {
        id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        dataUrl,
        fileName: file.name,
        fileType: file.type,
        imageWidth: image.naturalWidth,
        imageHeight: image.naturalHeight,
        movement,
        speed,
        health
      });
      this.closeCreepyUploadDialog();
    } catch (error) {
      this.showCreepyUploadError(dialog, error);
    } finally {
      if (dialog.isConnected) button.disabled = false;
    }
  }

  showCreepyUploadError(dialog, error) {
    const errorElement = dialog.querySelector('[data-creepy-upload-error]');
    errorElement.textContent = error.message || 'The creature image could not be added.';
    errorElement.hidden = false;
    this.eventBus.emit('status', errorElement.textContent);
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
    const image = document.createElement('img');
    image.src = customBoss?.dataUrl || characterArt.bosses[type] || bossPreviewDataUrl(type);
    image.alt = `${customBoss?.name || BOSS_TYPES.find(boss => boss.id === type)?.name || 'Boss'} preview`;
    preview.replaceChildren(image);
    const activeLabel = this.container.querySelector('[data-group-active="boss"]');
    if (activeLabel) activeLabel.textContent = image.alt.replace(/ preview$/, '');
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
    const animations = ANIMATIONS[entityType] ||
      (CREEPY_TYPES.some(type => type.id === entityType) ||
        this.customCreeps.some(creepy => creepy.tileId === entityType)
        ? [
            { id: 'idle', label: 'Idle', description: 'Standing still or hovering' },
            { id: 'walk', label: 'Move', description: 'Walking or flying' }
          ]
        : null);
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
      if (row) {
        row.querySelector('[data-animation-width]').value =
          animation.source === 'builtin' ? 32 : animation.frameWidth || 32;
        row.querySelector('[data-animation-height]').value =
          animation.source === 'builtin' ? 32 : animation.frameHeight || 32;
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

  setPlayerCharacter(characterId) {
    const character = PLAYER_CHARACTERS.find(item => item.id === characterId);
    if (!character) return;
    this.playerCharacterId = character.id;
    const select = this.container.querySelector('[data-player-character]');
    if (select) select.value = character.id;
    const preview = this.container.querySelector('[data-tile-id="Player"] .tile-icon');
    if (preview) {
      const image = document.createElement('img');
      image.src = character.preview;
      image.alt = `${character.name} preview`;
      preview.replaceChildren(image);
    }
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
