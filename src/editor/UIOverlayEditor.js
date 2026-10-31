import { ClearGridCommand, ResizeWorldCommand } from '../core/CommandManager.js';

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
      snapshot: JSON.parse(JSON.stringify(level.snapshot))
    }));
    this.levels = this.demoLevels.map(level => ({
      name: level.name,
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
        <button id="add-campaign-level" class="secondary-button" type="button">＋ Level</button>
        <button id="remove-campaign-level" class="secondary-button" type="button">− Level</button>
        <button id="save-campaign" class="secondary-button" type="button">Save campaign</button>
        <button id="open-campaign-button" class="secondary-button" type="button">Open campaign</button>
        <input id="open-campaign" type="file" accept="application/json,.json" hidden>
      </div>
      <form class="world-size-form" id="world-size-form">
        <span class="toolbar-label">World size</span>
        <label>Width <input id="world-cols" type="number" min="8" max="256" step="1" value="${this.stateManager.cols}"></label>
        <span class="dimension-separator">×</span>
        <label>Height <input id="world-rows" type="number" min="8" max="40" step="1" value="${this.stateManager.rows}"></label>
        <span class="toolbar-unit">tiles</span>
        <button class="secondary-button" type="submit">Resize</button>
      </form>
      <div class="toolbar-actions">
        <button id="load-demo" class="secondary-button" type="button">Load demos</button>
        <button id="save-level" class="secondary-button" type="button">Save</button>
        <button id="load-level-button" class="secondary-button" type="button">Open</button>
        <input id="load-level" type="file" accept="application/json,.json" hidden>
        <button id="clear-level" class="secondary-button" type="button">Clear</button>
        <button id="sound-settings" class="secondary-button" type="button">♫ Sounds</button>
        <button id="play-btn" class="primary-button" type="button">▶ Play level</button>
      </div>
      <span id="status-text" class="status-text" role="status" aria-live="polite">Ready</span>
    `;
    this.renderCampaignOptions();
  }

  bindEvents() {
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
        snapshot: JSON.parse(JSON.stringify(level.snapshot))
      }));
      this.currentLevelIndex = 0;
      this.applyLevelSnapshot(this.levels[0].snapshot);
      this.setStatus('Two demo levels loaded. Play level 1 and continue to level 2.');
    });
    this.toolbar.querySelector('#campaign-level').addEventListener('change', event => {
      this.switchCampaignLevel(Number(event.target.value));
    });
    this.toolbar.querySelector('#add-campaign-level').addEventListener('click', () => this.addCampaignLevel());
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
    this.eventBus.emit('levelLoaded', {
      activeTileType: this.stateManager.activeTileType,
      mysteryBoxReward: this.stateManager.mysteryBoxReward
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

  addCampaignLevel() {
    if (this.levels.length >= 50) {
      this.setStatus('A campaign can contain up to 50 levels.');
      return;
    }
    this.saveCurrentLevel();
    const snapshot = this.stateManager.getWorldSnapshot();
    snapshot.tiles = Array.from({ length: snapshot.rows }, (_, row) =>
      Array.from({ length: snapshot.cols }, () => row === snapshot.rows - 1 ? 'Ground' : null));
    snapshot.tiles[snapshot.rows - 2][1] = 'Player';
    snapshot.activeTileType = 'Ground';
    const name = `New level ${this.levels.length + 1}`;
    this.levels.push({ name, snapshot });
    this.currentLevelIndex = this.levels.length - 1;
    this.applyLevelSnapshot(snapshot);
    this.setStatus(`${name} added. Build it, then use Play level to test the campaign.`);
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
        return {
          name: level.name.trim().slice(0, 60),
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
