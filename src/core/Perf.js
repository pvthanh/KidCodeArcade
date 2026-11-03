// Lightweight performance and memory logging. Enable verbose logs with `?perf=1`
// in the URL or `localStorage.setItem('perf', '1')`; read the history with `__perf.report()`.
const MAX_ENTRIES = 200;

const flagEnabled = () => {
  try {
    return new URLSearchParams(window.location.search).has('perf') ||
      window.localStorage.getItem('perf') === '1';
  } catch {
    return false;
  }
};

const toMb = bytes => Math.round(bytes / 1048576 * 10) / 10;

class Perf {
  constructor() {
    this.verbose = flagEnabled();
    this.entries = [];
    this.timers = new Map();
    this.fpsFrames = 0;
    this.fpsStart = 0;
    this.fpsTimer = null;
  }

  heapMb() {
    // performance.memory is available on Chromium browsers, including Android Chrome and Samsung Internet.
    const memory = typeof performance !== 'undefined' ? performance.memory : null;
    return memory ? toMb(memory.usedJSHeapSize) : null;
  }

  record(label, details = {}) {
    const entry = { at: Math.round(performance.now()), label, heapMb: this.heapMb(), ...details };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
    if (this.verbose) console.info('[perf]', label, details, entry.heapMb === null ? '' : `heap ${entry.heapMb} MB`);
    return entry;
  }

  start(label) {
    this.timers.set(label, performance.now());
  }

  end(label, details = {}) {
    const begin = this.timers.get(label);
    if (begin === undefined) return 0;
    this.timers.delete(label);
    const ms = Math.round((performance.now() - begin) * 10) / 10;
    this.record(label, { ms, ...details });
    return ms;
  }

  async measure(label, task, details = {}) {
    const begin = performance.now();
    try {
      return await task();
    } finally {
      this.record(label, { ms: Math.round((performance.now() - begin) * 10) / 10, ...details });
    }
  }

  measureSync(label, task, details = {}) {
    const begin = performance.now();
    try {
      return task();
    } finally {
      this.record(label, { ms: Math.round((performance.now() - begin) * 10) / 10, ...details });
    }
  }

  // Samples the frame rate of a running Phaser game every few seconds so long sessions can be compared.
  watchGame(game, label = 'game') {
    this.stopWatching();
    this.fpsStart = performance.now();
    this.fpsFrames = 0;
    this.fpsTimer = setInterval(() => {
      if (!game.isBooted || !game.loop) return;
      const loop = game.loop;
      const scene = game.scene?.scenes?.[0];
      this.record(`${label}.sample`, {
        fps: Math.round(loop?.actualFps || 0),
        objects: scene?.children?.length ?? 0,
        textures: game.textures ? game.textures.getTextureKeys().length : 0,
        tweens: scene?.tweens?.getTweens?.().length ?? 0
      });
    }, 10000);
  }

  stopWatching() {
    clearInterval(this.fpsTimer);
    this.fpsTimer = null;
  }

  report() {
    console.table(this.entries);
    return this.entries;
  }
}

export const perf = new Perf();
if (typeof window !== 'undefined') window.__perf = perf;
