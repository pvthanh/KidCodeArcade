import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let GridCanvas;

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  ({ GridCanvas } = await server.ssrLoadModule('/src/editor/GridCanvas.js'));
});

after(async () => {
  await server.close();
});

test('pipe drag scrolls continuously in both axes and stops on cancellation', () => {
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  let nextId = 0;
  const frames = new Map();
  globalThis.requestAnimationFrame = callback => {
    frames.set(++nextId, callback);
    return nextId;
  };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const tick = time => {
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback(time);
  };
  try {
    const grid = Object.create(GridCanvas.prototype);
    grid.board = {
      clientWidth: 200, clientHeight: 200, clientLeft: 0, clientTop: 0,
      scrollWidth: 3000, scrollHeight: 1200, scrollLeft: 0, scrollTop: 0,
      getBoundingClientRect: () => ({ left: 10, top: 20 })
    };
    grid.stage = {
      clientLeft: 0, clientTop: 0,
      getBoundingClientRect: () => ({ left: 10 - grid.board.scrollLeft, top: 20 - grid.board.scrollTop })
    };
    grid.refresh = () => {};
    grid.isLinkingPipes = true;
    grid.linkPointerClient = { clientX: 209, clientY: 219 };
    grid.edgeScrollFrame = 0;
    grid.startEdgeScroll();
    tick(0);
    tick(50);
    assert.ok(grid.board.scrollLeft > 40);
    assert.ok(grid.board.scrollTop > 40);
    assert.equal(grid.pointerPosition.x, 199 + grid.board.scrollLeft);
    assert.equal(grid.pointerPosition.y, 199 + grid.board.scrollTop);
    grid.linkPointerClient = { clientX: 11, clientY: 21 };
    tick(100);
    assert.equal(grid.board.scrollLeft, 0);
    assert.equal(grid.board.scrollTop, 0);
    tick(150);
    assert.equal(frames.size, 0);
    grid.linkPointerClient = { clientX: 209, clientY: 219 };
    grid.startEdgeScroll();
    grid.clearSelectionGesture();
    assert.equal(frames.size, 0);
    assert.equal(grid.isLinkingPipes, false);
  } finally {
    globalThis.requestAnimationFrame = originalRequest;
    globalThis.cancelAnimationFrame = originalCancel;
  }
});
