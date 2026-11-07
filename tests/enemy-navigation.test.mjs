import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let hasSafeGround;
let patrolDirection;
let trackingDirection;
let StateManager;

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  ({ hasSafeGround, patrolDirection, trackingDirection } =
    await server.ssrLoadModule('/src/engine/EnemyNavigation.js'));
  ({ StateManager } = await server.ssrLoadModule('/src/core/StateManager.js'));
});

after(async () => {
  await server.close();
});

const body = {
  left: 32, right: 64, bottom: 96,
  blocked: { left: false, right: false }, touching: { left: false, right: false }
};

function surface(left, right, top = 96, type = 'Ground') {
  return {
    active: true,
    body: { enable: true, left, right, top, checkCollision: { up: true } },
    getData: () => type
  };
}

test('ledge checks use live solid surfaces and respect world borders', () => {
  const floor = surface(0, 96);
  assert.equal(hasSafeGround(body, 1, [floor], 128), true);
  assert.equal(hasSafeGround(body, 1, [surface(0, 64)], 128), false);
  assert.equal(hasSafeGround(body, -1, [floor], 128), true);
  assert.equal(hasSafeGround(body, 1, [floor], 68), false);
  assert.equal(hasSafeGround(body, 1, [surface(64, 96, 96, 'Lava')], 128), false);
  assert.equal(hasSafeGround(body, 1, [surface(64, 96, 128)], 128), false);
  floor.body.enable = false;
  assert.equal(hasSafeGround(body, 1, [floor], 128), false);
  floor.body.enable = true;
  floor.active = false;
  assert.equal(hasSafeGround(body, 1, [floor], 128), false);
});

test('patrol turns at a ledge or wall and tracking has bounded detection', () => {
  assert.equal(patrolDirection(body, 1, false), -1);
  assert.equal(patrolDirection({ ...body, blocked: { left: true, right: false } }, -1, true), 1);
  const enemy = { x: 100, y: 100 };
  const player = { active: true, x: 400, y: 100 };
  assert.equal(trackingDirection(enemy, player, 'patrol'), null);
  assert.equal(trackingDirection(enemy, player, 'tracker'), null);
  assert.equal(trackingDirection(enemy, player, 'hunter'), 1);
  assert.equal(trackingDirection(enemy, { ...player, x: 100 }, 'hunter'), 0);
  assert.equal(trackingDirection(enemy, { ...player, y: 300 }, 'hunter'), null);
});

test('intelligence persists, validates, and old levels default to patrol', () => {
  const state = new StateManager();
  state.setCreepyConfig('Goomba', { movement: 'ground', speed: 45, health: 1, intelligence: 'hunter' });
  const snapshot = state.getWorldSnapshot();
  const restored = new StateManager();
  restored.restoreWorld(snapshot);
  assert.equal(restored.getCreepyConfig('Goomba').intelligence, 'hunter');
  delete snapshot.creepyConfigs.Goomba.intelligence;
  restored.restoreWorld(snapshot);
  assert.equal(restored.getCreepyConfig('Goomba').intelligence, 'patrol');
  snapshot.creepyConfigs.Goomba.intelligence = 'invalid';
  assert.throws(() => restored.restoreWorld(snapshot), /invalid settings/);
  assert.throws(() => state.setCreepyConfig('Goomba', {
    movement: 'ground', speed: 45, health: 1, intelligence: 'invalid'
  }), /intelligence/);
});
