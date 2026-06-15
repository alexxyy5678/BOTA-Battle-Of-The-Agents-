import Phaser from 'phaser';
import { GridEngine, Direction } from 'grid-engine';

export default class KothScene extends Phaser.Scene {
  private gridEngine!: GridEngine;
  private agents: any[] = [];
  private agentsGroup!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private agentExtras: Map<string, { health: number, hpBar: Phaser.GameObjects.Graphics, nameText: Phaser.GameObjects.Text }> = new Map();

  constructor() {
    super({ key: 'KothScene' });
  }

  preload() {
    // We load the 5x5 sprite sheet and assume each frame is exactly 1/5th of the size
    // Assuming the image Gemini_Generated_Image_h8jargh8jargh8ja.png is 1024x1024 as typical AI generations are.
    // 1024 / 5 = 204.8 (approx 205). We'll set a generic frame size.
    // Actually, since GridEngine expects specific animations, we will load it as a standard spritesheet.
    // For now we use the main UI background as a static map or generate a simple tilemap.
    this.load.image('arena-bg', '/2dgame/gui/36df36a5d243a9613b5cb5d4a99e6b87.jpg');
    
    // Load the 5x5 sprite sheet
    // Let's assume it's 1024x1024, so frame is 204x204
    // this.load.spritesheet('orange-bot', ...);

    this.load.spritesheet('flame', '/2dgame/image/vfx/flame-impact-sheet.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('water', '/2dgame/image/vfx/water-burst-sheet.png', { frameWidth: 192, frameHeight: 192 });
    this.load.spritesheet('smoke', '/2dgame/image/vfx/smoke-impact-sheet.png', { frameWidth: 192, frameHeight: 192 });
  }

  create() {
    // Add the background
    const bg = this.add.image(0, 0, 'arena-bg').setOrigin(0, 0);
    
    // Scale it to fit the window or a fixed size
    bg.setDisplaySize(this.scale.width, this.scale.height);

    // Create animations for the orange-bot (from the 5x5 grid)
    // We'll map the rows to directions (down, left, right, up)
    // We no longer use orange-bot animations
    // this.createWalkingAnimation('down', 0, 4);
    // this.createWalkingAnimation('left', 5, 9);
    // this.createWalkingAnimation('right', 10, 14);
    // this.createWalkingAnimation('up', 15, 19);

    this.anims.create({ key: 'flame-anim', frames: this.anims.generateFrameNumbers('flame', { start: 0, end: 15 }), frameRate: 24, repeat: -1 });
    this.anims.create({ key: 'water-anim', frames: this.anims.generateFrameNumbers('water', { start: 0, end: 13 }), frameRate: 24, repeat: -1 });
    this.anims.create({ key: 'smoke-anim', frames: this.anims.generateFrameNumbers('smoke', { start: 0, end: 15 }), frameRate: 24, repeat: -1 });

    this.bullets = this.physics.add.group();
    this.agentsGroup = this.physics.add.group();

    this.physics.add.overlap(this.bullets, this.agentsGroup, (bullet: any, agentSprite: any) => {
      bullet.destroy();
      const agentId = agentSprite.texture.key; // We used agent.id as texture key in spawnAgent
      const extra = this.agentExtras.get(agentId);
      if (extra && extra.health > 0) {
        extra.health = Math.max(0, extra.health - 20); // 20 damage per hit
        this.updateHealthBar(extra.hpBar, extra.health);
        
        // Optional: Flash red
        agentSprite.setTint(0xff0000);
        this.time.delayedCall(100, () => agentSprite.clearTint());

        // If dead, handle death penalty
        if (extra.health <= 0) {
           this.handleAgentDeath(agentId, agentSprite, extra);
        }
      }
    });

    // Listen to React events
    const agentUpdateListener = (e: any) => {
      this.syncAgents(e.detail);
    };
    window.addEventListener('update-koth-agents', agentUpdateListener);
    
    this.events.on('destroy', () => {
      window.removeEventListener('update-koth-agents', agentUpdateListener);
    });

    // We can't initialize grid-engine without a tilemap. Since we don't have a tilemap JSON,
    // we will simulate an invisible tilemap for grid-engine, OR just use Phaser Arcade Physics natively
    // since the user's map is a JPG and not a Tiled JSON map!
    // Wait, the blog post used GridEngine with a TileMap. 
    // If we don't have a tilemap, we can just use pure Phaser Arcade physics for isometric movement.
    
    // Let's create an invisible grid map programmatically so GridEngine works!
    const mapData = [];
    for (let y = 0; y < 20; y++) {
      const row = [];
      for (let x = 0; x < 20; x++) {
        row.push(0);
      }
      mapData.push(row);
    }
    const map = this.make.tilemap({ data: mapData, tileWidth: 48, tileHeight: 48 });
    const tileset = map.addTilesetImage('dummy_tileset') || undefined; 
    const layer = map.createLayer(0, tileset as any, 0, 0);

    // GridEngine config
    const gridEngineConfig = {
      characters: [],
    };
    
    // The plugin must be accessed via 'gridEngine' injected in config
    this.gridEngine.create(map, gridEngineConfig);

    // Random AI loop
    this.time.addEvent({
      delay: 1000,
      callback: this.randomAgentAI,
      callbackScope: this,
      loop: true
    });
  }

  createWalkingAnimation(direction: string, start: number, end: number) {
    this.anims.create({
      key: direction,
      frames: this.anims.generateFrameNumbers('orange-bot', { start, end }),
      frameRate: 8,
      repeat: -1,
    });
  }

  syncAgents(mockAgents: any[]) {
    mockAgents.forEach((mockAgent, idx) => {
      if (!this.gridEngine.hasCharacter(mockAgent.id)) {
        if (!this.textures.exists(mockAgent.id)) {
          this.load.image(mockAgent.id, mockAgent.avatarUrl);
          this.load.once('complete', () => {
            this.spawnAgent(mockAgent, idx);
          });
          this.load.start();
        } else {
          this.spawnAgent(mockAgent, idx);
        }
      }
    });
  }

  handleAgentDeath(agentId: string, sprite: any, extra: any) {
    // Stop them
    if (this.gridEngine.hasCharacter(agentId)) {
      this.gridEngine.stopMovement(agentId);
      this.gridEngine.removeCharacter(agentId);
    }
    this.agents = this.agents.filter(id => id !== agentId);
    
    // Play death spin and fade
    this.tweens.killTweensOf(sprite);
    this.tweens.add({
      targets: [sprite, extra.hpBar, extra.nameText],
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      angle: 360,
      duration: 800,
      onComplete: () => {
        sprite.destroy();
        extra.hpBar.destroy();
        extra.nameText.destroy();
      }
    });

    // Notify backend
    fetch(`/api/bantahbro/koth/agents/${agentId}/die`, { method: 'POST' })
      .catch(err => console.error('Failed to report agent death', err));
  }

  updateHealthBar(hpBar: Phaser.GameObjects.Graphics, health: number) {
    hpBar.clear();
    // Background red
    hpBar.fillStyle(0xff0000, 1);
    hpBar.fillRect(-20, -50, 40, 6);
    // Foreground green
    hpBar.fillStyle(0x00ff00, 1);
    hpBar.fillRect(-20, -50, 40 * (health / 100), 6);
  }

  spawnAgent(mockAgent: any, idx: number) {
    if (this.gridEngine.hasCharacter(mockAgent.id)) return;

    // Create new sprite using the standard Arena avatar
    const sprite = this.agentsGroup.create(0, 0, mockAgent.id);
    sprite.setDisplaySize(64, 64); // Scale the avatar to look normal
        
    // Add overhead text
    const text = this.add.text(0, -40, mockAgent.name, { fontSize: '14px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
    
    // Add health bar
    const hpBar = this.add.graphics();
    this.updateHealthBar(hpBar, 100);
    
    this.agentExtras.set(mockAgent.id, { health: 100, hpBar, nameText: text });
        
    // Register in grid engine
    this.gridEngine.addCharacter({
      id: mockAgent.id,
      sprite: sprite,
      startPosition: { x: 5 + idx * 3, y: 5 + idx * 3 },
      speed: 4
    });

    // Link text and hpBar to sprite
    this.events.on('update', () => {
      text.x = sprite.x;
      text.y = sprite.y - 45;
      hpBar.x = sprite.x;
      hpBar.y = sprite.y;
    });

    // Add bobbing animation for movement
    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      const sprite = this.gridEngine.getSprite(charId);
      if (sprite) {
        if (direction === 'left') sprite.setFlipX(true);
        if (direction === 'right') sprite.setFlipX(false);
        
        // Add waddle/hop animation
        this.tweens.add({
          targets: sprite,
          angle: { from: -8, to: 8 },
          yoyo: true,
          repeat: -1,
          duration: 150
        });
      }
    });

    this.gridEngine.movementStopped().subscribe(({ charId }) => {
      const sprite = this.gridEngine.getSprite(charId);
      if (sprite) {
        this.tweens.killTweensOf(sprite);
        sprite.setAngle(0);
        sprite.setScale(1, 1);
        sprite.setDisplaySize(64, 64);
      }
    });

    this.agents.push(mockAgent.id);
  }

  randomAgentAI() {
    this.agents.forEach(agentId => {
      if (!this.gridEngine.isMoving(agentId)) {
        const action = Math.random();
        if (action < 0.6) {
          // Move randomly
          const dirs: Direction[] = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
          const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
          this.gridEngine.move(agentId, randomDir);
        } else {
          // Shoot randomly
          this.shoot(agentId);
        }
      }
    });
  }

  shoot(shooterId: string) {
    const pos = this.gridEngine.getPosition(shooterId);
    // Find a random target
    const targets = this.agents.filter(a => a !== shooterId);
    if (targets.length === 0) return;
    const targetId = targets[Math.floor(Math.random() * targets.length)];
    const targetSprite = this.gridEngine.getSprite(targetId);
    
    const sprite = this.gridEngine.getSprite(shooterId);
    
    // Pick a random elemental effect
    const effects = ['flame', 'water', 'smoke'];
    const selectedEffect = effects[Math.floor(Math.random() * effects.length)];
    
    const bullet = this.bullets.create(sprite.x, sprite.y, selectedEffect);
    bullet.setDisplaySize(64, 64);
    bullet.play(`${selectedEffect}-anim`);
    
    // Add glow based on effect
    if (bullet.postFX) {
      if (selectedEffect === 'flame') bullet.postFX.addGlow(0xff4400, 4, 0, false, 0.1, 24);
      if (selectedEffect === 'water') bullet.postFX.addGlow(0x0088ff, 4, 0, false, 0.1, 24);
      if (selectedEffect === 'smoke') bullet.postFX.addGlow(0xaaaaaa, 4, 0, false, 0.1, 24);
    }
    
    const dx = targetSprite.x - sprite.x;
    const dy = targetSprite.y - sprite.y;
    const angle = Math.atan2(dy, dx);
    bullet.setRotation(angle);

    this.physics.moveTo(bullet, targetSprite.x, targetSprite.y, 300);

    // Destroy bullet after 2 seconds if it didn't hit
    this.time.delayedCall(2000, () => {
      bullet.destroy();
    });
  }
}
