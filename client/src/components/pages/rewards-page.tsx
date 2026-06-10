'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { Copy, Crown, Gift, Link2, Loader2, LogIn, Wallet } from 'lucide-react'
import { apiRequest } from '@/lib/queryClient'
import { executeBantCreditRewardClaimTx, type OnchainRuntimeConfig } from '@/lib/onchainEscrow'
import { buildBotaPublicUrl } from '@/lib/botaUrl'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

type RewardRow = {
  id: number
  type: string
  source: string
  amount: number
  description: string
  status: string
  createdAt: string
}

type OnchainBantCreditClaim = {
  id: string
  batchId: `0x${string}`
  battleId: string
  chainId: number
  chainName: string | null
  account: string
  amount: number
  role: string
  matchId: string
  roleBytes32: `0x${string}`
  matchIdBytes32: `0x${string}`
  proof: `0x${string}`[]
  rewardRoot: string
  battleTxHash: string | null
  batchTxHash: string | null
  claimTxHash: string | null
  status: string
  createdAt: string
}

type OnchainClaimsFeed = {
  wallets: string[]
  claims: OnchainBantCreditClaim[]
  claimableCount: number
  claimableBantCredits: number
  updatedAt: string
  warning?: string
}

type RewardsResponse = {
  scope: 'viewer' | 'platform'
  stats: {
    lifetimeEarned: number
    currentAggregate: number
    currentUserPoints: number
    currentAgentPoints: number
    onchainMintedBantCredits?: number
    onchainClaimableBantCredits?: number
    onchainClaimableCount?: number
    rewardTransactionCount: number
    updatedAt: string
  }
  viewer: {
    authenticated: boolean
    points: number
    referralCode: string | null
    referralCount: number
    activeReferralCount: number
    onchainClaimableBantCredits?: number
  }
  rewards: RewardRow[]
  onchainClaims?: OnchainClaimsFeed
}

function formatNumber(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0'
  return new Intl.NumberFormat('en', {
    notation: Math.abs(value) >= 100_000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(value) >= 100_000 ? 1 : 0,
  }).format(value)
}

function formatDate(value?: string | null) {
  if (!value) return 'Recent'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recent'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function buildReferralUrl(code?: string | null) {
  if (typeof window === 'undefined') return ''
  if (!code) return buildBotaPublicUrl('/bota')
  return buildBotaPublicUrl(`/bota/share/ref/${encodeURIComponent(code)}`)
}

function shortAddress(value?: string | null) {
  if (!value) return ''
  if (value.length <= 14) return value
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function claimRoleLabel(role: string) {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'ENS_OWNER') return 'Fighter owner'
  if (normalized === 'EXTERNAL_AGENT_OWNER') return 'Agent owner'
  if (normalized === 'SPECTATOR') return 'Spectator'
  if (normalized === 'FIGHTER_OWNER') return 'Fighter owner'
  return normalized.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function RewardsPage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth()
  const { wallets } = useWallets()
  const { connectOrCreateWallet } = usePrivy()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const { data, isLoading, isError, error } = useQuery<RewardsResponse>({
    queryKey: ['/api/bantahbro/rewards', isAuthenticated ? 'signed-in' : 'guest'],
    queryFn: () => apiRequest('GET', '/api/bantahbro/rewards'),
    enabled: !authLoading,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
  const { data: onchainConfig } = useQuery<OnchainRuntimeConfig>({
    queryKey: ['/api/onchain/config'],
    queryFn: () => apiRequest('GET', '/api/onchain/config'),
    enabled: !authLoading && isAuthenticated,
    staleTime: 60_000,
  })

  const referralUrl = useMemo(
    () => buildReferralUrl(data?.viewer?.referralCode),
    [data?.viewer?.referralCode],
  )
  const rewards = data?.rewards || []
  const signedIn = Boolean(data?.viewer?.authenticated)
  const onchainClaims = data?.onchainClaims
  const claimableClaims = useMemo(
    () => (onchainClaims?.claims || []).filter((claim) => claim.status === 'claimable'),
    [onchainClaims?.claims],
  )

  const claimMutation = useMutation({
    mutationFn: async (claim: OnchainBantCreditClaim) => {
      if (!onchainConfig) throw new Error('Onchain config is still loading.')
      const result = await executeBantCreditRewardClaimTx({
        wallets: wallets as any,
        preferredWalletAddress: claim.account,
        onchainConfig,
        chainId: claim.chainId,
        batchId: claim.batchId,
        account: claim.account,
        amount: claim.amount,
        roleBytes32: claim.roleBytes32,
        matchIdBytes32: claim.matchIdBytes32,
        proof: claim.proof,
      })
      await apiRequest(
        'POST',
        `/api/bantahbro/onchain/bantcredits/claims/${encodeURIComponent(claim.id)}/mark-claimed`,
        { txHash: result.claimTxHash },
      )
      return result
    },
    onSuccess: () => {
      toast({
        title: 'BANTC claimed',
        description: 'Your onchain BantCredits were minted to your wallet.',
      })
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/rewards'] })
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/onchain/bantcredits/claims'] })
    },
    onError: (claimError) => {
      toast({
        title: 'Claim failed',
        description: claimError instanceof Error ? claimError.message : 'Unable to claim BANTC.',
        variant: 'destructive',
      })
    },
  })

  const copyReferral = async () => {
    if (!referralUrl) return
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-card">
      <div className="border-b border-border bg-background px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-primary" />
            <span className="font-bold text-foreground">Rewards</span>
            <span className="text-xs text-muted-foreground">BantCredits and referrals</span>
          </div>
          {!signedIn && (
            <button
              type="button"
              onClick={login}
              className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <LogIn size={13} />
              Sign in for your link
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="grid gap-2 md:grid-cols-[1.2fr_1fr]">
          <section className="rounded border border-border bg-background p-3">
            <div className="mb-3 flex items-center gap-2">
              <Gift size={16} className="text-primary" />
              <div>
                <div className="text-sm font-black text-foreground">BantCredit Summary</div>
                <div className="text-[11px] text-muted-foreground">
                  {signedIn ? 'Your earned balance and referral progress.' : 'Platform reward activity is visible before sign-in.'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
              <div>
                <div className="text-lg font-black text-foreground">
                  {formatNumber(signedIn ? data?.viewer?.points : data?.stats?.lifetimeEarned)}
                </div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {signedIn ? 'Your balance' : 'Total earned'}
                </div>
              </div>
              <div>
                <div className="text-lg font-black text-foreground">
                  {formatNumber(data?.stats?.currentUserPoints)}
                </div>
                <div className="text-[10px] uppercase text-muted-foreground">User credits</div>
              </div>
              <div>
                <div className="text-lg font-black text-foreground">
                  {formatNumber(data?.stats?.currentAgentPoints)}
                </div>
                <div className="text-[10px] uppercase text-muted-foreground">Agent credits</div>
              </div>
              <div>
                <div className="text-lg font-black text-foreground">
                  {signedIn
                    ? formatNumber(data?.viewer?.onchainClaimableBantCredits || 0)
                    : formatNumber(data?.stats?.rewardTransactionCount)}
                </div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {signedIn ? 'Claimable BANTC' : 'Reward rows'}
                </div>
              </div>
              <div>
                <div className="text-lg font-black text-foreground">
                  {formatNumber(data?.stats?.onchainMintedBantCredits || 0)}
                </div>
                <div className="text-[10px] uppercase text-muted-foreground">Minted BANTC</div>
              </div>
            </div>
          </section>

          <section className="rounded border border-border bg-background p-3">
            <div className="mb-2 flex items-center gap-2">
              <Link2 size={15} className="text-primary" />
              <div className="text-sm font-black text-foreground">Referral Link</div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {signedIn
                ? 'Copy this link and share BOTA with new challengers.'
                : 'Visitors can share BOTA now. Sign in to generate a reward-tracked referral link.'}
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-2 rounded border border-border bg-muted px-2 py-2">
              <div className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                {referralUrl || 'Loading referral link...'}
              </div>
              <button
                type="button"
                onClick={copyReferral}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded bg-primary px-2 text-xs font-black text-primary-foreground hover:bg-primary/90"
              >
                <Copy size={13} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </section>
        </div>

        {signedIn && (
          <section className="overflow-hidden rounded border border-border bg-background">
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-primary" />
                <div>
                  <div className="text-sm font-black text-foreground">Onchain BANTC Claims</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatNumber(onchainClaims?.claimableBantCredits || 0)} BANTC ready
                  </div>
                </div>
              </div>
              {wallets.length === 0 && (
                <button
                  type="button"
                  onClick={() => connectOrCreateWallet()}
                  className="inline-flex h-8 items-center rounded bg-primary px-2 text-xs font-black text-primary-foreground hover:bg-primary/90"
                >
                  Connect wallet
                </button>
              )}
            </div>

            {onchainClaims?.warning ? (
              <div className="p-4 text-xs text-destructive">{onchainClaims.warning}</div>
            ) : claimableClaims.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">No claimable onchain BANTC yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-black">Chain</th>
                      <th className="px-3 py-2 font-black">Role</th>
                      <th className="px-3 py-2 font-black">Wallet</th>
                      <th className="px-3 py-2 text-right font-black">BANTC</th>
                      <th className="px-3 py-2 text-right font-black">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {claimableClaims.map((claim) => {
                      const isClaiming = claimMutation.isPending && claimMutation.variables?.id === claim.id
                      return (
                        <tr key={claim.id} className="hover:bg-muted/30">
                          <td className="whitespace-nowrap px-3 py-2 font-bold text-foreground">
                            {claim.chainName || `Chain ${claim.chainId}`}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{claimRoleLabel(claim.role)}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{shortAddress(claim.account)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-black text-primary">
                            {formatNumber(claim.amount)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                wallets.length === 0 ? connectOrCreateWallet() : claimMutation.mutate(claim)
                              }
                              disabled={claimMutation.isPending || !onchainConfig}
                              className="inline-flex h-8 min-w-16 items-center justify-center rounded bg-primary px-2 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isClaiming ? <Loader2 size={13} className="animate-spin" /> : 'Claim'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="overflow-hidden rounded border border-border bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
            <div>
              <div className="text-sm font-black text-foreground">
                {signedIn ? 'Your Earned BantCredits' : 'Recent Platform BantCredits'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {signedIn ? 'Completed BantCredit rewards tied to your account.' : 'A public feed of recent completed BantCredit rewards.'}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading rewards...</div>
          ) : isError ? (
            <div className="p-6 text-center text-xs text-destructive">
              {error instanceof Error ? error.message : 'Rewards could not load.'}
            </div>
          ) : rewards.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-sm font-black text-foreground">No BantCredits earned yet</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Watch Arena battles, create challenges, and invite users to start earning.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-black">Date</th>
                    <th className="px-3 py-2 font-black">Source</th>
                    <th className="px-3 py-2 font-black">Details</th>
                    <th className="px-3 py-2 text-right font-black">BantCredits</th>
                    <th className="px-3 py-2 text-right font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rewards.map((reward) => (
                    <tr key={`${reward.id}-${reward.createdAt}`} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatDate(reward.createdAt)}
                      </td>
                      <td className="px-3 py-2 font-bold text-foreground">{reward.source}</td>
                      <td className="max-w-[320px] truncate px-3 py-2 text-muted-foreground">
                        {reward.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-black text-primary">
                        +{formatNumber(reward.amount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="rounded bg-primary/10 px-2 py-1 text-[10px] font-black uppercase text-primary">
                          {reward.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
