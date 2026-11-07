export const SOUND_PRESETS = [
  { id: 'retro', label: 'Retro' },
  { id: 'bright', label: 'Bright' },
  { id: 'soft', label: 'Soft' }
];

export const MUSIC_PRESETS = [
  { id: 'classic', label: 'Classic Adventure' },
  { id: 'sunny', label: 'Sunny Journey' },
  { id: 'moonlight', label: 'Moonlight Quest' }
];

export const SOUND_EVENT_IDS = [
  'jump', 'enemyStomp', 'playerHit', 'coin', 'powerUp', 'brickBreak', 'mysteryBox',
  'win', 'lose', 'spring', 'switch', 'checkpoint', 'fireball'
];

export function validAudioSettings(settings, presets) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) ||
    typeof settings.volume !== 'number' || !Number.isFinite(settings.volume) ||
    settings.volume < 0 || settings.volume > 1 || typeof settings.enabled !== 'boolean') return false;
  if (Object.hasOwn(settings, 'preset')) {
    return presets.some(preset => preset.id === settings.preset) && !Object.hasOwn(settings, 'dataUrl');
  }
  return typeof settings.dataUrl === 'string' && settings.dataUrl.startsWith('data:audio/');
}
