import Phaser from "phaser";
import type { ArenaSide, BattleEvent, BattleResult, FighterClass, FighterStats, NftFighter } from "../../battle/types";
import { shortHash } from "../../battle/random";
import {
  ARENA_COMPLETE_EVENT,
  ARENA_LOAD_EVENT,
  ARENA_PLAY_EVENT,
  ARENA_RESET_EVENT,
  type ArenaLoadPayload,
  type ArenaPlayPayload
} from "../events";

type EngineState = "idle" | "running" | "complete";

interface FighterActor {
  side: ArenaSide;
  fighter: NftFighter;
  sprite: Phaser.Physics.Arcade.Sprite;
  portrait: Phaser.GameObjects.Image;
  weapon: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  ring: Phaser.GameObjects.Arc;
  nameText: Phaser.GameObjects.Text;
  hpBack: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  hpText: Phaser.GameObjects.Text;
  shieldText: Phaser.GameObjects.Text;
  hp: number;
  maxHp: number;
  shield: number;
  nextAttackAt: number;
  nextAbilityAt: number;
  stunnedUntil: number;
  lastMoveEventAt: number;
  alive: boolean;
}

interface ProjectileData {
  owner: ArenaSide;
  damage: number;
  crit: boolean;
  stunMs?: number;
  ability?: string;
}

const SIDE_COLORS: Record<ArenaSide, number> = {
  left: 0x2ee6a6,
  right: 0xff466d
};

const SIDE_TEXT: Record<ArenaSide, string> = {
  left: "#2ee6a6",
  right: "#ff466d"
};

const ARENA_BOUNDS = new Phaser.Geom.Rectangle(78, 126, 804, 330);
const CENTER_Y = 330;
const MAX_BATTLE_MS = 45000;
export class BattleScene extends Phaser.Scene {
  private state: EngineState = "idle";
  private leftActor: FighterActor | null = null;
  private rightActor: FighterActor | null = null;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private hitboxes!: Phaser.GameObjects.Group;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private eventsLog: BattleEvent[] = [];
  private activeSeed = "";
  private activeStartedAt = 0;
  private rng = new Phaser.Math.RandomDataGenerator(["bantaharena"]);
  private statusText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;

  private loadListener = (event: Event) => {
    void this.handleLoad(event as CustomEvent<ArenaLoadPayload>);
  };

  private playListener = (event: Event) => {
    void this.handlePlay(event as CustomEvent<ArenaPlayPayload>);
  };

  constructor() {
    super("BattleScene");
  }

  preload() {
    this.load.svg("arena-bg", "/assets/arena/cyber-arena-bg.svg", { width: 960, height: 540 });
    this.load.svg("arena-platform", "/assets/arena/arena-platform.svg", { width: 960, height: 220 });
    this.load.svg("crowd-strip", "/assets/arena/crowd-strip.svg", { width: 960, height: 90 });
    this.load.svg("weapon-blade", "/assets/arena/weapon-blade.svg", { width: 96, height: 160 });
    this.load.svg("pulse-projectile", "/assets/arena/projectile-pulse.svg", { width: 64, height: 64 });
    this.load.svg("frost-projectile", "/assets/arena/projectile-frost.svg", { width: 64, height: 64 });
    this.load.spritesheet("fighter-body", "/assets/arena/fighter-body-sheet.svg", { frameWidth: 160, frameHeight: 220 });
    this.load.spritesheet("impact-spark", "/assets/arena/impact-spark-sheet.svg", { frameWidth: 80, frameHeight: 80 });
  }

  create() {
    this.physics.world.setBounds(ARENA_BOUNDS.x, ARENA_BOUNDS.y, ARENA_BOUNDS.width, ARENA_BOUNDS.height);
    this.physics.world.setFPS(60);

    this.projectiles = this.physics.add.group({
      allowGravity: false,
      collideWorldBounds: false
    });
    this.hitboxes = this.add.group();

    this.createAnimations();
    this.drawArena();

    this.statusText = this.add
      .text(28, 24, "ARENA READY", {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "16px",
        color: "#d7fff3",
        fontStyle: "700"
      })
      .setDepth(40);

    this.bannerText = this.add
      .text(480, 90, "", {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "34px",
        color: "#ffffff",
        fontStyle: "900",
        stroke: "#000000",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(50);

    window.addEventListener(ARENA_LOAD_EVENT, this.loadListener);
    window.addEventListener(ARENA_PLAY_EVENT, this.playListener);
    window.addEventListener(ARENA_RESET_EVENT, this.handleReset);

    const removeWindowListeners = () => {
      window.removeEventListener(ARENA_LOAD_EVENT, this.loadListener);
      window.removeEventListener(ARENA_PLAY_EVENT, this.playListener);
      window.removeEventListener(ARENA_RESET_EVENT, this.handleReset);
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, removeWindowListeners);
    this.events.once(Phaser.Scenes.Events.DESTROY, removeWindowListeners);
  }

  update(time: number, delta: number) {
    this.syncActorUi(this.leftActor);
    this.syncActorUi(this.rightActor);

    if (this.state !== "running" || !this.leftActor || !this.rightActor) {
      return;
    }

    this.updateFighterAi(this.leftActor, this.rightActor, time, delta);
    this.updateFighterAi(this.rightActor, this.leftActor, time, delta);
    this.cullProjectiles();

    if (this.battleTime(time) >= MAX_BATTLE_MS) {
      const winner = this.leftActor.hp === this.rightActor.hp
        ? this.rng.pick(["left", "right"] as ArenaSide[])
        : this.leftActor.hp > this.rightActor.hp
          ? "left"
          : "right";
      this.finishBattle(winner, "timeout", time);
    }
  }

  private handleLoad = async (event: CustomEvent<ArenaLoadPayload>) => {
    this.resetEngine();
    this.state = "idle";
    this.statusText?.setText("FIGHTERS READY");
    this.bannerText?.setText("");
    await this.spawnPreview(event.detail.left, event.detail.right);
  };

  private handlePlay = async (event: CustomEvent<ArenaPlayPayload>) => {
    this.resetEngine();
    this.state = "running";
    this.activeSeed = event.detail.seed;
    this.activeStartedAt = this.time.now + 250;
    this.rng = new Phaser.Math.RandomDataGenerator([event.detail.seed]);
    this.eventsLog = [];

    const left = normalizeFighter(event.detail.left);
    const right = normalizeFighter(event.detail.right);
    await this.spawnActors(left, right);

    if (!this.leftActor || !this.rightActor) {
      return;
    }

    this.record({ kind: "spawn", t: 0, side: "left", hp: this.leftActor.hp, x: this.leftActor.sprite.x, y: this.leftActor.sprite.y });
    this.record({ kind: "spawn", t: 0, side: "right", hp: this.rightActor.hp, x: this.rightActor.sprite.x, y: this.rightActor.sprite.y });

    this.colliders.push(this.physics.add.collider(this.leftActor.sprite, this.rightActor.sprite));
    this.colliders.push(
      this.physics.add.overlap(
        this.projectiles,
        [this.leftActor.sprite, this.rightActor.sprite],
        this.handleProjectileOverlap,
        undefined,
        this
      )
    );

    this.statusText.setText(`${left.name.toUpperCase()} VS ${right.name.toUpperCase()}`);
    this.bannerText.setText("BATTLE LIVE");
    this.time.delayedCall(850, () => {
      if (this.state === "running") {
        this.bannerText.setText("");
      }
    });
  };

  private handleReset = () => {
    this.resetEngine();
    this.state = "idle";
    this.statusText?.setText("RESET");
    this.bannerText?.setText("");
  };

  private async spawnPreview(left: NftFighter, right: NftFighter) {
    await this.spawnActors(normalizeFighter(left), normalizeFighter(right));
    this.leftActor?.sprite.setVelocity(0, 0);
    this.rightActor?.sprite.setVelocity(0, 0);
  }

  private async spawnActors(left: NftFighter, right: NftFighter) {
    const leftTexture = await this.ensureTexture("left", left);
    const rightTexture = await this.ensureTexture("right", right);

    this.leftActor = this.createActor("left", left, leftTexture, 240, CENTER_Y);
    this.rightActor = this.createActor("right", right, rightTexture, 720, CENTER_Y);
  }

  private createActor(side: ArenaSide, fighter: NftFighter, portraitTextureKey: string, x: number, y: number): FighterActor {
    const color = SIDE_COLORS[side];
    const direction = side === "left" ? 1 : -1;
    const shadow = this.add.ellipse(x, y + 78, 132, 34, 0x000000, 0.38).setDepth(8);
    const ring = this.add.circle(x, y + 10, 80, color, 0.1).setStrokeStyle(3, color, 0.9).setDepth(9);
    const sprite = this.physics.add.sprite(x, y + 18, "fighter-body", 0).setDisplaySize(138, 190).setDepth(15);
    const portrait = this.add.image(x, y - 58, portraitTextureKey).setDisplaySize(66, 66).setDepth(21);
    const weapon = this.add.image(x + direction * 58, y + 2, "weapon-blade").setDisplaySize(58, 112).setAngle(direction === 1 ? -28 : 28).setDepth(19);
    weapon.setTint(classAccent(fighter.className));

    sprite.setBodySize(64, 116, true);
    sprite.setCollideWorldBounds(true);
    sprite.setBounce(0.2, 0.2);
    sprite.setDamping(true);
    sprite.setDrag(780, 780);
    sprite.setMaxVelocity(320, 320);
    sprite.setFlipX(side === "right");
    sprite.play("fighter:idle");

    const hpBack = this.add.rectangle(x - 56, y - 132, 112, 11, 0x141822, 1).setOrigin(0, 0.5).setDepth(24);
    const hpFill = this.add.rectangle(x - 56, y - 132, 112, 11, color, 1).setOrigin(0, 0.5).setDepth(25);
    const hpText = this.add
      .text(x, y - 154, `${fighter.stats.hp} HP`, {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "13px",
        color: "#f6fff8",
        fontStyle: "800",
        stroke: "#000000",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(26);
    const shieldText = this.add
      .text(x, y - 118, "", {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "12px",
        color: "#aaf8ff",
        fontStyle: "800",
        stroke: "#000000",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(26);
    const nameText = this.add
      .text(x, y + 120, fighter.name, {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "15px",
        color: "#ffffff",
        fontStyle: "800",
        stroke: "#000000",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(26);

    sprite.setData("side", side);

    return {
      side,
      fighter,
      sprite,
      portrait,
      weapon,
      shadow,
      ring,
      nameText,
      hpBack,
      hpFill,
      hpText,
      shieldText,
      hp: fighter.stats.hp,
      maxHp: fighter.stats.hp,
      shield: 0,
      nextAttackAt: this.time.now + 700 + this.rng.integerInRange(0, 250),
      nextAbilityAt: this.time.now + abilityWarmup(fighter.className),
      stunnedUntil: 0,
      lastMoveEventAt: 0,
      alive: true
    };
  }

  private createAnimations() {
    if (!this.anims.exists("fighter:idle")) {
      this.anims.create({
        key: "fighter:idle",
        frames: this.anims.generateFrameNumbers("fighter-body", { frames: [0, 1] }),
        frameRate: 4,
        repeat: -1,
        yoyo: true
      });
    }

    if (!this.anims.exists("fighter:walk")) {
      this.anims.create({
        key: "fighter:walk",
        frames: this.anims.generateFrameNumbers("fighter-body", { frames: [0, 2, 1, 2] }),
        frameRate: 9,
        repeat: -1
      });
    }

    if (!this.anims.exists("fighter:attack")) {
      this.anims.create({
        key: "fighter:attack",
        frames: this.anims.generateFrameNumbers("fighter-body", { frames: [2, 3, 2, 0] }),
        frameRate: 16,
        repeat: 0
      });
    }

    if (!this.anims.exists("fighter:hurt")) {
      this.anims.create({
        key: "fighter:hurt",
        frames: this.anims.generateFrameNumbers("fighter-body", { frames: [4, 0] }),
        frameRate: 10,
        repeat: 0
      });
    }

    if (!this.anims.exists("fighter:victory")) {
      this.anims.create({
        key: "fighter:victory",
        frames: this.anims.generateFrameNumbers("fighter-body", { frames: [5, 0, 5, 1] }),
        frameRate: 7,
        repeat: -1
      });
    }

    if (!this.anims.exists("impact:burst")) {
      this.anims.create({
        key: "impact:burst",
        frames: this.anims.generateFrameNumbers("impact-spark", { start: 0, end: 4 }),
        frameRate: 22,
        repeat: 0,
        hideOnComplete: true
      });
    }
  }

  private updateFighterAi(actor: FighterActor, target: FighterActor, time: number, delta: number) {
    if (!actor.alive || !target.alive) {
      actor.sprite.setVelocity(0, 0);
      return;
    }

    if (time < actor.stunnedUntil) {
      actor.sprite.setVelocity(0, 0);
      this.playActorAnimation(actor, "fighter:hurt");
      this.pulseActor(actor, 0x79f6ff);
      return;
    }

    const distance = Phaser.Math.Distance.Between(actor.sprite.x, actor.sprite.y, target.sprite.x, target.sprite.y);
    actor.sprite.setFlipX(target.sprite.x < actor.sprite.x);
    actor.weapon.setAngle(target.sprite.x >= actor.sprite.x ? -28 : 28);

    if (time >= actor.nextAbilityAt && this.tryAbility(actor, target, time)) {
      actor.nextAbilityAt = time + abilityCooldown(actor.fighter.className);
      return;
    }

    if (distance > actor.fighter.stats.range) {
      const speed = actor.fighter.stats.speed * 15.5;
      this.playActorAnimation(actor, "fighter:walk");
      this.physics.moveToObject(actor.sprite, target.sprite, speed, 0);
      this.recordMove(actor, target, time);
      return;
    }

    actor.sprite.setVelocity(0, 0);
    this.playActorAnimation(actor, "fighter:idle");

    if (time >= actor.nextAttackAt) {
      this.basicAttack(actor, target, time);
      actor.nextAttackAt = time + actor.fighter.stats.cooldown;
    }

    if (delta > 0 && this.rng.frac() < 0.006) {
      actor.sprite.setVelocityY(this.rng.realInRange(-20, 20));
    }
  }

  private tryAbility(actor: FighterActor, target: FighterActor, time: number): boolean {
    const className = actor.fighter.className;
    const t = this.battleTime(time);
    const ability = abilityName(className);
    const distance = Phaser.Math.Distance.Between(actor.sprite.x, actor.sprite.y, target.sprite.x, target.sprite.y);

    if (className === "tank") {
      const amount = 18 + Math.round(actor.fighter.stats.defense * 1.35);
      actor.shield += amount;
      this.record({ kind: "ability", t, side: actor.side, ability, target: target.side });
      this.record({ kind: "shield", t, side: actor.side, amount, shield: actor.shield });
      this.pulseActor(actor, 0x79f6ff);
      return true;
    }

    if (className === "trickster") {
      const offset = actor.side === "left" ? -72 : 72;
      actor.sprite.setPosition(
        Phaser.Math.Clamp(target.sprite.x + offset, ARENA_BOUNDS.left + 30, ARENA_BOUNDS.right - 30),
        Phaser.Math.Clamp(target.sprite.y + this.rng.integerInRange(-36, 36), ARENA_BOUNDS.top + 40, ARENA_BOUNDS.bottom - 40)
      );
      this.record({ kind: "ability", t, side: actor.side, ability, target: target.side });
      this.recordMove(actor, target, time);
      this.playActorAnimation(actor, "fighter:attack", false);
      this.swingWeapon(actor, target);
      this.spawnMeleeHitbox(actor, target, "phase-strike", 1.1);
      return true;
    }

    if (className === "striker" && distance < actor.fighter.stats.range + 160) {
      this.record({ kind: "ability", t, side: actor.side, ability, target: target.side });
      this.playActorAnimation(actor, "fighter:attack", false);
      this.physics.moveToObject(actor.sprite, target.sprite, 520, 0);
      this.time.delayedCall(120, () => {
        if (this.state === "running" && actor.alive) {
          actor.sprite.setVelocity(0, 0);
          this.swingWeapon(actor, target);
          this.spawnMeleeHitbox(actor, target, "dash-slash", 1.45);
        }
      });
      return true;
    }

    if (className === "frost" && distance < 360) {
      this.record({ kind: "ability", t, side: actor.side, ability, target: target.side });
      this.playActorAnimation(actor, "fighter:attack", false);
      this.swingWeapon(actor, target);
      this.spawnProjectile(actor, target, "frost-lock", 0.82, 760);
      return true;
    }

    if (className === "blaster" && distance < 420) {
      this.record({ kind: "ability", t, side: actor.side, ability, target: target.side });
      this.playActorAnimation(actor, "fighter:attack", false);
      this.swingWeapon(actor, target);
      this.spawnProjectile(actor, target, "pulse-shot", 1.28);
      return true;
    }

    return false;
  }

  private basicAttack(actor: FighterActor, target: FighterActor, time: number) {
    const ranged = actor.fighter.stats.range >= 150 || actor.fighter.className === "blaster" || actor.fighter.className === "frost";
    const ability = ranged ? "basic-projectile" : undefined;
    const t = this.battleTime(time);
    const damage = this.rollDamage(actor.fighter.stats, target.fighter.stats, 1);

    this.record({
      kind: "attack",
      t,
      side: actor.side,
      target: target.side,
      damage: damage.amount,
      crit: damage.crit,
      ability
    });

    this.playActorAnimation(actor, "fighter:attack", false);
    this.swingWeapon(actor, target);

    if (ranged) {
      this.spawnProjectile(actor, target, "basic-projectile", 1);
      return;
    }

    this.spawnMeleeHitbox(actor, target, undefined, 1);
  }

  private spawnMeleeHitbox(actor: FighterActor, target: FighterActor, ability: string | undefined, multiplier: number) {
    if (!actor.alive || !target.alive) {
      return;
    }

    const direction = target.sprite.x >= actor.sprite.x ? 1 : -1;
    const x = actor.sprite.x + direction * 62;
    const y = actor.sprite.y;
    const zone = this.add.zone(x, y, 96, 86).setDepth(30);
    this.physics.add.existing(zone);
    const body = zone.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.setEnable(true);
    zone.setData("spent", false);
    this.hitboxes.add(zone);

    const visual = this.add.graphics().setDepth(35);
    const color = ability ? 0x79f6ff : 0xffffff;
    visual.lineStyle(ability ? 11 : 8, color, 0.9);
    visual.beginPath();
    visual.moveTo(x - 58 * direction, y - 70);
    visual.lineTo(x + 58 * direction, y + 58);
    visual.strokePath();
    visual.lineStyle(3, 0xffffff, 0.85);
    visual.beginPath();
    visual.moveTo(x - 42 * direction, y - 44);
    visual.lineTo(x + 44 * direction, y + 35);
    visual.strokePath();

    const overlap = this.physics.add.overlap(zone, target.sprite, () => {
      if (zone.getData("spent") || this.state !== "running") {
        return;
      }
      zone.setData("spent", true);
      const damage = this.rollDamage(actor.fighter.stats, target.fighter.stats, multiplier);
      this.applyDamage(target, actor, damage.amount, damage.crit, ability);
    });
    this.colliders.push(overlap);

    this.time.delayedCall(150, () => {
      overlap.destroy();
      zone.destroy();
      visual.destroy();
    });
  }

  private spawnProjectile(
    actor: FighterActor,
    target: FighterActor,
    ability: string | undefined,
    multiplier: number,
    stunMs?: number
  ) {
    if (!actor.alive || !target.alive) {
      return;
    }

    const damage = this.rollDamage(actor.fighter.stats, target.fighter.stats, multiplier);
    const facing = target.sprite.x >= actor.sprite.x ? 1 : -1;
    const startX = actor.sprite.x + facing * 70;
    const startY = actor.sprite.y - 16;
    const projectile = this.physics.add.image(startX, startY, ability === "frost-lock" ? "frost-projectile" : "pulse-projectile");
    projectile.setDisplaySize(34, 34);
    projectile.setCircle(13, 3, 3);
    projectile.setDepth(36);
    projectile.setData("payload", {
      owner: actor.side,
      damage: damage.amount,
      crit: damage.crit,
      stunMs,
      ability
    } satisfies ProjectileData);
    this.projectiles.add(projectile);
    this.physics.moveToObject(projectile, target.sprite, ability === "pulse-shot" ? 430 : 360, 0);

    const trail = this.add.circle(startX - facing * 18, startY, 13, ability === "frost-lock" ? 0xaaf8ff : 0xff7bd4, 0.35).setDepth(33);
    this.tweens.add({
      targets: trail,
      scaleX: 2.4,
      alpha: 0,
      duration: 360,
      onComplete: () => trail.destroy()
    });
  }

  private handleProjectileOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (projectileObject, targetObject) => {
    if (this.state !== "running") {
      return;
    }

    const projectile = getPhysicsGameObject(projectileObject) as Phaser.Physics.Arcade.Image | null;
    const targetGameObject = getPhysicsGameObject(targetObject);
    if (!projectile || !targetGameObject) {
      return;
    }

    const payload = projectile.getData("payload") as ProjectileData | undefined;
    const targetSide = targetGameObject.getData("side") as ArenaSide | undefined;

    if (!payload || !targetSide || payload.owner === targetSide) {
      return;
    }

    const target = targetSide === "left" ? this.leftActor : this.rightActor;
    const attacker = payload.owner === "left" ? this.leftActor : this.rightActor;
    if (!target || !attacker || !target.alive || !attacker.alive) {
      projectile.destroy();
      return;
    }

    if (payload.stunMs) {
      target.stunnedUntil = this.time.now + payload.stunMs;
    }

    this.applyDamage(target, attacker, payload.damage, payload.crit, payload.ability);
    this.spawnImpact(target.sprite.x, target.sprite.y, payload.crit ? 0xffd36a : 0xffffff);
    projectile.destroy();
  };

  private applyDamage(target: FighterActor, attacker: FighterActor, rawAmount: number, crit: boolean, ability?: string) {
    if (!target.alive || this.state !== "running") {
      return;
    }

    const blocked = Math.min(target.shield, Math.round(rawAmount * 0.7));
    target.shield = Math.max(0, target.shield - blocked);
    const amount = Math.max(1, rawAmount - blocked);
    target.hp = Math.max(0, target.hp - amount);
    const t = this.battleTime(this.time.now);

    this.record({
      kind: "attack",
      t,
      side: attacker.side,
      target: target.side,
      damage: amount,
      crit,
      ability
    });
    this.record({
      kind: "damage",
      t,
      side: target.side,
      amount,
      hp: target.hp,
      crit,
      blocked
    });

    this.spawnDamageNumber(target, amount, blocked, crit);
    this.updateHealthBar(target);
    this.playActorAnimation(target, "fighter:hurt", false);
    target.sprite.setTint(crit ? 0xffd36a : 0xffffff);
    target.portrait.setTint(crit ? 0xffd36a : 0xffffff);
    this.time.delayedCall(90, () => {
      target.sprite.clearTint();
      target.portrait.clearTint();
    });
    this.cameras.main.shake(crit ? 150 : 90, crit ? 0.006 : 0.003);

    if (target.hp <= 0) {
      this.record({ kind: "ko", t, side: target.side, by: attacker.side });
      this.finishBattle(attacker.side, "ko", this.time.now);
    }
  }

  private finishBattle(winner: ArenaSide, reason: BattleResult["reason"], time: number) {
    if (this.state !== "running" || !this.leftActor || !this.rightActor) {
      return;
    }

    this.state = "complete";
    this.leftActor.sprite.setVelocity(0, 0);
    this.rightActor.sprite.setVelocity(0, 0);
    const loser = winner === "left" ? this.rightActor : this.leftActor;
    const victor = winner === "left" ? this.leftActor : this.rightActor;
    loser.alive = false;
    victor.sprite.play("fighter:victory", true);
    loser.sprite.stop();
    loser.sprite.setAlpha(0.45).setAngle(loser.side === "left" ? -12 : 12);
    loser.portrait.setAlpha(0.45).setAngle(loser.side === "left" ? -12 : 12);
    loser.weapon.setAlpha(0.28).setAngle(loser.side === "left" ? -76 : 76);
    this.tweens.add({
      targets: victor.sprite,
      y: victor.sprite.y - 18,
      yoyo: true,
      repeat: 2,
      duration: 180
    });

    const durationMs = this.battleTime(time);
    this.record({ kind: "battle-end", t: durationMs, winner, reason });

    const result = this.buildResult(winner, reason, durationMs);
    this.statusText.setText(`RESULT ${winner.toUpperCase()} | ${reason.toUpperCase()}`);
    this.bannerText.setText(`${victor.fighter.name} WINS`);
    this.cameras.main.shake(260, 0.009);

    window.dispatchEvent(new CustomEvent<BattleResult>(ARENA_COMPLETE_EVENT, { detail: result }));
  }

  private buildResult(winner: ArenaSide, reason: BattleResult["reason"], durationMs: number): BattleResult {
    const left = this.leftActor!.fighter;
    const right = this.rightActor!.fighter;
    const finalHp = {
      left: Math.max(0, Math.round(this.leftActor!.hp)),
      right: Math.max(0, Math.round(this.rightActor!.hp))
    };
    const auditInput = JSON.stringify({
      engine: "phaser-4.1.0-arcade",
      seed: this.activeSeed,
      left: compactFighter(left),
      right: compactFighter(right),
      winner,
      reason,
      finalHp,
      eventCount: this.eventsLog.length
    });

    return {
      id: `arena-${Date.now()}-${shortHash(this.activeSeed)}`,
      seed: this.activeSeed,
      auditHash: shortHash(auditInput),
      left,
      right,
      events: [...this.eventsLog],
      winner,
      reason,
      durationMs,
      finalHp
    };
  }

  private rollDamage(
    attackerStats: FighterStats,
    defenderStats: FighterStats,
    multiplier: number
  ): { amount: number; crit: boolean } {
    const crit = this.rng.frac() < attackerStats.crit;
    const variance = 0.86 + this.rng.frac() * 0.28;
    const mitigated = Math.max(3, attackerStats.attack * multiplier * variance - defenderStats.defense * 0.42);
    return {
      amount: Math.round(mitigated * (crit ? 1.7 : 1)),
      crit
    };
  }

  private recordMove(actor: FighterActor, target: FighterActor, time: number) {
    const t = this.battleTime(time);
    if (t - actor.lastMoveEventAt < 340) {
      return;
    }
    actor.lastMoveEventAt = t;
    this.record({
      kind: "move",
      t,
      side: actor.side,
      x: Math.round(actor.sprite.x),
      y: Math.round(actor.sprite.y),
      facing: target.side
    });
  }

  private record(event: BattleEvent) {
    this.eventsLog.push(event);
  }

  private battleTime(time: number): number {
    return Math.max(0, Math.round(time - this.activeStartedAt));
  }

  private updateHealthBar(actor: FighterActor) {
    const ratio = Phaser.Math.Clamp(actor.hp / actor.maxHp, 0, 1);
    actor.hpFill.displayWidth = 112 * ratio;
    actor.hpText.setText(`${Math.max(0, Math.round(actor.hp))} HP`);
    actor.shieldText.setText(actor.shield > 0 ? `SHIELD ${actor.shield}` : "");
  }

  private syncActorUi(actor: FighterActor | null) {
    if (!actor) {
      return;
    }
    const x = actor.sprite.x;
    const y = actor.sprite.y;
    const bob = this.state === "running" && actor.alive ? Math.sin(this.time.now / 165 + (actor.side === "left" ? 0 : 1.6)) * 3 : 0;
    const facing = actor.sprite.flipX ? -1 : 1;
    const labelOffset = actor.side === "left" ? -34 : 34;
    actor.shadow.setPosition(x, y + 78);
    actor.ring.setPosition(x, y + 10);
    actor.portrait.setPosition(x, y - 76 + bob);
    actor.weapon.setPosition(x + facing * 58, y + 2 + bob);
    actor.weapon.setAngle(facing === 1 ? -28 : 28);
    actor.nameText.setPosition(x + labelOffset, y + 120);
    actor.hpBack.setPosition(x - 56, y - 132);
    actor.hpFill.setPosition(x - 56, y - 132);
    actor.hpText.setPosition(x, y - 154);
    actor.shieldText.setPosition(x, y - 118);
  }

  private spawnDamageNumber(target: FighterActor, amount: number, blocked: number, crit: boolean) {
    const label = `${crit ? "CRIT " : ""}-${amount}${blocked ? ` (${blocked})` : ""}`;
    const text = this.add
      .text(target.sprite.x, target.sprite.y - 96, label, {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: crit ? "24px" : "18px",
        color: crit ? "#ffd36a" : "#ffffff",
        fontStyle: "900",
        stroke: "#000000",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(45);

    this.tweens.add({
      targets: text,
      y: text.y - 52,
      alpha: 0,
      duration: 760,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy()
    });
  }

  private playActorAnimation(actor: FighterActor, key: string, ignoreIfPlaying = true) {
    const current = actor.sprite.anims.getName();
    if (ignoreIfPlaying && current === key) {
      return;
    }

    if ((current === "fighter:attack" || current === "fighter:hurt") && actor.sprite.anims.isPlaying && key !== "fighter:victory") {
      return;
    }

    actor.sprite.play(key, ignoreIfPlaying);
  }

  private swingWeapon(actor: FighterActor, target: FighterActor) {
    const facing = target.sprite.x >= actor.sprite.x ? 1 : -1;
    const baseAngle = facing === 1 ? -28 : 28;
    const strikeAngle = facing === 1 ? 42 : -42;
    actor.weapon.setAngle(baseAngle);

    this.tweens.add({
      targets: actor.weapon,
      angle: strikeAngle,
      duration: 90,
      ease: "Quad.easeOut",
      yoyo: true,
      onComplete: () => actor.weapon.setAngle(baseAngle)
    });
  }

  private spawnImpact(x: number, y: number, color: number) {
    const burst = this.add.sprite(x, y, "impact-spark", 0).setDisplaySize(116, 116).setDepth(46);
    burst.setTint(color);
    burst.play("impact:burst");
    burst.once("animationcomplete", () => burst.destroy());

    const ring = this.add.circle(x, y, 20, color, 0).setStrokeStyle(4, color, 0.9).setDepth(44);
    this.tweens.add({
      targets: ring,
      scale: 2,
      alpha: 0,
      duration: 260,
      onComplete: () => ring.destroy()
    });

    for (let index = 0; index < 9; index += 1) {
      const spark = this.add.rectangle(x, y, 5, 14, color, 0.9).setDepth(43);
      const angle = (Math.PI * 2 * index) / 9 + this.rng.realInRange(-0.18, 0.18);
      const distance = this.rng.integerInRange(28, 62);
      spark.setAngle(Phaser.Math.RadToDeg(angle));
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleY: 0.2,
        duration: 330,
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy()
      });
    }
  }

  private pulseActor(actor: FighterActor, color: number) {
    actor.ring.setStrokeStyle(4, color, 0.95);
    this.time.delayedCall(140, () => {
      if (actor.ring.active) {
        actor.ring.setStrokeStyle(3, SIDE_COLORS[actor.side], 0.9);
      }
    });
  }

  private cullProjectiles() {
    this.projectiles.getChildren().forEach((child) => {
      const projectile = child as Phaser.Physics.Arcade.Image;
      if (
        projectile.x < ARENA_BOUNDS.left - 80 ||
        projectile.x > ARENA_BOUNDS.right + 80 ||
        projectile.y < ARENA_BOUNDS.top - 80 ||
        projectile.y > ARENA_BOUNDS.bottom + 80
      ) {
        projectile.destroy();
      }
    });
  }

  private resetEngine() {
    this.state = "idle";
    this.colliders.forEach((collider) => collider.destroy());
    this.colliders = [];
    this.projectiles?.clear(true, true);
    this.hitboxes?.clear(true, true);
    this.destroyActor(this.leftActor);
    this.destroyActor(this.rightActor);
    this.leftActor = null;
    this.rightActor = null;
    this.eventsLog = [];
    this.activeSeed = "";
    this.activeStartedAt = 0;
  }

  private destroyActor(actor: FighterActor | null) {
    if (!actor) {
      return;
    }
    actor.sprite.destroy();
    actor.portrait.destroy();
    actor.weapon.destroy();
    actor.shadow.destroy();
    actor.ring.destroy();
    actor.nameText.destroy();
    actor.hpBack.destroy();
    actor.hpFill.destroy();
    actor.hpText.destroy();
    actor.shieldText.destroy();
  }

  private ensureTexture(side: ArenaSide, fighter: NftFighter): Promise<string> {
    const textureKey = `fighter-${side}-${shortHash(`${fighter.id}-${fighter.image}`)}`;
    if (this.textures.exists(textureKey)) {
      return Promise.resolve(textureKey);
    }

    if (!fighter.image) {
      this.makeFallbackTexture(textureKey, side);
      return Promise.resolve(textureKey);
    }

    return new Promise((resolve) => {
      let failed = false;
      const onError = () => {
        failed = true;
      };

      this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
        if (failed || !this.textures.exists(textureKey)) {
          this.makeFallbackTexture(textureKey, side);
        }
        resolve(textureKey);
      });

      this.load.setCORS("anonymous");
      this.load.image(textureKey, fighter.image);
      this.load.start();
    });
  }

  private makeFallbackTexture(textureKey: string, side: ArenaSide) {
    if (this.textures.exists(textureKey)) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    const color = SIDE_COLORS[side];
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, 0, 128, 128, 18);
    graphics.fillStyle(0xffffff, 0.86);
    graphics.fillCircle(64, 58, 35);
    graphics.fillStyle(0x111111, 1);
    graphics.fillCircle(50, 53, 5);
    graphics.fillCircle(78, 53, 5);
    graphics.lineStyle(5, 0x111111, 1);
    graphics.beginPath();
    graphics.arc(64, 68, 18, 0.25, Math.PI - 0.25, false);
    graphics.strokePath();
    graphics.generateTexture(textureKey, 128, 128);
    graphics.destroy();
  }

  private drawArena() {
    this.add.image(480, 270, "arena-bg").setDisplaySize(960, 540).setDepth(0);
    const stage = this.add.image(480, 382, "arena-platform").setDisplaySize(960, 220).setDepth(4);
    const crowd = this.add.image(480, 498, "crowd-strip").setDisplaySize(960, 90).setDepth(7);

    const bounds = this.add.graphics().setDepth(6);
    bounds.lineStyle(2, 0x79f6ff, 0.18);
    bounds.strokeRoundedRect(ARENA_BOUNDS.x, ARENA_BOUNDS.y, ARENA_BOUNDS.width, ARENA_BOUNDS.height, 12);

    this.tweens.addCounter({
      from: 0.78,
      to: 1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        stage.alpha = tween.getValue() ?? 0.9;
      }
    });

    this.tweens.add({
      targets: crowd,
      y: 494,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }
}

function normalizeFighter(fighter: NftFighter): NftFighter {
  return {
    ...fighter,
    stats: {
      hp: clamp(Math.round(fighter.stats.hp), 60, 220),
      attack: clamp(Math.round(fighter.stats.attack), 5, 45),
      defense: clamp(Math.round(fighter.stats.defense), 0, 35),
      speed: clamp(Math.round(fighter.stats.speed), 5, 24),
      crit: clamp(Number(fighter.stats.crit), 0, 0.45),
      range: clamp(Math.round(fighter.stats.range), 70, 320),
      cooldown: clamp(Math.round(fighter.stats.cooldown), 650, 2000)
    }
  };
}

function abilityName(className: FighterClass): string {
  const names: Record<FighterClass, string> = {
    striker: "dash-slash",
    tank: "aegis-guard",
    frost: "frost-lock",
    trickster: "phase-step",
    blaster: "pulse-shot"
  };
  return names[className];
}

function abilityWarmup(className: FighterClass): number {
  const values: Record<FighterClass, number> = {
    striker: 2200,
    tank: 1900,
    frost: 2500,
    trickster: 2100,
    blaster: 2300
  };
  return values[className];
}

function abilityCooldown(className: FighterClass): number {
  const values: Record<FighterClass, number> = {
    striker: 5200,
    tank: 6200,
    frost: 5800,
    trickster: 4600,
    blaster: 5400
  };
  return values[className];
}

function classAccent(className: FighterClass): number {
  const values: Record<FighterClass, number> = {
    striker: 0xffd36a,
    tank: 0x79f6ff,
    frost: 0xaaf8ff,
    trickster: 0xb56dff,
    blaster: 0xff7bd4
  };
  return values[className];
}

function compactFighter(fighter: NftFighter) {
  return {
    id: fighter.id,
    name: fighter.name,
    collection: fighter.collection,
    className: fighter.className,
    traits: fighter.traits,
    statsHash: shortHash(JSON.stringify(fighter.stats)),
    imageHash: shortHash(fighter.image || fighter.id)
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getPhysicsGameObject(
  object: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
): Phaser.GameObjects.GameObject | null {
  if ("gameObject" in object && object.gameObject) {
    return object.gameObject;
  }

  if ("type" in object && "scene" in object) {
    return object as Phaser.GameObjects.GameObject;
  }

  return null;
}
