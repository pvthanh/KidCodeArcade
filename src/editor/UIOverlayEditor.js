import { ClearGridCommand, ResizeWorldCommand } from '../core/CommandManager.js';
import { WORLD_THEMES } from '../core/StateManager.js';

export class UIOverlayEditor {
  constructor(toolbarId, stateManager, commandManager, eventBus, gridCanvas, demoLevels = []) {
    this.toolbar = document.getElementById(toolbarId);
    if (!this.toolbar) throw new Error(`Toolbar element "${toolbarId}" was not found.`);
    this.stateManager = stateManager;
    this.commandManager = commandManager;
    this.eventBus = eventBus;
    this.gridCanvas = gridCanvas;
    this.demoLevels = demoLevels.map(level => ({
      name: level.name,
      hint: level.hint || '',
      snapshot: JSON.parse(JSON.stringify(level.snapshot))
    }));
    this.levels = this.demoLevels.map(level => ({
      name: level.name,
      hint: level.hint,
      snapshot: JSON.parse(JSON.stringify(level.snapshot))
    }));
    this.currentLevelIndex = 0;
    this.render();
    this.bindEvents();
  }

  render() {
    this.toolbar.innerHTML = `
      <div class="campaign-controls">
        <label for="campaign-level">Campaign</label>
        <select id="campaign-level" aria-label="Campaign level"></select>
        <button id="add-campaign-level" class="secondary-button toolbar-icon-button" type="button"
          aria-label="Add level" data-tooltip="Add level">＋</button>
        <button id="remove-campaign-level" class="secondary-button toolbar-icon-button" type="button"
          aria-label="Remove level" data-tooltip="Remove level">−</button>
        <button id="save-campaign" class="secondary-button toolbar-icon-button" type="button"
          aria-label="Save campaign" data-tooltip="Save campaign">💾</button>
        <button id="open-campaign-button" class="secondary-button toolbar-icon-button" type="button"
          aria-label="Open campaign" data-tooltip="Open campaign">📂</button>
        <input id="open-campaign" type="file" accept="application/json,.json" hidden>
      </div>
      <dialog id="new-level-dialog" class="level-dialog" aria-labelledby="new-level-title">
        <form id="new-level-form" class="level-dialog-form">
          <header class="level-dialog-header">
            <span class="eyebrow">CAMPAIGN</span>
            <h2 id="new-level-title">Create a level</h2>
            <p>Choose a name and where it belongs. You’ll start with a blank board.</p>
          </header>
          <label class="level-dialog-field" for="new-level-name">
            Level name
            <input id="new-level-name" name="name" type="text" maxlength="60" required
              autocomplete="off" placeholder="e.g. Forest Run">
          </label>
          <label class="level-dialog-field" for="new-level-position">
            Campaign position
            <select id="new-level-position" name="position"></select>
          </label>
          <footer class="level-dialog-actions">
            <button id="cancel-new-level" class="secondary-button" type="button">Cancel</button>
            <button class="primary-button" type="submit">Create level</button>
          </footer>
        </form>
      </dialog>
      <form class="world-size-form" id="world-size-form">
        <span class="toolbar-label">World size</span>
        <label>Width <input id="world-cols" type="number" min="8" max="256" step="1" value="${this.stateManager.cols}"></label>
        <span class="dimension-separator">×</span>
        <label>Height <input id="world-rows" type="number" min="8" max="40" step="1" value="${this.stateManager.rows}"></label>
        <span class="toolbar-unit">tiles</span>
        <button class="secondary-button toolbar-icon-button" type="submit"
          aria-label="Resize world" data-tooltip="Resize world">↔</button>
      </form>
      <div class="toolbar-actions">
        <label class="world-theme-control" title="Choose the scenery and world colors">
          <span class="world-theme-icon" aria-hidden="true">🌍</span>
          <select id="world-theme" aria-label="World theme">
            ${WORLD_THEMES.map(theme => `
              <option value="${theme.id}" ${theme.id === this.stateManager.worldTheme ? 'selected' : ''}>
                ${theme.name}
              </option>
            `).join('')}
          </select>
        </label>
        <span class="toolbar-divider" aria-hidden="true"></span>
        <button id="toggle-board-pan" class="secondary-button toolbar-icon-button" type="button"
          aria-pressed="false" aria-label="Move the board by dragging" data-tooltip="Move board">✋</button>
        <button id="load-demo" class="secondary-button toolbar-icon-button" type="button"
          aria-label="Load demo levels" data-tooltip="Load demo levels">🎮</button>
        <button id="save-level" class="secondary-button toolbar-icon-button" type="button"
          aria-label="Save level" data-tooltip="Save level">💾</button>
        <button id="load-level-button" class="secondary-button toolbar-icon-button" type="button"
          aria-label="Open level" data-tooltip="Open level">📂</button>
        <input id="load-level" type="file" accept="application/json,.json" hidden>
        <button id="clear-level" class="secondary-button toolbar-icon-button" type="button"
          aria-label="Clear level" data-tooltip="Clear level">🧹</button>
        <button id="sound-settings" class="secondary-button toolbar-icon-button" type="button"
          aria-label="Sound settings" data-tooltip="Sound settings">♫</button>
        <button id="play-btn" class="primary-button toolbar-icon-button toolbar-play-button" type="button"
          aria-label="Play level" data-tooltip="Play level">▶</button>
      </div>
      <span id="status-text" class="status-text" role="status" aria-live="polite">Ready</span>
    `;
    this.renderCampaignOptions();
  }

  bindEvents() {
    this.toolbar.querySelector('#world-theme').addEventListener('change', event => {
      try {
        this.stateManager.setWorldTheme(event.target.value);
        this.gridCanvas.refresh();
        this.saveCurrentLevel();
        this.setStatus(`World theme changed to ${event.target.selectedOptions[0].textContent.trim()}.`);
      } catch (error) {
        event.target.value = this.stateManager.worldTheme;
        this.setStatus(error.message);
      }
    });

    this.toolbar.querySelector('#world-size-form').addEventListener('submit', event => {
      event.preventDefault();
      const cols = Number(this.toolbar.querySelector('#world-cols').value);
      const rows = Number(this.toolbar.querySelector('#world-rows').value);
      try {
        if (this.commandManager.executeWithManager(new ResizeWorldCommand(cols, rows), this.stateManager)) {
          this.eventBus.emit('worldResized', { cols, rows });
          this.updateHistory();
          this.setStatus(`World resized to ${cols} × ${rows}.`);
        }
      } catch (error) {
        this.setStatus(error.message);
      }
    });

    this.toolbar.querySelector('#clear-level').addEventListener('click', () => {
      if (!window.confirm('Clear every tile in this level?')) return;
      this.commandManager.executeWithManager(new ClearGridCommand(), this.stateManager);
      this.gridCanvas.refresh();
      this.updateHistory();
      this.setStatus('Level cleared.');
    });
    this.toolbar.querySelector('#load-demo').addEventListener('click', () => {
      this.levels = this.demoLevels.map(level => ({
        name: level.name,
        hint: level.hint,
        snapshot: JSON.parse(JSON.stringify(level.snapshot))
      }));
      this.currentLevelIndex = 0;
      this.applyLevelSnapshot(this.levels[0].snapshot);
      this.setStatus('Three demo levels loaded. Play Toolbox Adventure to explore every tool.');
    });
    this.toolbar.querySelector('#campaign-level').addEventListener('change', event => {
      this.switchCampaignLevel(Number(event.target.value));
    });
    this.toolbar.querySelector('#add-campaign-level').addEventListener('click', () => this.showNewLevelDialog());
    this.toolbar.querySelector('#new-level-form').addEventListener('submit', event => {
      event.preventDefault();
      const nameInput = this.toolbar.querySelector('#new-level-name');
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.setCustomValidity('Enter a name for this level.');
        nameInput.reportValidity();
        return;
      }
      nameInput.setCustomValidity('');
      const position = Number(this.toolbar.querySelector('#new-level-position').value);
      this.toolbar.querySelector('#new-level-dialog').close();
      this.addCampaignLevel(name, position);
    });
    this.toolbar.querySelector('#new-level-name').addEventListener('input', event =>
      event.currentTarget.setCustomValidity(''));
    this.toolbar.querySelector('#cancel-new-level').addEventListener('click', () =>
      this.toolbar.querySelector('#new-level-dialog').close());
    this.toolbar.querySelector('#toggle-board-pan').addEventListener('click', event => {
      const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true';
      event.currentTarget.setAttribute('aria-pressed', String(enabled));
      event.currentTarget.textContent = enabled ? '✋ Move board: On' : '✋ Move board';
      this.eventBus.emit('boardPanModeChanged', enabled);
      this.setStatus(enabled
        ? 'Move board is on. Drag the canvas to pan; tap Move board again to paint.'
        : 'Move board is off. Choose a tool and drag to paint.');
    });
    this.toolbar.querySelector('#remove-campaign-level').addEventListener('click', () => this.removeCampaignLevel());
    this.toolbar.querySelector('#save-campaign').addEventListener('click', () => this.saveCampaign());
    this.toolbar.querySelector('#open-campaign-button').addEventListener('click', () =>
      this.toolbar.querySelector('#open-campaign').click());
    this.toolbar.querySelector('#open-campaign').addEventListener('change', event =>
      this.loadCampaign(event.target.files?.[0]));
    this.toolbar.querySelector('#save-level').addEventListener('click', () => this.saveLevel());
    this.toolbar.querySelector('#load-level-button').addEventListener('click', () => this.toolbar.querySelector('#load-level').click());
    this.toolbar.querySelector('#load-level').addEventListener('change', event => this.loadLevel(event.target.files?.[0]));
    this.toolbar.querySelector('#sound-settings').addEventListener('click', () => this.eventBus.emit('openSoundSettings'));
    this.toolbar.querySelector('#play-btn').addEventListener('click', () => this.eventBus.emit('play'));
    this.eventBus.on('status', message => this.setStatus(message));
  }

  setStatus(message) {
    this.toolbar.querySelector('#status-text').textContent = message;
  }

  updateHistory() {
    this.eventBus.emit('historyChanged', {
      canUndo: this.commandManager.canUndo(),
      canRedo: this.commandManager.canRedo()
    });
  }

  syncWorldSize() {
    this.toolbar.querySelector('#world-cols').value = this.stateManager.cols;
    this.toolbar.querySelector('#world-rows').value = this.stateManager.rows;
  }

  renderCampaignOptions() {
    const select = this.toolbar.querySelector('#campaign-level');
    select.replaceChildren(...this.levels.map((level, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `Level ${index + 1}: ${level.name}`;
      return option;
    }));
    select.value = String(this.currentLevelIndex);
    this.toolbar.querySelector('#remove-campaign-level').disabled = this.levels.length <= 1;
    this.toolbar.querySelector('#add-campaign-level').disabled = this.levels.length >= 50;
  }

  applyLevelSnapshot(snapshot) {
    this.stateManager.restoreWorld(snapshot);
    this.toolbar.querySelector('#world-theme').value = this.stateManager.worldTheme;
    this.commandManager.clearHistory();
    this.syncWorldSize();
    this.gridCanvas.refresh();
    for (const [tileId, metadata] of Object.entries(this.stateManager.spriteMetadata)) {
      if (metadata.dataUrl) this.eventBus.emit('spriteUploaded', { tileId, ...metadata });
      for (const [animationType, animation] of Object.entries(metadata.animations || {})) {
        this.eventBus.emit('spriteAnimationUploaded', {
          entityType: tileId,
          animationType,
          ...animation
        });
      }
    }
    this.eventBus.emit('tileVariantsChanged', {
      catalog: this.stateManager.tileVariantCatalog,
      selectedTileVariants: this.stateManager.selectedTileVariants
    });
    this.eventBus.emit('levelLoaded', {
      activeTileType: this.stateManager.activeTileType,
      playerCharacterId: this.stateManager.playerCharacterId,
      mysteryBoxReward: this.stateManager.mysteryBoxReward,
      bossConfig: this.stateManager.bossConfig,
      customBosses: this.stateManager.customBosses,
      customCreeps: this.stateManager.customCreeps,
      creepyConfigs: this.stateManager.creepyConfigs
    });
    this.updateHistory();
    this.renderCampaignOptions();
  }

  saveCurrentLevel() {
    if (this.levels[this.currentLevelIndex]) {
      this.levels[this.currentLevelIndex].snapshot = this.stateManager.getWorldSnapshot();
    }
  }

  switchCampaignLevel(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.levels.length ||
      index === this.currentLevelIndex) return;
    this.saveCurrentLevel();
    this.currentLevelIndex = index;
    this.applyLevelSnapshot(this.levels[index].snapshot);
    this.setStatus(`Editing level ${index + 1}: ${this.levels[index].name}.`);
  }

  showNewLevelDialog() {
    if (this.levels.length >= 50) {
      this.setStatus('A campaign can contain up to 50 levels.');
      return;
    }
    const positionSelect = this.toolbar.querySelector('#new-level-position');
    const positions = this.levels.map((level, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `Before Level ${index + 1}: ${level.name}`;
      return option;
    });
    const finalPosition = document.createElement('option');
    finalPosition.value = String(this.levels.length);
    finalPosition.textContent = `After Level ${this.levels.length}: ${this.levels.at(-1).name}`;
    positions.push(finalPosition);
    positionSelect.replaceChildren(...positions);
    positionSelect.value = String(Math.min(this.currentLevelIndex + 1, this.levels.length));
    const nameInput = this.toolbar.querySelector('#new-level-name');
    nameInput.value = '';
    nameInput.setCustomValidity('');
    this.toolbar.querySelector('#new-level-dialog').showModal();
    nameInput.focus();
  }

  addCampaignLevel(name, position) {
    if (this.levels.length >= 50) {
      this.setStatus('A campaign can contain up to 50 levels.');
      return;
    }
    if (!Number.isInteger(position) || position < 0 || position > this.levels.length) {
      throw new RangeError('Choose a valid position in the campaign.');
    }
    this.saveCurrentLevel();
    const snapshot = this.stateManager.getWorldSnapshot();
    snapshot.tiles = Array.from({ length: snapshot.rows }, (_, row) =>
      Array(snapshot.cols).fill(null));
    snapshot.tileVariants = Array.from({ length: snapshot.rows }, () =>
      Array(snapshot.cols).fill(null));
    snapshot.activeTileType = 'Player';
    this.levels.splice(position, 0, { name: name.trim(), hint: '', snapshot });
    this.currentLevelIndex = position;
    this.applyLevelSnapshot(snapshot);
    this.setStatus(`${name.trim()} added as level ${position + 1}. The empty board is ready to build.`);
  }

  removeCampaignLevel() {
    if (this.levels.length <= 1) return;
    const levelName = this.levels[this.currentLevelIndex].name;
    if (!window.confirm(`Remove "${levelName}" from this campaign?`)) return;
    this.levels.splice(this.currentLevelIndex, 1);
    this.currentLevelIndex = Math.min(this.currentLevelIndex, this.levels.length - 1);
    this.applyLevelSnapshot(this.levels[this.currentLevelIndex].snapshot);
    this.setStatus(`${levelName} removed from the campaign.`);
  }

  getCampaignLevel(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.levels.length) return null;
    if (index === this.currentLevelIndex) this.saveCurrentLevel();
    return {
      name: this.levels[index].name,
      hint: this.levels[index].hint || '',
      snapshot: JSON.parse(JSON.stringify(this.levels[index].snapshot))
    };
  }

  getCampaignLength() {
    return this.levels.length;
  }

  saveCampaign() {
    this.saveCurrentLevel();
    const campaign = {
      format: 'little-level-lab-campaign',
      version: 1,
      levels: this.levels
    };
    const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-platformer-campaign.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.setStatus(`Campaign with ${this.levels.length} levels downloaded.`);
  }

  async loadCampaign(file) {
    if (!file) return;
    try {
      const campaign = JSON.parse(await file.text());
      if (campaign?.format !== 'little-level-lab-campaign' || campaign.version !== 1 ||
        !Array.isArray(campaign.levels) || campaign.levels.length < 1 || campaign.levels.length > 50) {
        throw new TypeError('This is not a supported campaign file.');
      }
      const levels = campaign.levels.map((level, index) => {
        if (typeof level?.name !== 'string' || !level.name.trim()) {
          throw new TypeError(`Campaign level ${index + 1} needs a name.`);
        }
        this.stateManager.validateWorld(level.snapshot);
        if (level.hint !== undefined &&
          (typeof level.hint !== 'string' || level.hint.length > 200)) {
          throw new TypeError(`Campaign level ${index + 1} has an invalid hint.`);
        }
        return {
          name: level.name.trim().slice(0, 60),
          hint: level.hint || '',
          snapshot: JSON.parse(JSON.stringify(level.snapshot))
        };
      });
      this.levels = levels;
      this.currentLevelIndex = 0;
      this.applyLevelSnapshot(levels[0].snapshot);
      this.setStatus(`Loaded campaign "${file.name}" with ${levels.length} levels.`);
    } catch (error) {
      console.error('Could not load campaign:', error);
      this.setStatus(`Could not load campaign: ${error.message}`);
    } finally {
      this.toolbar.querySelector('#open-campaign').value = '';
    }
  }

  saveLevel() {
    this.saveCurrentLevel();
    const blob = new Blob([this.stateManager.serialize()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-platformer-level.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.setStatus('Level downloaded.');
  }

  async loadLevel(file) {
    if (!file) return;
    try {
      const serialized = await file.text();
      const snapshot = JSON.parse(serialized);
      this.stateManager.restoreWorld(snapshot);
      this.levels[this.currentLevelIndex].snapshot = this.stateManager.getWorldSnapshot();
      this.applyLevelSnapshot(this.stateManager.getWorldSnapshot());
      this.setStatus(`Loaded ${file.name}.`);
    } catch (error) {
      console.error('Could not load level:', error);
      this.setStatus(`Could not load level: ${error.message}`);
    } finally {
      this.toolbar.querySelector('#load-level').value = '';
    }
  }
}
