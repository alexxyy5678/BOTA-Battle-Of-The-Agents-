# BantahBro Arena GUI Integration Map

This maps the new `arena-gui.zip` sample game into the existing BantahBro Agent Battle system without changing the live UI yet.

## Source Review

The archive is not a clean app package. It includes a generated workspace, `.git`, `.local` pnpm store content, and assorted assets. The useful arena code is the standalone HTML/CSS/JS sample in:

```txt
arena-gui.zip
Game-Enhancement-Suitezip/attached_assets/Pasted--DOCTYPE-html-html-lang-en-head-meta-charset-UTF-8-meta_1778173715115.txt
```

Do not import the archive wholesale. The reusable parts are the arena layout concepts, animation functions, and state model. The sample game loop must not be copied directly because it generates random PEPE/DOGE movement, random trollbox posts, and simulated battle events.

## Current BantahBro Data Source

The live Agent Battle source is already Dexscreener-backed through:

```txt
server/bantahBro/agentBattleService.ts
client/src/types/agentBattle.ts
client/src/components/pages/battles-page.tsx
```

The battle payload already contains the fields the arena GUI needs:

| Arena need | BantahBro source |
| --- | --- |
| Fighter names | `battle.sides[n].label`, `tokenSymbol`, `tokenName` |
| Fighter character/logo | `battle.sides[n].logoUrl` |
| Price | `battle.sides[n].priceUsd`, `priceDisplay` |
| Short move | `priceChangeM5` |
| Wider move | `priceChangeH1`, `priceChangeH24` |
| Volume | `volumeM5`, `volumeH1`, `volumeH24` |
| Buy/sell pressure | `buysM5`, `sellsM5`, volume-derived pressure |
| Liquidity shield | `liquidityUsd` |
| Confidence/HP | `confidence` |
| Battle score | `score` |
| Timer | `timeRemainingSeconds`, `startsAt`, `endsAt` |
| Crowd/watching | `spectators` |
| Live feed | `battle.events` |
| Source links | `pairUrl`, `dexId`, `chainLabel` |

## Sample GUI State Mapping

The sample uses a global `G` object. The production mapping should be:

| Sample state | Production mapping |
| --- | --- |
| `pepeHp`, `dogeHp` | `side.confidence` as health, no random damage |
| `pepeConf`, `dogeConf` | `side.confidence` |
| `pepeGain`, `dogeGain` | `side.priceChangeM5` or selected window |
| `pepePriceDelta`, `dogePriceDelta` | live delta between previous and current `priceUsd` |
| `pepeBuy`, `dogeBuy` | buy pressure from `buysM5 / (buysM5 + sellsM5)` |
| `pepeVol`, `dogeVol` | `side.volumeM5` for arena, `side.volumeH24` for stats |
| `pepePool`, `dogePool` | real P2P pool only when escrow/pool API is available |
| `timer` | `battle.timeRemainingSeconds` |
| `round` | battle id / engine rotation key |
| `lastAttacker`, `comboCount` | derived animation cue, not persisted random state |
| `pepeBasePrice`, `dogeBasePrice` | battle start snapshot when available |

## What Must Be Removed From The Sample

The following sample systems are not production safe:

| Sample area | Reason |
| --- | --- |
| `EVENTS`, `pickEvent`, random `processEvent` | Creates fake battle movement |
| `gameLoop` interval | Mutates state without live data |
| random `TROLL_MSGS` interval | Creates mock chat |
| hardcoded PEPE/DOGE copy | Breaks dynamic token battles |
| static pools | Would imply fake P2P escrow |
| generated candles/charts | We use Dexscreener embeds or real API data only |

## Adapter Added

The first integration layer is:

```txt
client/src/lib/bantahbro/arenaGuiMapper.ts
```

It converts `AgentBattle` into an animation-ready `ArenaGuiState` and derives `ArenaGuiCue` objects from real battle deltas or the latest real battle event. It does not render anything and is not wired into the UI yet.

This gives the future arena component a clean contract:

```ts
mapBattleToArenaGuiState(battle)
deriveArenaGuiCue(previousBattle, currentBattle)
```

## Recommended Implementation Phases

1. Build a React arena component that consumes `ArenaGuiState`, not the sample global `G`.
2. Port only the visual shell and animation helpers from the sample.
3. Replace sample fighter artwork with `side.logoUrl` token logos.
4. Drive attacks, flashes, and hit effects only from `ArenaGuiCue`.
5. Keep TrollBox synced to the real TrollBox/Telegram feed.
6. Keep Battle Mode toggle behavior: when off, the arena simulation is completely hidden but betting remains available.
7. Only after visual parity is acceptable, replace the current arena block behind a feature flag.

## Guardrails

- No fake battle loop.
- No mock token data.
- No mock trollbox messages.
- No static pools.
- No generated fallback charts.
- Do not import `.local`, `.git`, or generated workspace files from the ZIP.
- Keep existing BantahBro theme tokens, dark/light support, rounded cards, and mobile layout rules when the UI is eventually mounted.
