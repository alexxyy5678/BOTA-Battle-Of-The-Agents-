# Bantah Arena

Standalone engine lab for the NFT PvP prediction arena.

This folder is intentionally isolated from the existing Bantah app/domain while the game engine is validated.

## Current Slice

- NFT-style fighter import with image URL or local image file.
- Trait/class/stat inputs before the Phaser layer receives fighter data.
- Phaser 4.1.0 Arcade Physics battle engine.
- Phaser-loaded arena, platform, crowd, weapon, projectile, and fighter spritesheet assets.
- Animation Manager driven fighter states: idle, walk, attack, hurt, and victory.
- Engine-owned movement, collisions, melee hitboxes, projectiles, AI, abilities, HP, KO, and replay.
- Local spectator prediction pool.
- Settlement-shaped result payload with winner, seed, final HP, and audit hash.

## Run

```bash
npm install
npm run dev
```

Default local URL:

```text
http://localhost:5188
```

## Boundary

The current engine proof lives in `src/game/scenes/BattleScene.ts`.

React handles NFT inputs and spectator predictions. Phaser owns the battle loop and emits the finished result payload. Before production settlement, the same combat rules should be mirrored or moved into a server-authoritative battle service.
