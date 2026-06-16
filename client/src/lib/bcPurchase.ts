import { apiRequest } from '@/lib/queryClient'
import { executeBantahBroPreparedWalletAction } from '@/lib/walletActions'
import { executeOnchainEscrowStakeTx } from '@/lib/onchainEscrow'
import type { OnchainPublicConfig } from '@shared/onchainConfig'
import type { BantahBroPreparedWalletAction, BantahBroWalletAction } from '@shared/bantahBroWallet'

export type PurchaseBcWithWalletOptions = {
  ensureOnchainWallet: (purpose?: string) => Promise<{ walletAddress: string }>
  wallets: any
  solanaWallets?: any
  usdAmount: number
  nativeAmount: string // string representation of native token amount (e.g. '0.05')
  tokenSymbol?: string // 'USDT' or 'BNB' or 'SOL'
}

export async function purchaseBcWithWallet(opts: PurchaseBcWithWalletOptions) {
  const { ensureOnchainWallet, wallets, solanaWallets, usdAmount, nativeAmount } = opts
  const tokenSymbol = (opts.tokenSymbol || 'BNB')

  const { walletAddress } = await ensureOnchainWallet('purchase BantCredit')

  const onchainConfig = (await apiRequest('GET', '/api/onchain/config')) as OnchainPublicConfig

  if (tokenSymbol === 'SOL' || tokenSymbol === 'USDC') {
    const solanaChainId = Object.values(onchainConfig.chains || {}).find(c => String(c.key).startsWith('solana'))?.chainId;
    if (!solanaChainId) throw new Error("Solana not configured in environment");

    const escrowTx = await executeOnchainEscrowStakeTx({
      wallets: wallets as any,
      solanaWallets: solanaWallets as any,
      preferredWalletAddress: walletAddress,
      onchainConfig: onchainConfig as any,
      chainId: Number(solanaChainId),
      tokenSymbol: tokenSymbol as any,
      amount: nativeAmount,
    });

    const resp = await apiRequest('POST', '/api/bantahbro/gen1/buy-bc', {
      txHash: escrowTx.escrowTxHash,
      chainId: Number(solanaChainId),
      usdAmount,
      tokenSymbol,
    })

    return { result: { txHash: escrowTx.escrowTxHash }, resp }
  }

  const walletAction: BantahBroWalletAction = {
    kind: 'send',
    chainId: onchainConfig.defaultChainId,
    chainLabel: onchainConfig.defaultChainId === 8453 ? 'Base' : 'BNB Chain',
    tokenQuery: tokenSymbol === 'USDT' ? 'USDT' : (onchainConfig.defaultChainId === 8453 ? 'ETH' : 'BNB'),
    amount: String(nativeAmount),
    recipientAddress: 'bantah.bro',
    recipientLabel: 'Bantah.bro',
    summary: `Purchase ${usdAmount} USD ≈ BantCredit`,
  }

  const preparedResponse = (await apiRequest('POST', '/api/bantahbro/wallet-actions/prepare', {
    action: walletAction,
    walletAddress,
  })) as { action: BantahBroPreparedWalletAction }

  const result = await executeBantahBroPreparedWalletAction({
    wallets,
    preferredWalletAddress: walletAddress,
    onchainConfig,
    action: preparedResponse.action,
  })

  // Call backend to mint BC (requires usdAmount provided by client)
  const resp = await apiRequest('POST', '/api/bantahbro/gen1/buy-bc', {
    txHash: result.txHash,
    chainId: onchainConfig.defaultChainId,
    usdAmount,
    tokenSymbol,
  })

  return { result, resp }
}
