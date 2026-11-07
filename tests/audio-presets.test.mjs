import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let StateManager;
let SoundManager;
let UIOverlayEditor;
let compactCommunityLevel;
let validateCommunityLevel;
let SOUND_EVENT_IDS;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom'
  });
  ({ StateManager } = await server.ssrLoadModule('/src/core/StateManager.js'));
  ({ SoundManager } = await server.ssrLoadModule('/src/engine/SoundManager.js'));
  ({ UIOverlayEditor } = await server.ssrLoadModule('/src/editor/UIOverlayEditor.js'));
  ({ compactCommunityLevel, validateCommunityLevel } = await server.ssrLoadModule('/src/core/CommunityLevel.js'));
  ({ SOUND_EVENT_IDS } = await server.ssrLoadModule('/src/core/AudioPresets.js'));
});

after(async () => { await server.close(); });

test('campaign level switches and new levels keep audio settings independent', () => {
  const state = new StateManager();
  const first = state.getWorldSnapshot();
  const second = state.getWorldSnapshot();
  second.backgroundMusic = { preset: 'moonlight', enabled: false, volume: 0.4 };
  second.soundEffects = { coin: { preset: 'soft', enabled: true, volume: 0.3 } };
  const editor = Object.create(UIOverlayEditor.prototype);
  editor.stateManager = state;
  editor.levels = [{ name: 'First', snapshot: first }, { name: 'Second', snapshot: second }];
  editor.currentLevelIndex = 0;
  editor.applyLevelSnapshot = snapshot => state.restoreWorld(snapshot);
  editor.setStatus = () => {};
  state.registerBackgroundMusic({ preset: 'sunny', enabled: true, volume: 0.6 });
  state.registerSoundEffect('jump', { preset: 'bright', enabled: true, volume: 0.8 });
  editor.switchCampaignLevel(1);
  assert.deepEqual(state.backgroundMusic, second.backgroundMusic);
  state.registerBackgroundMusic({ preset: 'classic', enabled: true, volume: 0.1 });
  editor.switchCampaignLevel(0);
  assert.equal(state.backgroundMusic.preset, 'sunny');
  assert.equal(state.soundEffects.jump.preset, 'bright');
  editor.addCampaignLevel('New', 1);
  assert.equal(state.backgroundMusic, null);
  assert.deepEqual(state.soundEffects, {});
  editor.switchCampaignLevel(2);
  assert.equal(state.backgroundMusic.volume, 0.1);
  assert.equal(state.soundEffects.coin.preset, 'soft');
});

test('audio snapshots validate presets, old uploads and community copies', () => {
  const state = new StateManager();
  const uploaded = { dataUrl: 'data:audio/wav;base64,AA==', volume: 0.5, enabled: true };
  state.registerSoundEffect('jump', uploaded);
  state.registerSoundEffect('coin', { preset: 'bright', enabled: true, volume: 0.5 });
  state.registerBackgroundMusic({ preset: 'moonlight', enabled: false, volume: 0.2 });
  const snapshot = state.getWorldSnapshot();
  state.validateWorld(JSON.parse(JSON.stringify(snapshot)));
  const restored = new StateManager();
  restored.restoreWorld(snapshot);
  assert.deepEqual(restored.soundEffects.jump, uploaded);
  const { level, customAssets } = compactCommunityLevel(snapshot);
  assert.equal(customAssets, true);
  assert.equal(level.soundEffects.jump, undefined);
  assert.equal(level.soundEffects.coin.preset, 'bright');
  assert.equal(level.backgroundMusic.preset, 'moonlight');
  assert.doesNotMatch(JSON.stringify(level), /data:audio/);
  assert.doesNotThrow(() => validateCommunityLevel(level));
  assert.throws(() => validateCommunityLevel({ ...level, backgroundMusic: { ...level.backgroundMusic, dataUrl: uploaded.dataUrl } }));
  assert.throws(() => state.registerSoundEffect('jump', { preset: 'invalid', volume: 0.4, enabled: true }));
  assert.throws(() => state.validateWorld({ ...snapshot, backgroundMusic: { preset: 'invalid', enabled: true, volume: 0.5 } }));
});

test('every event plays three different synthesized presets and music settings control playback', () => {
  const oscillators = [];
  class FakeContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    createOscillator() {
      const oscillator = { frequency: { setValueAtTime(value) { oscillator.pitch = value; }, exponentialRampToValueAtTime() {} },
        connect() {}, addEventListener() {}, start() {}, stop() {} };
      oscillators.push(oscillator);
      return oscillator;
    }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  const oldWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeContext };
  try {
    for (const event of SOUND_EVENT_IDS) {
      const variants = [];
      for (const preset of ['retro', 'bright', 'soft']) {
        const manager = new SoundManager({ emit() {} }, { [event]: { preset, volume: 0.7, enabled: true } });
        const index = oscillators.length;
        assert.equal(manager.play(event), true);
        variants.push([oscillators[index].type, oscillators[index].pitch]);
        manager.stopAll();
      }
      assert.equal(new Set(variants.map(item => item.join(':'))).size, 3, event);
    }
    const notes = [];
    for (const preset of ['classic', 'sunny', 'moonlight']) {
      const manager = new SoundManager({ emit() {} }, {}, { preset, volume: 0.3, enabled: true });
      const index = oscillators.length;
      assert.equal(manager.startMusic(), true);
      assert.equal(manager.musicGain.gain.value, 0.3);
      notes.push([oscillators[index].type, oscillators[index].pitch].join(':'));
      manager.stopAll();
    }
    assert.equal(new Set(notes).size, 3);
    const muted = new SoundManager({ emit() {} }, { jump: { preset: 'soft', volume: 0.5, enabled: false } },
      { preset: 'sunny', volume: 0.5, enabled: false });
    const count = oscillators.length;
    assert.equal(muted.play('jump'), false);
    muted.startMusic();
    assert.equal(oscillators.length, count);
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
  }
});
