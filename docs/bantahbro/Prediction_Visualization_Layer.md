# BantahBro Prediction Visualization Layer

## Phase 1: Read-Only Market Theater

BantahBro can wrap existing prediction markets without owning their liquidity. In this mode, the source platform keeps execution, pricing, settlement, and liquidity. BantahBro adds the battle experience.

Current Phase 1 implementation:

- Source: Polymarket public market data.
- Endpoint: `/api/bantahbro/prediction-battles/live`.
- Mode: `visualization`.
- Execution: read-only. No CLOB order signing or trade submission yet.
- Mapping: `YES` becomes the bullish faction and `NO` becomes the bearish faction.

## Data Mapping

Polymarket market:

```txt
Will BTC hit $150k?
YES 63c
NO 37c
```

BantahBro visualization:

```txt
BTC Bulls 63%
vs
BTC Bears 37%
```

The feed preserves:

- Polymarket market ID.
- Source market URL.
- YES/NO prices.
- YES/NO CLOB token IDs when Polymarket provides them.
- Volume.
- Liquidity.
- End date.
- Read-only execution note.

## Phase 2: UI Integration

Implemented:

- `MARKET TV` tab renders live Polymarket visualization battles.
- `Battle Mode` toggle switches between battle framing and normal source-market framing.
- `Open Polymarket` action sends users to the source market.
- `Join Bulls/Bears` opens a protected ticket modal instead of faking execution.
- Feed ranking prefers active, liquid, non-lopsided markets.

## Phase 3: Execution Mode

Scaffold implemented:

- `POST /api/bantahbro/prediction-battles/:battleId/order-intent`
- Maps Bantah faction side to Polymarket YES/NO outcome token metadata when available.
- Accepts amount and max price.
- Returns estimated shares and source market URL.
- Returns `executionReady: false` until live CLOB signing/submission is configured.

Still required for live execution:

- Wallet connection path for Polymarket-compatible signing.
- Allowance/balance checks.
- EIP-712 CLOB order building.
- User signature collection.
- Authenticated Polymarket CLOB submission.
- Fill/order sync from the source/CLOB lifecycle.

Important: a BantahBro `Join Bulls` action should be price protected. It should behave like a marketable limit order with a maximum acceptable price, not a blind buy.

## Phase 4: User Position Tracking

Implemented:

- Database-backed tracking table: `prediction_visualization_positions`.
- `GET /api/bantahbro/prediction-battles/positions/my`.
- `POST /api/bantahbro/prediction-battles/:battleId/positions`.
- `POST /api/bantahbro/prediction-battles/positions/:positionId/source-opened`.
- Market TV cards show when the current user is tracking a market.
- Join modal now saves an authenticated tracked ticket with amount, max price, estimated shares, source market URL, side, faction, and status.

Current status semantics:

- `intent_saved`: user saved a protected ticket inside BantahBro.
- `source_opened`: user opened the source market from the tracked ticket.
- `filled`: reserved for future source/CLOB fill sync.
- `cancelled`: reserved for future user cancellation.
- `failed`: reserved for future execution/sync failures.

Important: Phase 4 still does not pretend a Polymarket order was filled. It stores BantahBro-side user intent and faction identity so Phase 5/6 can attach real wallet signing and CLOB order lifecycle.

## Phase 5: Wallet and Execution Preflight

Implemented:

- `POST /api/bantahbro/prediction-battles/positions/:positionId/execution-preflight`.
- The Market TV ticket modal detects the connected Privy wallet address when available.
- Preflight checks:
  - Wallet connected.
  - Polymarket CLOB outcome token ID exists.
  - Max price is valid for marketable-limit execution.
  - CLOB host/chain config exists.
  - CLOB SDK/client is available.
  - Wallet signer path is wired.
  - CLOB submission credentials/flag are configured.
- Position status moves to `execution_checked` after a preflight attempt.

## Phase 6: CLOB Submission Guardrail

Implemented:

- `POST /api/bantahbro/prediction-battles/positions/:positionId/submit-clob-order`.
- The route refuses to submit if any preflight check fails.
- If preflight ever passes, the route still returns a locked response until frontend EIP-712 signing and signed order submission are implemented.

Why this matters:

- Polymarket orders are non-custodial signed orders.
- A BantahBro click must never fake a fill or submit a blind order.
- The user must sign a price-protected order before any CLOB submit can happen.

## Phase 7: Market Theater UX

Implemented:

- Market TV has live source-market cards.
- Battle Mode can be toggled.
- Cards show tracked user positions.
- The ticket modal now includes source market, protected price, tracked status, wallet, preflight checklist, and source-market fallback action.

Next real-production step:

- Install/wire the Polymarket CLOB client or equivalent API adapter.
- Add frontend EIP-712 typed-data signing with the connected wallet.
- Add allowance/balance checks for the relevant collateral/token path.
- Submit signed orders only after all checks pass.
- Sync order/fill status back into `prediction_visualization_positions`.

## Product Principle

BantahBro owns attention and experience. The partner market owns liquidity and settlement.
