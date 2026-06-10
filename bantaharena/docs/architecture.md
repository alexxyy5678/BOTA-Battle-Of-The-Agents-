# NFT PvP Prediction Arena Architecture

## Isolation Rule

All arena work starts inside `bantaharena`.

The existing Bantah app/domain should not be modified until the arena engine proves:

- users can import NFT fighters,
- fighters can battle,
- spectators can predict,
- a trusted result payload can be returned for settlement.

## Engine Split

### Current Engine Proof

Location:

```text
src/game/scenes/BattleScene.ts
```

Responsibilities:

- boot Phaser 4.1.0,
- preload game assets with Phaser Loader,
- create frame animations with the Phaser Animation Manager,
- run Arcade Physics,
- spawn imported NFT fighter textures,
- run AI movement in `update`,
- resolve collider/overlap based melee hitboxes and projectiles,
- apply damage, shields, stun, KO, and battle end,
- emit the result payload for the surrounding prediction UI.

### React Shell

Location:

```text
src/App.tsx
```

Responsibilities:

- import/edit NFT fighter data,
- hold local spectator prediction state,
- start/replay/reset battles,
- display the result payload.

For this validation phase, Phaser decides the winner because the goal is to prove real game-engine combat. For production settlement, the engine rules should be moved to or mirrored by an authoritative server.

### Prediction Layer

Current MVP:

```text
local in-memory prediction ledger
```

Future Bantah integration:

```text
challenge created -> pool opens -> battle event stream plays -> result submitted -> pool settles
```

## Swordbattle.io Adoption Note

Swordbattle.io remains the reference for Phaser arena structure, movement feel, and multiplayer patterns.

Important: the public repository is GPL-3.0, so direct code reuse should be treated as a product/license decision before it is mixed into proprietary Bantah code. This lab keeps the first engine proof isolated while preserving the same target shape: Phaser arena visuals plus authoritative battle state outside the client.
