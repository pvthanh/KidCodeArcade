import { Events } from 'phaser';

export class EventBus {
  constructor() {
    this.emitter = new Events.EventEmitter();
  }

  on(event, callback) {
    this.emitter.on(event, callback);
    return this;
  }

  once(event, callback) {
    this.emitter.once(event, callback);
    return this;
  }

  off(event, callback) {
    this.emitter.off(event, callback);
    return this;
  }

  emit(event, data = {}) {
    return this.emitter.emit(event, data);
  }

  clear(event) {
    this.emitter.removeAllListeners(event);
  }

  clearAll() {
    this.emitter.removeAllListeners();
  }

  getEvents() {
    return this.emitter.eventNames();
  }
}
