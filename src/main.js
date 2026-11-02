import { AUTO, Game, Scale } from 'phaser';
import './styles/main.css';
import { StateManager } from './core/StateManager.js';
import { createShowcaseCampaign } from './core/DemoCampaign.js';
import {
  CommandManager,
  PlaceTileCommand,
  RemoveTileCommand,
  SetTileVariantCommand
} from './core/CommandManager.js';
import { EventBus } from './core/EventBus.js';
import { PaletteView } from './editor/PaletteView.js';
import { GridCanvas } from './editor/GridCanvas.js';
import { UIOverlayEditor } from './editor/UIOverlayEditor.js';
import { SoundEffectsEditor } from './editor/SoundEffectsEditor.js';
import { GameScene } from './engine/GameScene.js';
import { EntityFactory } from './engine/EntityFactory.js';
import { SpriteAnimator } from './engine/SpriteAnimator.js';

const isInstalledApp = window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
if (isInstalledApp) document.documentElement.classList.add('installed-app');

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`, {
    scope: import.meta.env.BASE_URL
  }).catch(error => {
    console.error('Could not register the offline app service worker:', error);
  });
}

const stateManager = new StateManager();
const demoCampaign = createShowcaseCampaign(stateManager.getWorldSnapshot());
stateManager.restoreWorld(demoCampaign[0].snapshot);
const commandManager = new CommandManager();
const eventBus = new EventBus();
const paletteView = new PaletteView('palette', eventBus);
const gridCanvas = new GridCanvas('grid-canvas', stateManager, eventBus);
const entityFactory = new EntityFactory();
const spriteAnimator = new SpriteAnimator(eventBus);
const uiOverlayEditor = new UIOverlayEditor(
  'editor-toolbar',
  stateManager,
  commandManager,
  eventBus,
  gridCanvas,
  demoCampaign
);
const soundEffectsEditor = new SoundEffectsEditor(stateManager, eventBus);

for (const [tileId, metadata] of Object.entries(stateManager.spriteMetadata)) {
  eventBus.emit('spriteUploaded', { tileId, ...metadata });
}

eventBus.on('tileSelected', tileId => {
  stateManager.activeTileType = tileId;
});

eventBus.on('playerCharacterSelected', characterId => {
  try {
    stateManager.setPlayerCharacter(characterId);
    paletteView.setPlayerCharacter(characterId);
    eventBus.emit('spriteUploaded', {
      tileId: 'Player',
      ...stateManager.spriteMetadata.Player
    });
    gridCanvas.refresh();
    uiOverlayEditor.saveCurrentLevel();
    eventBus.emit('status', 'Player character updated for this level.');
  } catch (error) {
    console.error('Could not select the player character:', error);
    eventBus.emit('status', error.message);
  }
});

eventBus.on('tileVariantSelected', ({ tileId, variantId }) => {
  if (!stateManager.selectTileVariant(tileId, variantId)) {
    eventBus.emit('status', `Could not select the ${tileId} appearance.`);
  }
});

eventBus.on('bossConfigChanged', config => {
  try {
    stateManager.setBossConfig(config);
    gridCanvas.refresh();
    eventBus.emit('status', 'Boss settings updated for this level.');
  } catch (error) {
    console.error('Could not update boss settings:', error);
    eventBus.emit('status', error.message);
  }
});

eventBus.on('creepyConfigChanged', config => {
  try {
    const { tileType, ...settings } = config;
    stateManager.setCreepyConfig(tileType, settings);
    eventBus.emit('creepyConfigUpdated', {
      tileType,
      config: stateManager.getCreepyConfig(tileType)
    });
    gridCanvas.refresh();
    eventBus.emit('status', 'Creature settings updated for this level.');
  } catch (error) {
    console.error('Could not update creature settings:', error);
    eventBus.emit('status', error.message);
  }
});

eventBus.on('customCreepyUploaded', creepy => {
  try {
    const registered = stateManager.registerCustomCreepy(creepy);
    eventBus.emit('creepyTypesChanged', {
      customCreeps: stateManager.customCreeps,
      creepyConfigs: stateManager.creepyConfigs,
      selectedType: registered.tileId
    });
    gridCanvas.refresh();
    paletteView.selectTile(registered.tileId, { configure: false });
    eventBus.emit('status', `Added "${registered.name}" to the Creepy toolbox.`);
  } catch (error) {
    console.error('Could not add the custom creature:', error);
    eventBus.emit('status', error.message);
  }
});

eventBus.on('bossTypeUploaded', boss => {
  try {
    const registeredBoss = stateManager.registerBossType(boss);
    stateManager.setBossConfig({ ...stateManager.bossConfig, type: registeredBoss.id });
    gridCanvas.refresh();
    eventBus.emit('bossTypesChanged', {
      customBosses: stateManager.customBosses,
      bossConfig: stateManager.bossConfig
    });
    eventBus.emit('status', `Added "${registeredBoss.name}" as a boss character.`);
  } catch (error) {
    console.error('Could not add the custom boss:', error);
    eventBus.emit('status', error.message);
    throw error;
  }
});

eventBus.on('getTileVariants', () => {
  eventBus.emit('tileVariantsChanged', {
    catalog: stateManager.tileVariantCatalog,
    selectedTileVariants: stateManager.selectedTileVariants
  });
});

eventBus.on('applyTileVariantToAll', ({ tileId, variantId }) => {
  if (!stateManager.tileVariantCatalog[tileId]?.some(variant => variant.id === variantId)) {
    eventBus.emit('status', `The selected ${tileId} appearance is not available.`);
    return;
  }
  const variant = stateManager.tileVariantCatalog[tileId].find(item => item.id === variantId);
  const command = new SetTileVariantCommand(tileId, variantId, variant.name);
  if (!commandManager.executeWithManager(command, stateManager)) {
    eventBus.emit('status', `No ${tileId} tiles need that appearance.`);
    return;
  }
  gridCanvas.refresh();
  uiOverlayEditor.updateHistory();
  eventBus.emit('status', `Updated all ${tileId} tiles. You can undo this change.`);
});

eventBus.on('mysteryBoxRewardSelected', rewardType => {
  stateManager.mysteryBoxReward = rewardType;
  gridCanvas.refresh();
  const rewardLabels = {
    Random: 'a random power-up',
    Mushroom: 'a super mushroom',
    Star: 'star power',
    ExtraLife: 'an extra life',
    FireFlower: 'a fire flower'
  };
  eventBus.emit('status', `Mystery boxes now contain ${rewardLabels[rewardType] || 'a super mushroom'}.`);
});

eventBus.on('levelLoaded', ({ activeTileType }) => {
  paletteView.selectTile(activeTileType, { configure: false });
});

eventBus.on('paintTile', ({ row, col }) => {
  if (stateManager.activeTileType === 'Player') {
    const previousStart = stateManager.getTilePositions('Player')
      .find(position => position.row !== row || position.col !== col);
    if (previousStart) {
      commandManager.executeWithManager(
        new RemoveTileCommand(previousStart.row, previousStart.col),
        stateManager
      );
    }
  }
  const command = stateManager.activeTileType === 'Eraser'
    ? new RemoveTileCommand(row, col)
    : new PlaceTileCommand(
      row,
      col,
      stateManager.activeTileType,
      stateManager.getSelectedTileVariant(stateManager.activeTileType)
    );
  if (!commandManager.executeWithManager(command, stateManager)) return;
  gridCanvas.refresh();
  uiOverlayEditor.updateHistory();
});

eventBus.on('undo', () => {
  if (!commandManager.undoWithManager(stateManager)) return;
  gridCanvas.refresh();
  uiOverlayEditor.syncWorldSize();
  uiOverlayEditor.updateHistory();
  eventBus.emit('status', `Undid: ${commandManager.redoStack.at(-1).getSummary()}`);
});

eventBus.on('redo', () => {
  if (!commandManager.redoWithManager(stateManager)) return;
  gridCanvas.refresh();
  uiOverlayEditor.syncWorldSize();
  uiOverlayEditor.updateHistory();
  eventBus.emit('status', `Redid: ${commandManager.getLastCommandSummary()}`);
});

eventBus.on('spriteUploaded', metadata => {
  const image = new Image();
  image.onload = () => {
    try {
      stateManager.registerSprite(metadata.tileId, {
        ...metadata,
        imageWidth: image.naturalWidth,
        imageHeight: image.naturalHeight
      });
      gridCanvas.refresh();
    } catch (error) {
      console.error('Could not register the uploaded sprite:', error);
      eventBus.emit('status', error.message);
    }
  };
  image.onerror = () => eventBus.emit('status', `Could not load the ${metadata.tileId} sprite.`);
  image.src = metadata.dataUrl;
});

eventBus.on('spriteAnimationUploaded', metadata => {
  try {
    stateManager.registerAnimation(metadata.entityType, metadata.animationType, metadata);
    gridCanvas.refresh();
    eventBus.emit('animationRegistered', metadata);
  } catch (error) {
    console.error('Could not register the uploaded animation:', error);
    eventBus.emit('status', error.message);
  }
});

eventBus.on('tileVariantUploaded', ({ tileId, variant }) => {
  try {
    stateManager.registerTileVariant(tileId, variant);
    eventBus.emit('tileVariantsChanged', {
      catalog: stateManager.tileVariantCatalog,
      selectedTileVariants: stateManager.selectedTileVariants
    });
    gridCanvas.refresh();
  } catch (error) {
    console.error('Could not register the tile appearance:', error);
    throw error;
  }
});

eventBus.emit('tileVariantsChanged', {
  catalog: stateManager.tileVariantCatalog,
  selectedTileVariants: stateManager.selectedTileVariants
});

eventBus.on('getAnimationMetadata', entityType => {
  paletteView.showAnimationMetadata({
    entityType,
    metadata: stateManager.spriteMetadata[entityType]
  });
});

eventBus.on('getCreepyPreview', tileType => {
  const metadata = stateManager.spriteMetadata[tileType];
  const customCreepy = stateManager.getCreepyType(tileType);
  const animation = metadata?.animations?.idle?.dataUrl
    ? metadata.animations.idle
    : metadata?.animations?.walk;
  const dataUrl = animation?.dataUrl || metadata?.dataUrl || customCreepy?.dataUrl;
  eventBus.emit('creepyPreviewChanged', {
    tileType,
    dataUrl,
    frameWidth: animation?.frameWidth,
    frameHeight: animation?.frameHeight
  });
});

let activeGame = null;
let activeModal = null;
let touchState = null;
let runLevelIndex = 0;
let runStartLevelIndex = 0;
const completedCampaignLevels = new Set();
let gameRestartTimer = null;
const initialCampaignProgress = () => ({
  score: 0,
  lives: 3,
  mushroomGrowth: 0,
  hasFire: false,
  starPowerRemainingMs: 0
});
let campaignProgress = initialCampaignProgress();
let currentLevelEntryProgress = initialCampaignProgress();

function closeGame() {
  clearTimeout(gameRestartTimer);
  gameRestartTimer = null;
  if (activeGame) {
    activeGame.destroy(true);
    if (window.game === activeGame) delete window.game;
    activeGame = null;
  }
  activeModal?.remove();
  activeModal = null;
}

function makeDraggable(panel, handle) {
  let dragOffset = null;
  handle.addEventListener('pointerdown', event => {
    dragOffset = { x: event.clientX - panel.offsetLeft, y: event.clientY - panel.offsetTop };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (!dragOffset) return;
    const bounds = panel.parentElement.getBoundingClientRect();
    const left = Math.max(0, Math.min(bounds.width - panel.offsetWidth, event.clientX - bounds.left - dragOffset.x));
    const top = Math.max(0, Math.min(bounds.height - panel.offsetHeight, event.clientY - bounds.top - dragOffset.y));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });
  const stopDragging = () => { dragOffset = null; };
  handle.addEventListener('pointerup', stopDragging);
  handle.addEventListener('pointercancel', stopDragging);
}

function startGame() {
  if (activeGame) return;
  activeModal = document.createElement('section');
  activeModal.className = 'game-modal';
  activeModal.setAttribute('role', 'dialog');
  activeModal.setAttribute('aria-modal', 'true');
  activeModal.setAttribute('aria-label', 'Play level');
  activeModal.innerHTML = `
    <div class="game-window">
      <header class="game-header">
        <div>
          <strong>Play your level</strong>
          <span>Move with arrows or A/D · Jump with W, ↑ or Space · Pipes: ↓/S or ↑ beside a pipe</span>
          <span class="game-level-hint" hidden></span>
        </div>
        <div class="game-header-actions">
          <button class="touch-toggle" type="button" aria-controls="touch-controls" aria-expanded="false">
            Show touch controls
          </button>
          <button class="game-close" type="button" aria-label="Close game">✕</button>
        </div>
      </header>
      <div id="game-stage" class="game-stage" aria-busy="true">
        <div class="game-loading" role="status" aria-live="polite">
          <span class="game-loading-spinner" aria-hidden="true"></span>
          <strong>Getting your level ready…</strong>
          <span>Loading the game and its artwork</span>
        </div>
        <div id="game-message" class="game-message" role="status" aria-live="polite" hidden>
          <div class="game-message-card">
            <span class="campaign-complete-trophy" aria-hidden="true" hidden>🏆</span>
            <span class="game-message-text"></span>
            <span class="campaign-complete-caption" hidden></span>
            <button class="game-action" type="button" hidden></button>
          </div>
        </div>
      </div>
      <div id="touch-controls" class="touch-controls" hidden>
        <div class="touch-handle">MOVE CONTROLS</div>
        <div class="touch-buttons">
          <button type="button" data-control="left" aria-label="Move left">◀</button>
          <button type="button" data-control="right" aria-label="Move right">▶</button>
          <button type="button" data-control="jump" aria-label="Jump">⤒</button>
          <button type="button" data-control="shoot" aria-label="Shoot fireball" title="Shoot fireball">🔥</button>
          <button type="button" data-control="enterPipe" aria-label="Use pipe" title="Use pipe">⬇</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(activeModal);
  runStartLevelIndex = uiOverlayEditor.currentLevelIndex;
  const closeButton = activeModal.querySelector('.game-close');
  closeButton.addEventListener('click', closeGame);
  activeModal.addEventListener('pointerdown', event => {
    if (event.target === activeModal) closeGame();
  });
  const handleEscape = event => {
    if (event.key === 'Escape') closeGame();
  };
  activeModal.addEventListener('keydown', handleEscape);

  touchState = { left: false, right: false, jump: false, shoot: false, enterPipe: false };
  const touchPanel = activeModal.querySelector('#touch-controls');
  const touchToggle = activeModal.querySelector('.touch-toggle');
  touchToggle.addEventListener('click', () => {
    touchPanel.hidden = !touchPanel.hidden;
    touchToggle.setAttribute('aria-expanded', String(!touchPanel.hidden));
    touchToggle.textContent = touchPanel.hidden ? 'Show touch controls' : 'Hide touch controls';
    if (touchPanel.hidden) {
      Object.assign(touchState, {
        left: false, right: false, jump: false, shoot: false, enterPipe: false
      });
    }
  });
  makeDraggable(touchPanel, touchPanel.querySelector('.touch-handle'));
  touchPanel.querySelectorAll('[data-control]').forEach(button => {
    const control = button.dataset.control;
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      touchState[control] = true;
    });
    const release = () => { touchState[control] = false; };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });
  activeModal.querySelector('.game-action').addEventListener('click', () => {
    const action = activeModal?.querySelector('.game-action');
    if (!action || action.disabled) return;
    if (action.dataset.action === 'next') {
      launchCampaignLevel(runLevelIndex + 1);
    } else if (action.dataset.action === 'campaign') {
      campaignProgress = initialCampaignProgress();
      completedCampaignLevels.clear();
      runStartLevelIndex = 0;
      launchCampaignLevel(0);
    } else {
      campaignProgress = { ...currentLevelEntryProgress };
      launchCampaignLevel(runLevelIndex, campaignProgress);
    }
  });
  campaignProgress = initialCampaignProgress();
  completedCampaignLevels.clear();
  setGameLoading(true);
  launchCampaignLevel(uiOverlayEditor.currentLevelIndex);
  closeButton.focus();
}

function setGameLoading(loading) {
  const stage = activeModal?.querySelector('#game-stage');
  if (!stage) return;
  stage.setAttribute('aria-busy', String(loading));
  stage.querySelector('.game-loading').hidden = !loading;
}

function launchCampaignLevel(index, progress = campaignProgress) {
  const level = uiOverlayEditor.getCampaignLevel(index);
  if (!level || !activeModal) return;
  setGameLoading(true);
  runLevelIndex = index;
  campaignProgress = { ...progress };
  currentLevelEntryProgress = { ...campaignProgress };
  uiOverlayEditor.switchCampaignLevel(index);
  const snapshot = uiOverlayEditor.getCampaignLevel(index)?.snapshot || level.snapshot;
  const action = activeModal.querySelector('.game-action');
  action.hidden = true;
  action.disabled = false;
  const message = activeModal.querySelector('#game-message');
  message.hidden = true;
  message.classList.remove('is-campaign-complete');
  activeModal.querySelector('.campaign-complete-trophy').hidden = true;
  activeModal.querySelector('.campaign-complete-caption').hidden = true;
  activeModal.querySelector('.game-header strong').textContent =
    `Level ${index + 1}: ${level.name}`;
  const levelHint = activeModal.querySelector('.game-level-hint');
  levelHint.textContent = level.hint || '';
  levelHint.hidden = !level.hint;

  if (activeGame) {
    activeGame.destroy(true);
    activeGame = null;
    if (window.game) delete window.game;
    Object.assign(touchState, {
      left: false, right: false, jump: false, shoot: false, enterPipe: false
    });
    clearTimeout(gameRestartTimer);
    gameRestartTimer = setTimeout(() => {
      gameRestartTimer = null;
      if (activeModal) {
        createGameInstance(
          snapshot,
          level.name,
          index,
          campaignProgress,
          canCelebrateCampaignCompletion(index)
        );
      }
    }, 150);
    return;
  }
  createGameInstance(
    snapshot,
    level.name,
    index,
    campaignProgress,
    canCelebrateCampaignCompletion(index)
  );
}

function canCelebrateCampaignCompletion(index) {
  const finalIndex = uiOverlayEditor.getCampaignLength() - 1;
  return runStartLevelIndex === 0 && index === finalIndex &&
    Array.from({ length: finalIndex }, (_, priorIndex) =>
      completedCampaignLevels.has(priorIndex)
    ).every(Boolean);
}

function createGameInstance(snapshot, levelName, levelIndex, progress, isCampaignFinal) {
  const recordId = `${levelIndex + 1}:${levelName}`;
  const scene = new GameScene(
    snapshot,
    entityFactory,
    spriteAnimator,
    touchState,
    eventBus,
    recordId,
    progress,
    isCampaignFinal
  );
  scene.soundManager.startMusic();
  activeGame = new Game({
    type: AUTO,
    parent: 'game-stage',
    width: 960,
    height: 540,
    backgroundColor: '#98d6f2',
    antialias: true,
    pixelArt: false,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 800 }, debug: false }
    },
    scale: {
      mode: Scale.FIT,
      autoCenter: Scale.CENTER_BOTH
    },
    scene: [scene]
  });
  window.game = activeGame;
}

eventBus.on('gameReady', () => setGameLoading(false));

eventBus.on('pipeTravel', ({ destinationIndex, campaignProgress: progress }) => {
  if (!Number.isInteger(destinationIndex) ||
    destinationIndex < 0 || destinationIndex >= uiOverlayEditor.getCampaignLength()) {
    console.error('Cannot travel through pipe: destination is outside the current campaign.');
    return;
  }
  launchCampaignLevel(destinationIndex, progress);
});

eventBus.on('gameMessage', result => {
  const gameMessage = activeModal?.querySelector('#game-message');
  if (!gameMessage) return;
  const { message, won } = typeof result === 'string'
    ? { message: result, won: false }
    : result;
  const campaignComplete = won && result.campaignComplete === true;
  if (won) completedCampaignLevels.add(runLevelIndex);
  if (won && result.campaignProgress) {
    campaignProgress = { ...result.campaignProgress };
  }
  gameMessage.hidden = false;
  gameMessage.classList.toggle('is-campaign-complete', campaignComplete);
  gameMessage.querySelector('.game-message-text').textContent = message;
  const trophy = gameMessage.querySelector('.campaign-complete-trophy');
  trophy.hidden = !campaignComplete;
  const caption = gameMessage.querySelector('.campaign-complete-caption');
  caption.textContent = `You conquered all ${uiOverlayEditor.getCampaignLength()} levels!`;
  caption.hidden = !campaignComplete;
  const action = gameMessage.querySelector('.game-action');
  action.hidden = false;
  action.disabled = false;
  if (!won) {
    action.textContent = 'Replay level';
    action.dataset.action = 'replay';
  } else if (campaignComplete) {
    action.textContent = 'Play the campaign again';
    action.dataset.action = 'campaign';
  } else if (runLevelIndex + 1 < uiOverlayEditor.getCampaignLength()) {
    action.textContent = `Next level (${runLevelIndex + 2})`;
    action.dataset.action = 'next';
  } else {
    action.textContent = 'Play again';
    action.dataset.action = 'replay';
  }
});

eventBus.on('play', startGame);
eventBus.on('worldResized', ({ cols, rows }) => {
  gridCanvas.refresh();
  eventBus.emit('status', `World is ${cols} × ${rows} tiles.`);
});

document.addEventListener('keydown', event => {
  const target = event.target;
  const typing = target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
  if (typing || event.altKey) return;
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    eventBus.emit(event.shiftKey ? 'redo' : 'undo');
  } else if (modifier && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    eventBus.emit('redo');
  }
});

eventBus.emit('historyChanged', { canUndo: false, canRedo: false });
paletteView.selectTile('Ground');
console.info('Game engine and level editor are ready.');
