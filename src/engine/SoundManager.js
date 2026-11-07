const RETRO_SOUNDS = {
  jump: { wave: 'square', notes: [{ frequency: 340, endFrequency: 560, duration: 0.12 }] },
  enemyStomp: { wave: 'triangle', notes: [{ frequency: 240, endFrequency: 110, duration: 0.12 }] },
  playerHit: { wave: 'sawtooth', notes: [{ frequency: 190, endFrequency: 80, duration: 0.2 }] },
  coin: { wave: 'square', notes: [
    { frequency: 680, duration: 0.06 },
    { frequency: 960, start: 0.055, duration: 0.11 }
  ] },
  powerUp: { wave: 'square', notes: [
    { frequency: 420, duration: 0.08 },
    { frequency: 620, start: 0.07, duration: 0.08 },
    { frequency: 860, start: 0.14, duration: 0.16 }
  ] },
  brickBreak: { wave: 'sawtooth', notes: [{ frequency: 260, endFrequency: 90, duration: 0.13 }] },
  mysteryBox: { wave: 'square', notes: [
    { frequency: 440, duration: 0.06 },
    { frequency: 660, start: 0.055, duration: 0.11 }
  ] },
  win: { wave: 'triangle', notes: [
    { frequency: 523, duration: 0.12 },
    { frequency: 659, start: 0.11, duration: 0.12 },
    { frequency: 784, start: 0.22, duration: 0.24 }
  ] },
  lose: { wave: 'triangle', notes: [
    { frequency: 392, duration: 0.12 },
    { frequency: 294, start: 0.11, duration: 0.12 },
    { frequency: 196, start: 0.22, duration: 0.25 }
  ] },
  spring: { wave: 'square', notes: [
    { frequency: 260, endFrequency: 740, duration: 0.18 }
  ] },
  switch: { wave: 'square', notes: [
    { frequency: 330, duration: 0.07 },
    { frequency: 520, start: 0.065, duration: 0.13 }
  ] },
  checkpoint: { wave: 'triangle', notes: [
    { frequency: 440, duration: 0.08 },
    { frequency: 660, start: 0.075, duration: 0.08 },
    { frequency: 880, start: 0.15, duration: 0.16 }
  ] },
  fireball: { wave: 'square', notes: [
    { frequency: 520, endFrequency: 240, duration: 0.09 }
  ] }
};

const MUSIC_TRACKS = {
  classic: { notes: [
    659.25, 783.99, 987.77, 783.99, 659.25, 523.25, 587.33, 659.25,
    783.99, 880, 783.99, 659.25, 523.25, 392, 523.25, 659.25
  ], interval: 220, wave: 'triangle' },
  sunny: { notes: [
    523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 659.25,
    698.46, 880, 1046.5, 880, 783.99, 659.25, 587.33, 523.25
  ], interval: 190, wave: 'sine' },
  moonlight: { notes: [
    440, 523.25, 659.25, 783.99, 659.25, 523.25, 493.88, 392,
    440, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88, 440
  ], interval: 310, wave: 'triangle' }
};
const BACKGROUND_MUSIC_VOLUME = 0.25;

export class SoundManager {
  constructor(eventBus, soundEffects = {}, backgroundMusic = null) {
    this.eventBus = eventBus;
    this.soundEffects = soundEffects;
    this.backgroundMusic = backgroundMusic;
    this.activeAudio = new Set();
    this.activeSynths = new Set();
    this.audioContext = null;
    this.musicGain = null;
    this.musicTimer = null;
    this.musicNoteIndex = 0;
  }

  startMusic() {
    if (this.backgroundMusic && !this.backgroundMusic.preset) {
      if (!this.backgroundMusic.enabled || this.backgroundMusic.volume <= 0) return true;
      try {
        const audio = new Audio(this.backgroundMusic.dataUrl);
        audio.loop = true;
        audio.volume = Math.max(0, Math.min(1, this.backgroundMusic.volume));
        this.activeAudio.add(audio);
        audio.addEventListener('error', () => {
          this.activeAudio.delete(audio);
          console.error('Could not play configured background music.');
          this.eventBus.emit('status', 'Could not play the configured background music.');
        }, { once: true });
        audio.play().catch(error => {
          this.activeAudio.delete(audio);
          console.error('Could not start configured background music:', error);
          this.eventBus.emit('status', 'Could not start background music. Check that the browser allows audio playback.');
        });
        return true;
      } catch (error) {
        console.error('Could not create configured background music:', error);
        this.eventBus.emit('status', 'Could not start the configured background music.');
        return false;
      }
    }
    if (this.backgroundMusic && (!this.backgroundMusic.enabled || this.backgroundMusic.volume <= 0)) return true;
    if (this.musicGain) return true;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      const error = new Error('This browser does not support background music.');
      console.error(error.message);
      this.eventBus.emit('status', error.message);
      return false;
    }

    try {
      this.audioContext ||= new AudioContextClass();
      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = this.backgroundMusic?.volume ?? BACKGROUND_MUSIC_VOLUME;
      this.musicGain.connect(this.audioContext.destination);
      this.musicNoteIndex = 0;
      const startLoop = () => {
        if (this.musicGain && this.audioContext?.state === 'running') {
          this.playNextMusicNote();
        }
      };

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(startLoop).catch(error => {
          console.error('Could not start background music:', error);
          this.eventBus.emit('status', 'Could not start background music in this browser.');
        });
      } else {
        startLoop();
      }
      return true;
    } catch (error) {
      console.error('Could not create background music:', error);
      this.eventBus.emit('status', 'Could not start background music in this browser.');
      return false;
    }
  }

  playNextMusicNote() {
    if (!this.musicGain || !this.audioContext || this.audioContext.state !== 'running') return;

    const context = this.audioContext;
    const track = MUSIC_TRACKS[this.backgroundMusic?.preset || 'classic'];
    if (!track) throw new TypeError('Unknown built-in music preset.');
    const noteStart = context.currentTime + 0.01;
    const noteEnd = noteStart + track.interval / 1000 * (0.17 / 0.22);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = this.backgroundMusic?.preset === 'sunny' ? 'sine' :
      this.backgroundMusic?.preset === 'moonlight' ? 'triangle' :
        this.musicNoteIndex % 4 === 2 ? 'square' : track.wave;
    oscillator.frequency.setValueAtTime(
      track.notes[this.musicNoteIndex % track.notes.length],
      noteStart
    );
    envelope.gain.setValueAtTime(0.0001, noteStart);
    envelope.gain.exponentialRampToValueAtTime(0.36, noteStart + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.connect(envelope);
    envelope.connect(this.musicGain);
    this.activeSynths.add(oscillator);
    oscillator.addEventListener('ended', () => this.activeSynths.delete(oscillator), { once: true });
    oscillator.start(noteStart);
    oscillator.stop(noteEnd);
    this.musicNoteIndex += 1;
    this.musicTimer = setTimeout(() => this.playNextMusicNote(), track.interval);
  }

  play(event) {
    if (Object.hasOwn(this.soundEffects, event)) {
      const sound = this.soundEffects[event];
      if (!sound.enabled || sound.volume <= 0) return false;
      return sound.preset ? this.playRetro(event, sound.preset, sound.volume) : this.playUploaded(event, sound);
    }
    return this.playRetro(event);
  }

  playUploaded(event, sound) {
    if (!sound?.enabled || !sound.dataUrl || sound.volume <= 0) return false;
    const audio = new Audio(sound.dataUrl);
    audio.volume = Math.max(0, Math.min(1, sound.volume));
    this.activeAudio.add(audio);
    audio.addEventListener('ended', () => this.activeAudio.delete(audio), { once: true });
    audio.addEventListener('error', () => {
      this.activeAudio.delete(audio);
      console.error(`Could not play the configured "${event}" sound.`);
      this.eventBus.emit('status', `Could not play the ${event} sound.`);
    }, { once: true });

    const playback = audio.play();
    playback?.catch(error => {
      this.activeAudio.delete(audio);
      console.error(`Could not play the configured "${event}" sound:`, error);
      this.eventBus.emit('status', `Could not play the ${event} sound. Check that the browser allows audio playback.`);
    });
    return true;
  }

  playRetro(event, style = 'retro', volume = 0.7) {
    const preset = RETRO_SOUNDS[event];
    if (!preset) return false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      const error = new Error('This browser does not support built-in sound effects.');
      console.error(error.message);
      this.eventBus.emit('status', error.message);
      return false;
    }

    try {
      this.audioContext ||= new AudioContextClass();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(error => {
          console.error('Could not start built-in audio:', error);
          this.eventBus.emit('status', 'Could not start built-in audio in this browser.');
        });
      }

      const start = this.audioContext.currentTime + 0.01;
      preset.notes.forEach(note => {
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const noteStart = start + (note.start || 0);
        const noteEnd = noteStart + note.duration;
        const pitch = style === 'bright' ? 1.35 : style === 'soft' ? 0.75 : 1;
        oscillator.type = style === 'bright' ? 'sine' : style === 'soft' ? 'triangle' : preset.wave;
        oscillator.frequency.setValueAtTime(note.frequency * pitch, noteStart);
        if (note.endFrequency) {
          oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency * pitch, noteEnd);
        }
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.12 * volume / 0.7, noteStart + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);
        this.activeSynths.add(oscillator);
        oscillator.addEventListener('ended', () => this.activeSynths.delete(oscillator), { once: true });
        oscillator.start(noteStart);
        oscillator.stop(noteEnd + 0.005);
      });
      return true;
    } catch (error) {
      console.error(`Could not synthesize the "${event}" sound:`, error);
      this.eventBus.emit('status', `Could not play the built-in ${event} sound.`);
      return false;
    }
  }

  stopAll() {
    clearTimeout(this.musicTimer);
    this.musicTimer = null;
    this.musicGain = null;
    for (const audio of this.activeAudio) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.activeAudio.clear();
    for (const oscillator of this.activeSynths) oscillator.stop();
    this.activeSynths.clear();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(error => {
        console.error('Could not close built-in audio:', error);
        this.eventBus.emit('status', 'Could not stop built-in audio cleanly.');
      });
    }
    this.audioContext = null;
  }
}
