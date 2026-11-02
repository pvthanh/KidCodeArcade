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
        <button id="pipe-link-button" class="secondary-button toolbar-icon-button" type="button"
          aria-label="Configure pipe link" data-tooltip="Pipe link">🔗</button>
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
      <dialog id="pipe-link-dialog" class="level-dialog" aria-labelledby="pipe-link-title">
        <form id="pipe-link-form" class="level-dialog-form">
          <header class="level-dialog-header">
            <span class="eyebrow">AREA TRAVEL</span>
            <h2 id="pipe-link-title">Connect this area’s pipes</h2>
            <p>Every pipe in this area leads to the chosen area. Pipes need to be placed on the board.</p>
          </header>
          <label class="level-dialog-field" for="pipe-destination">
            Destination area
            <select id="pipe-destination" name="destination"></select>
          </label>
          <p class="pipe-arrival-note">Choose the landing tile in the destination area. Set a return link there to travel back.</p>
          <div class="pipe-arrival-fields">
            <label class="level-dialog-field" for="pipe-arrival-row">
              Arrival row
              <input id="pipe-arrival-row" name="arrivalRow" type="number" min="1" step="1">
            </label>
            <label class="level-dialog-field" for="pipe-arrival-col">
              Arrival column
              <input id="pipe-arrival-col" name="arrivalCol" type="number" min="1" step="1">
            </label>
          </div>
          <footer class="level-dialog-actions">
            <button id="cancel-pipe-link" class="secondary-button" type="button">Cancel</button>
            <button class="primary-button" type="submit">Save pipe link</button>
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
        <button id="help-button" class="secondary-button toolbar-icon-button help-icon-button" type="button"
          aria-label="How to use Little Level Lab" data-tooltip="Help">?</button>
        <button id="play-btn" class="primary-button toolbar-icon-button toolbar-play-button" type="button"
          aria-label="Play level" data-tooltip="Play level">▶</button>
      </div>
      <dialog id="help-dialog" class="help-dialog" aria-labelledby="help-title">
        <header class="help-dialog-header">
          <div>
            <span class="eyebrow">A FRIENDLY START</span>
            <h2 id="help-title">Let’s build a little adventure!</h2>
            <p>Pick a tool, make a path, and press Play to try your level.</p>
          </div>
          <button class="help-dialog-close" type="button" aria-label="Close help">×</button>
        </header>
        <div class="help-dialog-content">
          <svg class="help-illustration" viewBox="0 0 640 190" role="img"
            aria-label="A happy hero walking across a path of grass and blocks toward a flag">
            <rect x="0" y="0" width="640" height="190" rx="18" fill="#dff4ff"/>
            <circle cx="548" cy="43" r="23" fill="#ffd66e"/>
            <path d="M0 129 Q112 84 225 129 T450 129 T680 129 V190 H0Z" fill="#a8d89b"/>
            <rect x="0" y="151" width="640" height="39" fill="#916c4f"/>
            <rect x="0" y="145" width="640" height="10" rx="4" fill="#58a65c"/>
            <rect x="240" y="112" width="62" height="33" rx="5" fill="#bc7956"/>
            <path d="M244 128h54M271 113v15m-27 1v15m54-15v15" stroke="#f1c99c" stroke-width="3"/>
            <rect x="323" y="112" width="62" height="33" rx="5" fill="#e5ae42"/>
            <text x="354" y="136" text-anchor="middle" fill="#fff" font-size="24" font-weight="800">?</text>
            <path d="M463 112v34" stroke="#765b90" stroke-width="5"/>
            <path d="M466 114l35 10-35 10z" fill="#ff7c78"/>
            <circle cx="137" cy="112" r="13" fill="#ffd34e" stroke="#dc9b32" stroke-width="3"/>
            <path d="M132 112h10m-5-5v10" stroke="#fff" stroke-width="2"/>
            <rect x="79" y="108" width="36" height="37" rx="12" fill="#347bd1"/>
            <circle cx="97" cy="99" r="15" fill="#ffd2a3"/>
            <path d="M83 96q3-18 17-11 13 3 12 13z" fill="#6651a0"/>
            <circle cx="92" cy="100" r="2" fill="#294354"/>
            <circle cx="103" cy="100" r="2" fill="#294354"/>
            <path d="M91 107q6 5 12 0" fill="none" stroke="#bd6555" stroke-width="2"/>
            <path d="M86 142l-8 9m29-9 8 9" stroke="#294354" stroke-width="5" stroke-linecap="round"/>
          </svg>
          <div class="help-steps">
            <article class="help-step">
              <span class="help-step-number">1</span>
              <div><h3>Choose a tool</h3><p>Tap a tool on the left or use the quick icons under the board.</p></div>
            </article>
            <article class="help-step">
              <span class="help-step-number">2</span>
              <div><h3>Draw your world</h3><p>Click or drag on the board to place ground, blocks, coins, creatures, and a goal flag.</p></div>
            </article>
            <article class="help-step">
              <span class="help-step-number">3</span>
              <div><h3>Make it yours</h3><p>Choose a hero, change the scenery, add sounds, or build more levels in your campaign.</p></div>
            </article>
            <article class="help-step">
              <span class="help-step-number">4</span>
              <div><h3>Play and save</h3><p>Press ▶ to test. When you’re happy, use Save Level or Save Campaign to download your work.</p></div>
            </article>
          </div>
          <div class="help-controls">
            <strong>How to play:</strong>
            <span>← / → or A / D move</span><span>Space, ↑ or W jump</span>
            <span>↓ / S or ↑ by a pipe to travel</span><span>Shift run</span>
          </div>
          <p class="help-parent-tip"><strong>Grown-up tip:</strong> Use Undo if a tile lands in the wrong place. Ready-made demo levels are available from the Campaign menu.</p>
        </div>
        <footer class="help-dialog-footer">
          <button class="primary-button" type="button" data-close-help>Let’s play!</button>
        </footer>
      </dialog>
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
      this.setStatus(`${this.levels.length} showcase levels loaded. Play through the campaign to explore the whole toolbox.`);
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
      event.currentTarget.setAttribute(
        'aria-label',
        enabled ? 'Move the board by dragging (on)' : 'Move the board by dragging'
      );
      event.currentTarget.dataset.tooltip = enabled ? 'Move board: On' : 'Move board';
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
    this.toolbar.querySelector('#pipe-link-button').addEventListener('click', () =>
      this.showPipeLinkDialog());
    this.toolbar.querySelector('#pipe-destination').addEventListener('change', event =>
      this.syncPipeArrivalFields(event.target.value === '' ? null : Number(event.target.value)));
    this.toolbar.querySelector('#cancel-pipe-link').addEventListener('click', () =>
      this.toolbar.querySelector('#pipe-link-dialog').close());
    this.toolbar.querySelector('#pipe-link-form').addEventListener('submit', event => {
      event.preventDefault();
      try {
        this.savePipeLink();
      } catch (error) {
        console.error('Could not save pipe link:', error);
        this.setStatus(`Could not save pipe link: ${error.message}`);
      }
    });
    this.toolbar.querySelector('#save-level').addEventListener('click', () => this.saveLevel());
    this.toolbar.querySelector('#load-level-button').addEventListener('click', () => this.toolbar.querySelector('#load-level').click());
    this.toolbar.querySelector('#load-level').addEventListener('change', event => this.loadLevel(event.target.files?.[0]));
    this.toolbar.querySelector('#sound-settings').addEventListener('click', () => this.eventBus.emit('openSoundSettings'));
    const helpDialog = this.toolbar.querySelector('#help-dialog');
    this.toolbar.querySelector('#help-button').addEventListener('click', () => helpDialog.showModal());
    this.toolbar.querySelectorAll('.help-dialog-close, [data-close-help]').forEach(button => {
      button.addEventListener('click', () => helpDialog.close());
    });
    helpDialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') helpDialog.close();
    });
    helpDialog.addEventListener('click', event => {
      if (event.target === helpDialog) helpDialog.close();
    });
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
    const destinationSelect = this.toolbar.querySelector('#pipe-destination');
    if (destinationSelect) {
      destinationSelect.replaceChildren(new Option('Not connected', ''));
      this.levels.forEach((level, index) => {
        if (index === this.currentLevelIndex) return;
        destinationSelect.add(new Option(`Level ${index + 1}: ${level.name}`, String(index)));
      });
      destinationSelect.value = this.stateManager.pipeDestination !== null &&
        this.stateManager.pipeDestination < this.levels.length &&
        this.stateManager.pipeDestination !== this.currentLevelIndex
        ? String(this.stateManager.pipeDestination)
        : '';
    }
  }

  showPipeLinkDialog() {
    const dialog = this.toolbar.querySelector('#pipe-link-dialog');
    const destination = this.toolbar.querySelector('#pipe-destination');
    const currentDestination = this.stateManager.pipeDestination;
    if (currentDestination !== null &&
      currentDestination < this.levels.length &&
      currentDestination !== this.currentLevelIndex) {
      destination.value = String(currentDestination);
    } else {
      destination.value = '';
    }
    this.syncPipeArrivalFields(destination.value === '' ? null : Number(destination.value));
    dialog.showModal();
  }

  syncPipeArrivalFields(destinationIndex) {
    const rowInput = this.toolbar.querySelector('#pipe-arrival-row');
    const colInput = this.toolbar.querySelector('#pipe-arrival-col');
    if (destinationIndex === null) {
      rowInput.value = '';
      colInput.value = '';
      rowInput.disabled = true;
      colInput.disabled = true;
      return;
    }
    const destination = this.levels[destinationIndex];
    if (!destination) return;
    const spawn = destination.snapshot.tiles.flatMap((row, rowIndex) =>
      row.map((tile, colIndex) => tile === 'Player' ? { row: rowIndex, col: colIndex } : null)
    ).find(Boolean);
    const spawnRow = spawn?.row ?? destination.snapshot.rows - 2;
    const emptyCol = destination.snapshot.tiles[spawnRow]
      .findIndex((tile, col) => tile === null && col > (spawn?.col ?? 1));
    const arrival = destination.snapshot.pipeArrival || {
      row: spawnRow,
      col: emptyCol >= 0 ? emptyCol : Math.min(destination.snapshot.cols - 1, 2)
    };
    rowInput.max = String(destination.snapshot.rows);
    colInput.max = String(destination.snapshot.cols);
    rowInput.value = String(arrival.row + 1);
    colInput.value = String(arrival.col + 1);
    rowInput.disabled = false;
    colInput.disabled = false;
  }

  savePipeLink() {
    const destinationValue = this.toolbar.querySelector('#pipe-destination').value;
    const destinationIndex = destinationValue === '' ? null : Number(destinationValue);
    if (destinationIndex === null) {
      this.stateManager.pipeDestination = null;
      this.saveCurrentLevel();
      this.toolbar.querySelector('#pipe-link-dialog').close();
      this.setStatus('Pipes in this area are not connected.');
      return;
    }
    if (!Number.isInteger(destinationIndex) || destinationIndex === this.currentLevelIndex ||
      !this.levels[destinationIndex]) {
      throw new RangeError('Choose a different, existing area for this pipe link.');
    }
    const row = Number(this.toolbar.querySelector('#pipe-arrival-row').value) - 1;
    const col = Number(this.toolbar.querySelector('#pipe-arrival-col').value) - 1;
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      throw new TypeError('Enter a valid arrival row and column.');
    }
    const target = this.levels[destinationIndex];
    const updatedTarget = {
      ...target.snapshot,
      pipeArrival: { row, col }
    };
    this.stateManager.validateWorld(updatedTarget);
    this.saveCurrentLevel();
    this.stateManager.pipeDestination = destinationIndex;
    target.snapshot = updatedTarget;
    this.saveCurrentLevel();
    this.toolbar.querySelector('#pipe-link-dialog').close();
    this.setStatus(`Pipes in this area now lead to Level ${destinationIndex + 1}: ${target.name}.`);
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
    this.levels.forEach(level => {
      if (level.snapshot.pipeDestination !== null &&
        level.snapshot.pipeDestination >= position) level.snapshot.pipeDestination += 1;
    });
    const snapshot = this.stateManager.getWorldSnapshot();
    snapshot.pipeDestination = null;
    snapshot.pipeArrival = null;
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
    const removedIndex = this.currentLevelIndex;
    this.levels.splice(this.currentLevelIndex, 1);
    this.levels.forEach(level => {
      if (level.snapshot.pipeDestination === removedIndex) {
        level.snapshot.pipeDestination = null;
      } else if (level.snapshot.pipeDestination > removedIndex) {
        level.snapshot.pipeDestination -= 1;
      }
    });
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
      levels.forEach((level, index) => {
        const destination = level.snapshot.pipeDestination;
        if (destination !== null && destination !== undefined &&
          (destination >= levels.length || destination === index)) {
          throw new TypeError(`Campaign level ${index + 1} has an invalid pipe destination.`);
        }
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
      if (snapshot.pipeDestination !== null && snapshot.pipeDestination !== undefined &&
        (snapshot.pipeDestination >= this.levels.length ||
          snapshot.pipeDestination === this.currentLevelIndex)) {
        throw new TypeError('This level links to an area that is not available in the current campaign.');
      }
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
