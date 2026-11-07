import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let GridCanvas;
let StateManager;
let SetSelectedTileVariantCommand;

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  ({ GridCanvas } = await server.ssrLoadModule('/src/editor/GridCanvas.js'));
  ({ StateManager } = await server.ssrLoadModule('/src/core/StateManager.js'));
  ({ SetSelectedTileVariantCommand } = await server.ssrLoadModule('/src/core/CommandManager.js'));
});

after(async () => {
  await server.close();
});

test('selecting an object notifies the toolbox and empty selection does not', () => {
  const grid = Object.create(GridCanvas.prototype);
  const events = [];
  grid.selectionMode = true;
  grid.selectedCells = [{ row: 1, col: 2 }];
  grid.stateManager = {
    getTile: (row, col) => row === 1 && col === 2 ? 'Boss' : null,
    getTileVariant: () => 'classic'
  };
  grid.eventBus = { emit: (...args) => events.push(args) };
  grid.refresh = () => {};
  grid.syncSelectedObject();
  assert.deepEqual(events, [
    ['pipeSelectionChanged', { selected: false, linked: false }],
    ['boardObjectSelected', { tileType: 'Boss', variantId: 'classic' }]
  ]);
  grid.syncSelectedObject({ row: 0, col: 0 });
  assert.deepEqual(grid.selectedCells, []);
  assert.equal(events.length, 3);
});

test('changing selected appearances is scoped and undoable', () => {
  const state = new StateManager();
  state.setTile(1, 1, 'Ground');
  state.setTile(1, 2, 'Ground');
  const variant = state.tileVariantCatalog.Ground.find(item => item.id !== 'classic').id;
  const command = new SetSelectedTileVariantCommand([{ row: 1, col: 1 }], 'Ground', variant);
  assert.equal(command.execute(state), true);
  assert.equal(state.getTileVariant(1, 1), variant);
  assert.equal(state.getTileVariant(1, 2), 'classic');
  command.undo(state);
  assert.equal(state.getTileVariant(1, 1), 'classic');
  command.redo(state);
  assert.equal(state.getTileVariant(1, 1), variant);
  assert.equal(new SetSelectedTileVariantCommand([{ row: 1, col: 1 }], 'Pipe', variant).execute(state), false);
});

test('a selected pipe stack changes together and undo restores individual appearances', () => {
  const state = new StateManager();
  const alternate = {
    id: 'alternate', name: 'Alternate', dataUrl: 'data:image/png;base64,AA=='
  };
  state.registerTileVariant('Pipe', alternate);
  state.setTile(1, 1, 'Pipe');
  state.setTile(2, 1, 'Pipe', alternate.id);
  state.pipeLinks = [{ source: { row: 1, col: 1 }, destination: { row: 1, col: 3 } }];
  const command = new SetSelectedTileVariantCommand(
    [{ row: 1, col: 1 }, { row: 2, col: 1 }], 'Pipe', alternate.id
  );
  assert.equal(command.execute(state), true);
  assert.equal(state.getTileVariant(1, 1), alternate.id);
  assert.equal(state.getTileVariant(2, 1), alternate.id);
  command.undo(state);
  assert.equal(state.getTileVariant(1, 1), 'classic');
  assert.equal(state.getTileVariant(2, 1), alternate.id);
  assert.equal(state.pipeLinks.length, 1);
});
