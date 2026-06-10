class Sprite {
  // Just handle the basic animation render.
  constructor({
    position,
    mirror = false,
    offset = { x: 0, y: 0 },
    imageSrc,
    scale = 1,
    totalFrames = 1,
    frameWidth = null,
    frameHeight = null,
    frameColumns = null,
    frameStart = 0,
    frameSequence = null,
    framesHold = 5,
    context = canvas2dContext,
    canvasElement = canvas,
    gravityValue = gravity,
    floorY = null,
    movementBounds = null,
    renderFilter = "",
  }) {
    this.position = position;
    this.mirror = mirror;
    this.height = 150;
    this.width = 50;
    this.image = new Image();
    this.image.src = imageSrc;
    this.scale = scale;
    this.totalFrames = totalFrames;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameColumns = frameColumns;
    this.frameStart = frameStart;
    this.frameSequence = frameSequence;
    this.currentFrame = 0;
    this.framesElapsed = 0;
    this.framesHold = framesHold;
    this.defaultFramesHold = framesHold;
    this.offset = offset;
    this.context = context;
    this.canvas = canvasElement;
    this.gravity = gravityValue;
    this.floorY = floorY;
    this.movementBounds = movementBounds;
    this.renderFilter = renderFilter;
    this.damageFlashUntil = 0;
  }

  draw() {
    const source = this.getFrameSourceRect();
    const { drawX, drawY, drawWidth, drawHeight } = this.getDrawMetrics(source);

    this.context.save();
    const canvasFilter = this.getCanvasFilter();
    if (canvasFilter) {
      this.context.filter = canvasFilter;
    }
    if (this.mirror) {
      this.context.translate(drawX + drawWidth, drawY);
      this.context.scale(-1, 1);
      this.context.drawImage(
        this.image,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        drawWidth,
        drawHeight,
      );
    } else {
      this.context.drawImage(
        this.image,
        source.x,
        source.y,
        source.width,
        source.height,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
      );
    }
    this.context.restore();
  }

  getDrawMetrics(source = this.getFrameSourceRect()) {
    return {
      drawX: this.position.x - this.offset.x + (this.renderOffsetX || 0),
      drawY: this.position.y - this.offset.y + (this.renderOffsetY || 0),
      drawWidth: source.width * this.scale,
      drawHeight: source.height * this.scale,
    };
  }

  getCanvasFilter() {
    const filters = [];
    if (this.renderFilter) filters.push(this.renderFilter);

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (this.damageFlashUntil && now < this.damageFlashUntil) {
      filters.push("brightness(1.55) saturate(3.2) sepia(1) hue-rotate(318deg) contrast(1.16)");
    }

    return filters.filter(Boolean).join(" ");
  }

  getFrameSourceRect() {
    const frameWidth = this.frameWidth || this.image.width / Math.max(1, this.totalFrames);
    const frameHeight = this.frameHeight || this.image.height;
    const frameColumns = this.frameColumns || Math.max(1, Math.floor(this.image.width / frameWidth));
    const sequenceIndex = Array.isArray(this.frameSequence)
      ? this.frameSequence[this.currentFrame % this.frameSequence.length]
      : this.frameStart + this.currentFrame;
    const frameIndex = Math.max(0, Number(sequenceIndex) || 0);

    return {
      x: (frameIndex % frameColumns) * frameWidth,
      y: Math.floor(frameIndex / frameColumns) * frameHeight,
      width: frameWidth,
      height: frameHeight,
    };
  }

  animateFrames() {
    this.framesElapsed++;
    if (this.framesElapsed % this.framesHold === 0) {
      if (this.currentFrame < this.totalFrames - 1) {
        this.currentFrame++;
      } else {
        this.currentFrame = 0;
      }
    }
  }

  update() {
    this.draw();
    this.animateFrames();
  }
}

class Fighter extends Sprite {
  constructor({
    position,
    mirror = false,
    velocity,
    color = "red",
    offset = { x: 0, y: 0 },
    imageSrc,
    scale = 1,
    totalFrames = 1,
    frameWidth = null,
    frameHeight = null,
    frameColumns = null,
    frameStart = 0,
    frameSequence = null,
    framesHold = 5,
    sprites,
    context = canvas2dContext,
    canvasElement = canvas,
    gravityValue = gravity,
    floorY = null,
    movementBounds = null,
    bodySize = null,
    hurtboxes = null,
    collisionBox = null,
    attackBox = {
      offset: {},
      width: undefined,
      height: undefined,
    },
  }) {
    // Call the constructor of the parent class
    super({
      position,
      mirror,
      offset,
      imageSrc,
      scale,
      totalFrames,
      frameWidth,
      frameHeight,
      frameColumns,
      frameStart,
      frameSequence,
      framesHold,
      context,
      canvasElement,
      gravityValue,
      floorY,
      movementBounds,
    });

    this.velocity = velocity;
    this.color = color;
    this.height = bodySize?.height || 150;
    this.width = bodySize?.width || 50;
    this.lastKey;
    this.health = 100;
    this.dead = false;

    this.state = "stand";
    this.stateSprites = {
      stand: "idle",
      walk: "run",
      jump: "jump",
      fall: "fall",
      attack: "attack",
      hitstun: "takeHit",
      knockdown: "takeHit",
      dead: "death",
      roundover: "idle",
    };

    this.isAttacking = false;
    this.activeMove = null;
    this.activeHitIds = new Set();
    this.attackBox = {
      position: {
        x: this.position.x,
        y: this.position.y,
      },
      offset: attackBox.offset,
      width: attackBox.width,
      height: attackBox.height,
    };

    const defaultBodyBox = {
      offset: { x: 0, y: 0 },
      width: this.width,
      height: this.height,
    };
    this.hurtboxes = this.normalizeBoxes(hurtboxes, defaultBodyBox);
    this.collisionBox = this.normalizeBox(collisionBox, defaultBodyBox);

    this.currentFrame = 0;
    this.framesElapsed = 0;
    this.framesHold = framesHold;
    this.defaultFramesHold = framesHold;
    this.sprites = sprites;
    this.deathStartedAt = 0;

    for (const sprite in this.sprites) {
      sprites[sprite].image = new Image();
      sprites[sprite].image.src = sprites[sprite].imageSrc;
    }
  }

  draw() {
    if (!this.shouldUseDefeatCollapse()) {
      super.draw();
      return;
    }

    const source = this.getFrameSourceRect();
    const { drawX, drawY, drawWidth, drawHeight } = this.getDrawMetrics(source);
    const progress = this.getDefeatProgress();
    const eased = 1 - Math.pow(1 - progress, 3);
    const leanDirection = this.mirror ? -1 : 1;
    const leanRadians = leanDirection * (0.78 + eased * 0.18);
    const pivotX = drawX + drawWidth * 0.5;
    const pivotY = drawY + drawHeight * 0.86;

    this.context.save();
    this.context.translate(pivotX, pivotY);
    this.context.rotate(leanRadians * eased);
    this.context.scale(1 + eased * 0.04, Math.max(0.34, 1 - eased * 0.44));
    this.context.translate(-pivotX, -pivotY + eased * 12);
    this.context.globalAlpha = Math.max(0.76, 1 - eased * 0.12);
    super.draw();
    this.context.restore();
  }

  update() {
    this.draw();
    if (!this.dead) {
      this.animateFrames();
    }

    this.updateAttackBox();

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.clampToStage();

    // Fitting to the ground and gravity feature.
    const floorY = this.floorY ?? this.canvas.height - this.height;
    if (this.position.y + this.velocity.y >= floorY) {
      this.velocity.y = 0;
      this.position.y = floorY;
    } else {
      this.velocity.y += this.gravity;
    }
  }

  animateFrames() {
    this.framesElapsed++;
    if (this.framesElapsed % this.framesHold !== 0) return;

    if (this.currentFrame < this.totalFrames - 1) {
      this.currentFrame++;
      return;
    }

    this.onAnimationComplete();
  }

  onAnimationComplete() {
    if (this.state === "dead") {
      this.dead = true;
      return;
    }

    if (this.state === "attack") {
      this.isAttacking = false;
      this.activeMove = null;
      this.activeHitIds.clear();
      this.setState(this.isGrounded() ? "stand" : "fall", { force: true });
      return;
    }

    if (this.state === "hitstun" || this.state === "knockdown") {
      this.setState(this.isGrounded() ? "stand" : "fall", { force: true });
      return;
    }

    this.currentFrame = 0;
  }

  attack(move = this.attackConfig) {
    this.startMove(move);
  }

  startMove(move) {
    if (!move || !this.canStartMove()) return false;

    this.activeMove = move;
    this.activeHitIds.clear();
    this.isAttacking = true;
    this.applyMoveHitbox(move);
    this.setState("attack", { force: true });
    return true;
  }

  takeHit(damage = 20) {
    if (this.state === "dead" || this.state === "roundover") return;

    this.activeMove = null;
    this.activeHitIds.clear();
    this.isAttacking = false;
    this.health = Math.max(0, this.health - damage);

    if (this.health <= 0) {
      this.setState("dead", { force: true });
    } else {
      this.setState("hitstun", { force: true });
    }
  }

  stopActions({ idle = true } = {}) {
    this.velocity.x = 0;
    this.isAttacking = false;
    this.activeMove = null;
    this.activeHitIds.clear();

    if (this.health <= 0 || this.dead) {
      this.setState("dead", { force: true });
      return;
    }

    this.setState("roundover", { force: true });
    if (idle) {
      this.forceSprite("idle", { reset: true });
    }
  }

  canStartMove() {
    return this.canControl();
  }

  canControl() {
    return ![
      "attack",
      "hitstun",
      "knockdown",
      "dead",
      "roundover",
    ].includes(this.state);
  }

  setMovementState(nextState) {
    if (!this.canControl()) return false;
    return this.setState(nextState);
  }

  setState(nextState, { force = false } = {}) {
    if (!force && !this.canTransitionTo(nextState)) return false;
    if (this.state === nextState && !force) return true;

    this.state = nextState;
    if (nextState === "dead") {
      this.dead = false;
      this.deathStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    }
    const sprite = this.stateSprites[nextState] || "idle";
    this.forceSprite(sprite, { reset: true });
    return true;
  }

  getDefeatProgress() {
    const startedAt = this.deathStartedAt || (typeof performance !== "undefined" ? performance.now() : Date.now());
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    return Math.min(1, Math.max(0, (now - startedAt) / 620));
  }

  hasDedicatedDeathSprite() {
    const deathSprite = this.sprites?.death;
    if (!deathSprite) return false;
    const frames = Array.isArray(deathSprite.frameSequence)
      ? deathSprite.frameSequence.length
      : Number(deathSprite.totalFrames || 0);
    return frames > 1;
  }

  shouldUseDefeatCollapse() {
    return this.state === "dead" && !this.hasDedicatedDeathSprite();
  }

  canTransitionTo(nextState) {
    if (nextState === "dead" || nextState === "roundover") return true;
    if (this.state === "dead" || this.state === "roundover") return false;
    if (nextState === "hitstun" || nextState === "knockdown") return true;
    return this.canControl();
  }

  isGrounded() {
    const floorY = this.floorY ?? this.canvas.height - this.height;
    return this.position.y >= floorY - 0.5 && this.velocity.y === 0;
  }

  applyMoveHitbox(move) {
    const hitbox = this.getLocalMoveHitboxes(move)[0];
    if (!hitbox) return;

    this.attackBox.offset = hitbox.offset;
    this.attackBox.width = hitbox.width;
    this.attackBox.height = hitbox.height;
    this.updateAttackBox();
  }

  updateAttackBox() {
    const hitbox = this.getLocalMoveHitboxes(this.activeMove)[0] || this.attackBox;
    this.attackBox.position.x = this.position.x + (hitbox.offset?.x || 0);
    this.attackBox.position.y = this.position.y + (hitbox.offset?.y || 0);
    this.attackBox.width = hitbox.width;
    this.attackBox.height = hitbox.height;
  }

  getHitBoxes() {
    if (!this.isAttacking || !this.activeMove) return [];
    if (this.currentFrame !== this.activeMove.hitFrame) return [];

    return this.getLocalMoveHitboxes(this.activeMove).map((box) =>
      this.getWorldBox(box),
    );
  }

  getHurtBoxes() {
    if (this.health <= 0 || this.state === "dead") return [];
    return this.hurtboxes.map((box) => this.getWorldBox(box));
  }

  getCollisionBox() {
    return this.getWorldBox(this.collisionBox);
  }

  getLocalMoveHitboxes(move) {
    if (!move) return [];
    if (Array.isArray(move.hitboxes)) return move.hitboxes;
    if (move.hitbox) return [move.hitbox];
    return [];
  }

  getWorldBox(box) {
    return {
      position: {
        x: this.position.x + (box.offset?.x || 0),
        y: this.position.y + (box.offset?.y || 0),
      },
      width: box.width,
      height: box.height,
    };
  }

  normalizeBoxes(boxes, fallback) {
    const source = boxes || [fallback];
    return (Array.isArray(source) ? source : [source]).map((box) =>
      this.normalizeBox(box, fallback),
    );
  }

  normalizeBox(box, fallback) {
    return {
      offset: {
        x: box?.offset?.x ?? fallback.offset.x,
        y: box?.offset?.y ?? fallback.offset.y,
      },
      width: box?.width ?? fallback.width,
      height: box?.height ?? fallback.height,
    };
  }

  clampToStage() {
    const left = this.movementBounds?.left ?? 0;
    const right = this.movementBounds?.right ?? this.canvas.width;
    this.position.x = Math.min(
      Math.max(this.position.x, left),
      right - this.width,
    );
  }

  forceSprite(sprite, { reset = false } = {}) {
    const spriteConfig = this.sprites?.[sprite];
    if (!spriteConfig) return;
    if (this.image === spriteConfig.image && !reset) return;

    this.image = spriteConfig.image;
    this.totalFrames = spriteConfig.totalFrames;
    this.frameWidth = spriteConfig.frameWidth || null;
    this.frameHeight = spriteConfig.frameHeight || null;
    this.frameColumns = spriteConfig.frameColumns || null;
    this.frameStart = spriteConfig.frameStart || 0;
    this.frameSequence = spriteConfig.frameSequence || null;
    this.framesHold = spriteConfig.framesHold || this.defaultFramesHold || 5;
    this.currentFrame = 0;
    this.framesElapsed = 0;
  }

  switchSprite(sprite) {
    const state = Object.entries(this.stateSprites).find(
      ([, stateSprite]) => stateSprite === sprite,
    )?.[0];

    if (state) {
      this.setState(state);
    }
  }
}
