export class SpriteAnimator {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  createAnimations(scene, spriteMetadata) {
    for (const [entityType, metadata] of Object.entries(spriteMetadata)) {
      for (const [animationType, animation] of Object.entries(metadata.animations || {})) {
        const textureKey = `${entityType}-${animationType}`;
        if (!scene.textures.exists(textureKey) || animation.frameCount < 2) continue;
        if (scene.anims.exists(textureKey)) continue;
        scene.anims.create({
          key: textureKey,
          frames: scene.anims.generateFrameNumbers(textureKey, {
            start: 0,
            end: animation.frameCount - 1
          }),
          frameRate: animation.frameRate || 8,
          repeat: -1
        });
      }

      if (!metadata.dataUrl || !metadata.frames || metadata.frames < 2 ||
        !scene.textures.exists(entityType) || scene.anims.exists(`${entityType}-loop`)) continue;
      scene.anims.create({
        key: `${entityType}-loop`,
        frames: scene.anims.generateFrameNumbers(entityType, { start: 0, end: metadata.frames - 1 }),
        frameRate: 8,
        repeat: -1
      });
    }
  }

  play(entity, entityType, animationType) {
    if (!entity) return false;
    const availableAnimations = entity.scene.worldSnapshot.spriteMetadata?.[entityType]?.animations || {};
    const fallbackOrder = entityType === 'Player'
      ? {
          idle: ['idle'],
          walk: ['walk', 'run'],
          run: ['run', 'walk'],
          jump: ['jump', 'walk', 'idle']
        }
      : {
          idle: ['idle', 'walk'],
          walk: ['walk', 'idle']
        };
    for (const candidate of fallbackOrder[animationType] || [animationType]) {
      if (!availableAnimations[candidate]) continue;
      const key = `${entityType}-${candidate}`;
      if (entity.scene.anims.exists(key)) entity.play(key, true);
      else if (entity.scene.textures.exists(key)) entity.setTexture(key, 0);
      return true;
    }

    if (animationType === 'idle' && availableAnimations.walk &&
      entity.scene.textures.exists(`${entityType}-walk`)) {
      entity.setTexture(`${entityType}-walk`, 0);
      return true;
    }

    if (entity.scene.textures.exists(entityType)) {
      const base = `${entityType}-loop`;
      if (entity.scene.anims.exists(base)) entity.play(base, true);
      else entity.setTexture(entityType, 0);
      return true;
    }
    return false;
  }

  animate(entity, entityType, animationType) {
    return this.play(entity, entityType, animationType);
  }
}
