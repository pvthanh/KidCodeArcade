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
    this.previewAudio = null;
    this.eventBus.on('openSoundSettings', () => this.open());
  }

  open() {
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
            <p>Configure looping background music and a separate sound for each game event.</p>
          </div>
          <button class="sound-dialog-close" type="button" aria-label="Close sound settings">✕</button>
        </header>
        <div class="sound-list">
          <article class="sound-row background-music-row">
            <div class="sound-copy">
              <strong>Background music</strong>
              <span>Loops throughout this level while it is being played</span>
              <span class="sound-file-name" data-music-file>
                ${this.escapeHtml(this.stateManager.backgroundMusic?.fileName || 'No music uploaded')}
              </span>
            </div>
            <div class="sound-controls">
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
                  ${this.stateManager.backgroundMusic?.enabled === false ? '' : 'checked'}
                  ${this.stateManager.backgroundMusic ? '' : 'disabled'}>
                Enabled
              </label>
              <button type="button" class="sound-preview-button" data-music-preview
                ${this.stateManager.backgroundMusic ? '' : 'disabled'}
                aria-label="Preview background music">▶</button>
              <button type="button" class="sound-remove-button" data-music-remove
                ${this.stateManager.backgroundMusic ? '' : 'disabled'}
                aria-label="Remove background music">Remove</button>
            </div>
          </article>
          ${SOUND_EVENTS.map(event => `
            <article class="sound-row" data-sound-event="${event.id}">
              <div class="sound-copy">
                <strong>${event.label}</strong>
                <span>${event.description}</span>
                <span class="sound-file-name" data-sound-file>${this.escapeHtml(this.getSound(event.id)?.fileName || 'No sound uploaded')}</span>
              </div>
              <div class="sound-controls">
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
                  <input type="checkbox" data-sound-enabled ${this.getSound(event.id)?.enabled === false ? '' : 'checked'} ${this.getSound(event.id) ? '' : 'disabled'}>
                  Enabled
                </label>
                <button type="button" class="sound-preview-button" data-sound-preview ${this.getSound(event.id) ? '' : 'disabled'} aria-label="Preview ${event.label} sound">▶</button>
                <button type="button" class="sound-remove-button" data-sound-remove ${this.getSound(event.id) ? '' : 'disabled'} aria-label="Remove ${event.label} sound">Remove</button>
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
        if (this.previewingMusic && this.previewAudio) this.previewAudio.volume = volume;
        if (this.stateManager.backgroundMusic) {
          this.stateManager.registerBackgroundMusic({
            ...this.stateManager.backgroundMusic,
            volume
          });
        }
        return;
      }

      const input = event.target.closest('[data-sound-volume]');
      if (!input) return;
      const row = input.closest('.sound-row');
      const eventId = row.dataset.soundEvent;
      const sound = this.getSound(eventId);
      row.querySelector('[data-volume-value]').textContent = `${input.value}%`;
      if (sound) this.updateSound(eventId, { volume: Number(input.value) / 100 });
    });

    dialog.addEventListener('change', async event => {
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
        return;
      }

      const musicEnabled = event.target.closest('[data-music-enabled]');
      if (musicEnabled && this.stateManager.backgroundMusic) {
        this.stateManager.registerBackgroundMusic({
          ...this.stateManager.backgroundMusic,
          enabled: musicEnabled.checked
        });
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
      row.querySelector('[data-sound-file]').textContent = file.name;
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
    const row = this.dialog.querySelector('.background-music-row');
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
      row.querySelector('[data-music-file]').textContent = file.name;
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
    const existing = this.getSound(eventId);
    if (!existing) return;
    this.stateManager.registerSoundEffect(eventId, { ...existing, ...updates });
  }

  playPreview(eventId) {
    const sound = this.getSound(eventId);
    if (!sound?.dataUrl) return;
    this.previewAudio?.pause();
    this.previewingMusic = false;
    this.previewAudio = new Audio(sound.dataUrl);
    this.previewAudio.volume = sound.enabled ? sound.volume : 0;
    this.previewAudio.play().catch(error => {
      console.error(`Could not preview the ${eventId} sound:`, error);
      this.eventBus.emit('status', `Could not preview the ${this.getLabel(eventId)} sound.`);
    });
  }

  playMusicPreview() {
    const music = this.stateManager.backgroundMusic;
    if (!music?.dataUrl) return;
    this.previewAudio?.pause();
    this.previewingMusic = true;
    this.previewAudio = new Audio(music.dataUrl);
    this.previewAudio.loop = true;
    this.previewAudio.volume = music.enabled ? music.volume : 0;
    this.previewAudio.play().catch(error => {
      console.error('Could not preview background music:', error);
      this.eventBus.emit('status', 'Could not preview the background music.');
    });
  }

  removeBackgroundMusic() {
    this.stateManager.removeBackgroundMusic();
    this.previewAudio?.pause();
    this.previewAudio = null;
    this.previewingMusic = false;
    const row = this.dialog.querySelector('.background-music-row');
    row.querySelector('[data-music-file]').textContent = 'No music uploaded';
    row.querySelector('[data-music-volume]').value = '25';
    row.querySelector('[data-music-volume-value]').textContent = '25%';
    row.querySelector('[data-music-enabled]').checked = true;
    row.querySelector('[data-music-enabled]').disabled = true;
    row.querySelector('[data-music-preview]').disabled = true;
    row.querySelector('[data-music-remove]').disabled = true;
    this.eventBus.emit('status', 'Background music removed.');
  }

  removeSound(eventId) {
    this.stateManager.removeSoundEffect(eventId);
    this.previewAudio?.pause();
    this.previewAudio = null;
    const row = this.dialog.querySelector(`[data-sound-event="${eventId}"]`);
    row.querySelector('[data-sound-file]').textContent = 'No sound uploaded';
    row.querySelector('[data-sound-volume]').value = '70';
    row.querySelector('[data-volume-value]').textContent = '70%';
    row.querySelector('[data-sound-enabled]').checked = true;
    row.querySelector('[data-sound-enabled]').disabled = true;
    row.querySelector('[data-sound-preview]').disabled = true;
    row.querySelector('[data-sound-remove]').disabled = true;
    this.eventBus.emit('status', `${this.getLabel(eventId)} sound removed.`);
  }

  getSound(eventId) {
    return this.stateManager.soundEffects[eventId];
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
    this.previewAudio?.pause();
    this.previewAudio = null;
    this.previewingMusic = false;
    this.dialog?.remove();
    this.dialog = null;
  }
}
