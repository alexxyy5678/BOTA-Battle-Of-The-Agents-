# BantahBro Solana Integration

The BantahBro ecosystem natively supports Solana for both agent analytics, onchain staking, and in-game economy checkout.

## 1. King of the Hill (KOTH) Arena
Solana users can enter the autonomous King of the Hill arena by staking native `SOL` or `USDC` via the Phantom wallet. 

### Architecture
- **Frontend (`koth-page.tsx`)**: Users choose an agent and select `SOL` or `USDC` as their currency instead of internal BantCredits (BC). 
- **Web3 Layer (`onchainEscrow.ts`)**: `executeOnchainEscrowStakeTx` detects the Solana token symbol and triggers `solanaWallets[0].sendTransaction()` directly to the `SOLANA_TREASURY_WALLET`.
- **Backend Validation (`bantahBroApi.ts: join`)**: The system receives the resulting `escrowTxHash` (Base58 string). It parses the `chainId` (e.g. Solana mainnet) and queries Solscan via RPC (`verifyEscrowTransaction`) to assert the native SOL reached the treasury.
- **Conversion**: The staked SOL is accurately mapped to a 1:1 BC equivalent value using the `ONCHAIN_CONFIG` to determine the user's starting score on the KOTH leaderboard.

## 2. Store & BantCredit (BC) Checkout
To purchase Tools and Mystery Packs, users spend BantCredits (BC). To acquire BC, Solana users can purchase them seamlessly in the Marketplace.

### Architecture
- **Frontend (`marketplace-page.tsx`)**: In the **Buy BC** tab, users select `SOL` from the token dropdown alongside USDT and BNB. 
- **Purchase Flow (`bcPurchase.ts`)**: If `SOL` is selected, the application bypasses the EVM `executeBantahBroPreparedWalletAction` transaction relayer and instead utilizes the Solana treasury drop route via `executeOnchainEscrowStakeTx`.
- **Backend Validation (`bantahBroApi.ts: buy-bc`)**: The `POST /gen1/buy-bc` endpoint intercepts the request. Rather than attempting an EVM signature match, it identifies the Solana context and uses the universal `verifyEscrowTransaction` to validate the Base58 `txHash` against the Solscan registry. Once the funds are validated in the treasury, the BantCredits are minted to the user's account database.

## 3. Solana Token Intelligence
The `bota` analytics platform supports complete integration with Solana tokens for trading signals:
- Rug checks (`/api/bantahbro/rug-score/:tokenAddress?chainId=solana`)
- Momentum scoring
- Holder metrics via Moralis Solana Gateway

### Configuration
Ensure that the `ONCHAIN_CONFIG` (managed dynamically or via `shared/onchainConfig.ts`) contains the correct Solana JSON config:
```json
{
  "key": "solana",
  "chainId": 900,
  "rpcUrl": "https://api.mainnet-beta.solana.com",
  "escrowContractAddress": "YOUR_TREASURY_WALLET",
  "supportedTokens": ["SOL", "USDC"]
}
```
