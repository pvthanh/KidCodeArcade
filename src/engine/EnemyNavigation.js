export function hasSafeGround(body, direction, surfaces, worldWidth, distance = 4) {
  const x = direction > 0 ? body.right + distance : body.left - distance;
  if (x < 0 || x >= worldWidth) return false;
  return surfaces.some(surface => {
    const ground = surface?.body;
    return surface.active && ground?.enable && surface.getData('tileType') !== 'Lava' &&
      ground.checkCollision?.none !== true && ground.checkCollision?.up !== false &&
      x >= ground.left && x < ground.right &&
      ground.top >= body.bottom - 4 && ground.top <= body.bottom + 12;
  });
}

export function patrolDirection(body, direction, safeAhead) {
  const blocked = direction < 0
    ? body.blocked.left || body.touching.left
    : body.blocked.right || body.touching.right;
  return blocked || !safeAhead ? -direction : direction;
}

export function trackingDirection(enemy, player, intelligence) {
  if (intelligence === 'patrol' || !player?.active) return null;
  const range = intelligence === 'hunter' ? 480 : 240;
  const verticalRange = intelligence === 'hunter' ? 160 : 96;
  const dx = player.x - enemy.x;
  return Math.abs(dx) <= range && Math.abs(player.y - enemy.y) <= verticalRange
    ? Math.sign(dx)
    : null;
}
