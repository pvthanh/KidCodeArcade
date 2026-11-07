import { SOUND_PRESETS, MUSIC_PRESETS } from '../core/AudioPresets.js';
import { SoundManager } from '../engine/SoundManager.js';

const SOUND_EVENTS = [
  { id: 'jump', label: 'Jump', description: 'When the player jumps' },
  { id: 'enemyStomp', label: 'Stomp enemy', description: 'When the player defeats an enemy' },
  { id: 'playerHit', label: 'Player hit', description: 'When an enemy hurts the player' },
  { id: 'coin', label: 'Collect coin', description: 'When a coin is collected' },
  { id: 'powerUp', label: 'Power-up', description: 'When the player collects a reward' },
  { id: 'brickBreak', label: 'Break brick', description: 'When a brick is broken' },
  { id: 'mysteryBox', label: 'Mystery box', description: 'When a mystery box is bumped' },
  { id: 'win', label: 'Win', description: 'When the player reaches the goal' },
  { id: 'lose', label: 'Lose', description: 'When all lives are lost or the player falls' },
  { id: 'spring', label: 'Spring', description: 'When the player bounces on a spring' },
  { id: 'switch', label: 'Switch', description: 'When a switch opens the doors' },
  { id: 'checkpoint', label: 'Checkpoint', description: 'When the player activates a checkpoint' },
  { id: 'fireball', label: 'Fireball', description: 'When the player shoots a fireball' }
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export class SoundEffectsEditor {
  constructor(stateManager, eventBus) {
    this.stateManager = stateManager;
    this.eventBus = eventBus;
    this.dialog = null;
    this.previewManager = null;
    this.eventBus.on('openSoundSettings', () => this.open());
    this.eventBus.on('levelLoaded', () => { if (this.dialog) this.close(); });
  }

  open() {
    this.stopPreview();
    this.dialog?.remove();
    this.dialog = document.createElement('section');
    this.dialog.className = 'sound-modal';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-labelledby', 'sound-dialog-title');
    this.dialog.innerHTML = `
      <div class="sound-dialog">
        <header class="sound-dialog-header">
          <div>
            <span class="eyebrow">GAME AUDIO</span>
            <h2 id="sound-dialog-title">Sounds &amp; music</h2>
            <p>Choose music and sounds for this level. Changes do not affect other levels.</p>
          </div>
          <button class="sound-dialog-close" type="button" aria-label="Close sound settings">✕</button>
        </header>
        <div class="sound-list">
          <article class="sound-row background-music-row">
            <div class="sound-copy">
              <strong>Background music</strong>
              <span>Loops throughout this level while it is being played</span>
              <span class="sound-file-name" data-music-file>
                ${this.escapeHtml(this.stateManager.backgroundMusic?.fileName || 'Built-in music')}
              </span>
            </div>
            <div class="sound-controls">
              <label class="sound-preset-control">Music
                <select data-music-preset aria-label="Background music choice">
                  ${this.presetOptions(MUSIC_PRESETS, this.stateManager.backgroundMusic, 'classic')}
                </select>
              </label>
              <label class="sound-upload-button">
                <span>Choose music</span>
                <input type="file" data-music-upload accept="audio/*" aria-label="Upload background music">
              </label>
              <label class="sound-volume-control">
                Volume
                <input type="range" min="0" max="100"
                  value="${Math.round((this.stateManager.backgroundMusic?.volume ?? 0.25) * 100)}"
                  data-music-volume aria-label="Background music volume">
                <span data-music-volume-value>${Math.round((this.stateManager.backgroundMusic?.volume ?? 0.25) * 100)}%</span>
              </label>
              <label class="sound-enabled-control">
                <input type="checkbox" data-music-enabled
                  ${this.stateManager.backgroundMusic?.enabled === false ? '' : 'checked'}>
                Enabled
              </label>
              <button type="button" class="sound-preview-button" data-music-preview
                aria-label="Preview background music">▶</button>
              <button type="button" class="sound-remove-button" data-music-remove
                ${this.stateManager.backgroundMusic ? '' : 'disabled'}
                aria-label="Reset background music">Reset</button>
            </div>
          </article>
          ${SOUND_EVENTS.map(event => `
            <article class="sound-row" data-sound-event="${event.id}">
              <div class="sound-copy">
                <strong>${event.label}</strong>
                <span>${event.description}</span>
                <span class="sound-file-name" data-sound-file>${this.escapeHtml(this.getSound(event.id)?.fileName || 'Built-in sound')}</span>
              </div>
              <div class="sound-controls">
                <label class="sound-preset-control">Sound
                  <select data-sound-preset aria-label="${event.label} sound choice">
                    ${this.presetOptions(SOUND_PRESETS, this.getSound(event.id), 'retro')}
                  </select>
                </label>
                <label class="sound-upload-button">
                  <span>Choose audio</span>
                  <input type="file" data-sound-upload accept="audio/*" aria-label="Upload ${event.label} sound">
                </label>
                <label class="sound-volume-control">
                  Volume
                  <input type="range" min="0" max="100" value="${Math.round((this.getSound(event.id)?.volume ?? 0.7) * 100)}" data-sound-volume aria-label="${event.label} sound volume">
                  <span data-volume-value>${Math.round((this.getSound(event.id)?.volume ?? 0.7) * 100)}%</span>
                </label>
                <label class="sound-enabled-control">
                  <input type="checkbox" data-sound-enabled ${this.getSound(event.id)?.enabled === false ? '' : 'checked'}>
                  Enabled
                </label>
                <button type="button" class="sound-preview-button" data-sound-preview aria-label="Preview ${event.label} sound">▶</button>
                <button type="button" class="sound-remove-button" data-sound-remove ${this.getSound(event.id) ? '' : 'disabled'} aria-label="Reset ${event.label} sound">Reset</button>
              </div>
            </article>
          `).join('')}
        </div>
        <footer class="sound-dialog-footer">
          <span>Supported formats depend on your browser. Audio is saved inside the level file.</span>
          <button class="primary-button sound-done" type="button">Done</button>
        </footer>
      </div>
    `;
    document.body.appendChild(this.dialog);
    this.bindDialogEvents();
    this.dialog.querySelector('.sound-dialog-close').focus();
  }

  bindDialogEvents() {
    const dialog = this.dialog;
    dialog.querySelector('.sound-dialog-close').addEventListener('click', () => this.close());
    dialog.querySelector('.sound-done').addEventListener('click', () => this.close());
    dialog.addEventListener('pointerdown', event => {
      if (event.target === dialog) this.close();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.close();
    });

    dialog.addEventListener('input', event => {
      const musicVolume = event.target.closest('[data-music-volume]');
      if (musicVolume) {
        const volume = Number(musicVolume.value) / 100;
        dialog.querySelector('[data-music-volume-value]').textContent = `${musicVolume.value}%`;
        if (this.previewingMusic && this.previewManager) {
          for (const audio of this.previewManager.activeAudio) audio.volume = volume;
        }
        if (this.previewingMusic && this.previewManager?.musicGain) this.previewManager.musicGain.gain.value = volume;
        this.stateManager.registerBackgroundMusic({ ...this.currentMusic(), volume });
        dialog.querySelector('[data-music-remove]').disabled = false;
        return;
      }

      const input = event.target.closest('[data-sound-volume]');
      if (!input) return;
      const row = input.closest('.sound-row');
      const eventId = row.dataset.soundEvent;
      row.querySelector('[data-volume-value]').textContent = `${input.value}%`;
      this.updateSound(eventId, { volume: Number(input.value) / 100 });
      row.querySelector('[data-sound-remove]').disabled = false;
    });

    dialog.addEventListener('change', async event => {
      const musicPreset = event.target.closest('[data-music-preset]');
      if (musicPreset && musicPreset.value !== 'uploaded') {
        this.stopPreview();
        const current = this.currentMusic();
        this.stateManager.registerBackgroundMusic({
          preset: musicPreset.value, volume: current.volume, enabled: current.enabled
        });
        musicPreset.querySelector('option[value="uploaded"]')?.remove();
        const row = musicPreset.closest('.sound-row');
        row.querySelector('[data-music-file]').textContent = 'Built-in music';
        row.querySelector('[data-music-remove]').disabled = false;
        return;
      }
      const soundPreset = event.target.closest('[data-sound-preset]');
      if (soundPreset && soundPreset.value !== 'uploaded') {
        this.stopPreview();
        const row = soundPreset.closest('.sound-row');
        const current = this.currentSound(row.dataset.soundEvent);
        this.stateManager.registerSoundEffect(row.dataset.soundEvent, {
          preset: soundPreset.value, volume: current.volume, enabled: current.enabled
        });
        soundPreset.querySelector('option[value="uploaded"]')?.remove();
        row.querySelector('[data-sound-file]').textContent = 'Built-in sound';
        row.querySelector('[data-sound-remove]').disabled = false;
        return;
      }
      const musicUpload = event.target.closest('[data-music-upload]');
      if (musicUpload?.files?.[0]) {
        await this.uploadBackgroundMusic(musicUpload.files[0]);
        musicUpload.value = '';
        return;
      }

      const upload = event.target.closest('[data-sound-upload]');
      if (upload?.files?.[0]) {
        await this.uploadSound(upload.closest('.sound-row'), upload.files[0]);
        upload.value = '';
        return;
      }

      const enabled = event.target.closest('[data-sound-enabled]');
      if (enabled) {
        const row = enabled.closest('.sound-row');
        this.updateSound(row.dataset.soundEvent, { enabled: enabled.checked });
        row.querySelector('[data-sound-remove]').disabled = false;
        if (!enabled.checked) this.stopPreview();
        return;
      }

      const musicEnabled = event.target.closest('[data-music-enabled]');
      if (musicEnabled) {
        this.stateManager.registerBackgroundMusic({
          ...this.currentMusic(),
          enabled: musicEnabled.checked
        });
        dialog.querySelector('[data-music-remove]').disabled = false;
        if (!musicEnabled.checked) this.stopPreview();
      }
    });

    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-music-preview]')) {
        this.playMusicPreview();
        return;
      }
      if (event.target.closest('[data-music-remove]')) {
        this.removeBackgroundMusic();
        return;
      }

      const preview = event.target.closest('[data-sound-preview]');
      if (preview) {
        this.playPreview(preview.closest('.sound-row').dataset.soundEvent);
        return;
      }
      const remove = event.target.closest('[data-sound-remove]');
      if (remove) this.removeSound(remove.closest('.sound-row').dataset.soundEvent);
    });
  }

  async uploadSound(row, file) {
    const dialog = this.dialog;
    row.classList.add('loading');
    try {
      if (!file.type.startsWith('audio/')) throw new TypeError('Choose an audio file.');
      if (file.size > MAX_FILE_SIZE) throw new RangeError('Audio files must be 10 MB or smaller.');
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The audio file could not be read.'));
        reader.readAsDataURL(file);
      });
      const duration = await this.validateAudio(dataUrl);
      if (this.dialog !== dialog) return;
      const eventId = row.dataset.soundEvent;
      const existing = this.getSound(eventId);
      const volume = Number(row.querySelector('[data-sound-volume]').value) / 100;
      this.stateManager.registerSoundEffect(eventId, {
        dataUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        duration,
        volume,
        enabled: existing?.enabled ?? true
      });
      this.stopPreview();
      row.querySelector('[data-sound-file]').textContent = file.name;
      this.setUploadedOption(row.querySelector('[data-sound-preset]'));
      row.querySelector('[data-sound-enabled]').disabled = false;
      row.querySelector('[data-sound-enabled]').checked = this.getSound(eventId).enabled;
      row.querySelector('[data-sound-preview]').disabled = false;
      row.querySelector('[data-sound-remove]').disabled = false;
      this.eventBus.emit('status', `${this.getLabel(eventId)} sound uploaded.`);
    } catch (error) {
      console.error('Sound upload failed:', error);
      this.eventBus.emit('status', error.message || 'The sound upload failed.');
    } finally {
      row.classList.remove('loading');
    }
  }

  async uploadBackgroundMusic(file) {
    const dialog = this.dialog;
    const row = dialog.querySelector('.background-music-row');
    row.classList.add('loading');
    try {
      if (!file.type.startsWith('audio/')) throw new TypeError('Choose an audio file.');
      if (file.size > MAX_FILE_SIZE) throw new RangeError('Audio files must be 10 MB or smaller.');
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The audio file could not be read.'));
        reader.readAsDataURL(file);
      });
      const duration = await this.validateAudio(dataUrl);
      if (this.dialog !== dialog) return;
      const existing = this.stateManager.backgroundMusic;
      const volume = Number(row.querySelector('[data-music-volume]').value) / 100;
      this.stateManager.registerBackgroundMusic({
        dataUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        duration,
        volume,
        enabled: existing?.enabled ?? true
      });
      this.stopPreview();
      row.querySelector('[data-music-file]').textContent = file.name;
      this.setUploadedOption(row.querySelector('[data-music-preset]'));
      row.querySelector('[data-music-enabled]').disabled = false;
      row.querySelector('[data-music-enabled]').checked = this.stateManager.backgroundMusic.enabled;
      row.querySelector('[data-music-preview]').disabled = false;
      row.querySelector('[data-music-remove]').disabled = false;
      this.eventBus.emit('status', 'Background music uploaded.');
    } catch (error) {
      console.error('Background music upload failed:', error);
      this.eventBus.emit('status', error.message || 'The background music upload failed.');
    } finally {
      row.classList.remove('loading');
    }
  }

  validateAudio(dataUrl) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const timeout = setTimeout(() => finish(new Error('The audio file took too long to load.')), 10000);
      const finish = error => {
        clearTimeout(timeout);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
        audio.removeAttribute('src');
        audio.load();
        if (error) reject(error);
        else resolve(Number.isFinite(audio.duration) ? audio.duration : null);
      };
      const onLoaded = () => finish();
      const onError = () => finish(new Error('This audio format is not supported or the file is invalid.'));
      audio.addEventListener('loadedmetadata', onLoaded, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.src = dataUrl;
      audio.load();
    });
  }

  updateSound(eventId, updates) {
    const existing = this.currentSound(eventId);
    this.stateManager.registerSoundEffect(eventId, { ...existing, ...updates });
  }

  playPreview(eventId) {
    this.stopPreview();
    this.previewManager = new SoundManager(this.eventBus, { [eventId]: this.currentSound(eventId) });
    this.previewManager.play(eventId);
  }

  playMusicPreview() {
    this.stopPreview();
    this.previewingMusic = true;
    this.previewManager = new SoundManager(this.eventBus, {}, this.currentMusic());
    this.previewManager.startMusic();
  }

  removeBackgroundMusic() {
    this.stateManager.removeBackgroundMusic();
    this.stopPreview();
    const row = this.dialog.querySelector('.background-music-row');
    row.querySelector('[data-music-file]').textContent = 'Built-in music';
    row.querySelector('[data-music-preset]').value = 'classic';
    row.querySelector('[data-music-preset] option[value="uploaded"]')?.remove();
    row.querySelector('[data-music-volume]').value = '25';
    row.querySelector('[data-music-volume-value]').textContent = '25%';
    row.querySelector('[data-music-enabled]').checked = true;
    row.querySelector('[data-music-enabled]').disabled = false;
    row.querySelector('[data-music-preview]').disabled = false;
    row.querySelector('[data-music-remove]').disabled = true;
    this.eventBus.emit('status', 'Background music removed.');
  }

  removeSound(eventId) {
    this.stateManager.removeSoundEffect(eventId);
    this.stopPreview();
    const row = this.dialog.querySelector(`[data-sound-event="${eventId}"]`);
    row.querySelector('[data-sound-file]').textContent = 'Built-in sound';
    row.querySelector('[data-sound-preset]').value = 'retro';
    row.querySelector('[data-sound-preset] option[value="uploaded"]')?.remove();
    row.querySelector('[data-sound-volume]').value = '70';
    row.querySelector('[data-volume-value]').textContent = '70%';
    row.querySelector('[data-sound-enabled]').checked = true;
    row.querySelector('[data-sound-enabled]').disabled = false;
    row.querySelector('[data-sound-preview]').disabled = false;
    row.querySelector('[data-sound-remove]').disabled = true;
    this.eventBus.emit('status', `${this.getLabel(eventId)} sound removed.`);
  }

  getSound(eventId) {
    return this.stateManager.soundEffects[eventId];
  }

  currentSound(eventId) {
    return this.getSound(eventId) || { preset: 'retro', volume: 0.7, enabled: true };
  }

  currentMusic() {
    return this.stateManager.backgroundMusic || { preset: 'classic', volume: 0.25, enabled: true };
  }

  presetOptions(presets, settings, defaultId) {
    const selected = settings?.preset || (settings?.dataUrl ? 'uploaded' : defaultId);
    return presets.map(preset => `<option value="${preset.id}" ${selected === preset.id ? 'selected' : ''}>${preset.label}</option>`).join('') +
      (settings?.dataUrl ? '<option value="uploaded" selected>Uploaded audio</option>' : '');
  }

  setUploadedOption(select) {
    if (!select.querySelector('option[value="uploaded"]')) {
      select.add(new Option('Uploaded audio', 'uploaded'));
    }
    select.value = 'uploaded';
  }

  stopPreview() {
    this.previewManager?.stopAll();
    this.previewManager = null;
    this.previewingMusic = false;
  }

  getLabel(eventId) {
    return SOUND_EVENTS.find(event => event.id === eventId)?.label || eventId;
  }

  escapeHtml(text) {
    const element = document.createElement('span');
    element.textContent = text;
    return element.innerHTML;
  }

  close() {
    this.stopPreview();
    this.dialog?.remove();
    this.dialog = null;
  }
}
