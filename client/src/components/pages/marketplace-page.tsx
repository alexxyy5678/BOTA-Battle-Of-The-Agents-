'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  BadgeDollarSign,
  Crown,
  Search,
  Sparkles,
  Store,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { botaCharacterAlt, botaFighterProfileArt } from '@/lib/botaCharacterLayer'
import { getFighterSourceMeta } from '@/lib/bantahbro/fighterIdentity'
import { useAuth } from '@/hooks/useAuth'
import type { AppSection } from '@/app/page'
import type { BotaFighterProfile } from '@shared/botaFighterProfile'

type FighterProfilesFeed = {
  profiles: BotaFighterProfile[]
  updatedAt: string
}

type MarketFilter = 'all' | 'tradable' | 'ens' | 'virtuals' | 'eliza' | 'nft'

type SaleEvent = {
  id: string
  fighterName: string
  price: number
  currency: string
  when: string | null
}

type MarketplaceAgent = {
  id: string
  name: string
  source: string
  sourceKey: MarketFilter | 'bankr' | 'agentkit' | 'game-sdk' | 'bota' | 'meme'
  sourceIconUrl: string | null
  avatarUrl: string
  rank: number | null
  wins: number
  losses: number
  battles: number
  winRate: number
  predictionAccuracy: number | null
  bantCredits: number
  score: number
  streak: number
  ownerAddress: string | null
  isExternalApiAgent: boolean
  isUserOwned: boolean
  canList: boolean
  canTrade: boolean
  valueScore: number
  valueTier: string
  listing: {
    active: boolean
    status: string
    price: number | null
    currency: string
    priceLabel: string | null
    seller: string | null
    checkoutUrl: string | null
  }
  sales: SaleEvent[]
}

const FILTERS: Array<{ value: MarketFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'tradable', label: 'Tradable' },
  { value: 'ens', label: 'ENS' },
  { value: 'virtuals', label: 'Virtuals' },
  { value: 'eliza', label: 'Eliza' },
  { value: 'nft', label: 'NFT Fighters' },
]

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function textValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeAddress(value?: string | null) {
  const trimmed = String(value || '').trim()
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : ''
}

function viewerWallets(user: unknown) {
  const candidate = user as any
  const wallets = [
    candidate?.wallet?.address,
    candidate?.walletAddress,
    candidate?.primaryWalletAddress,
    ...(Array.isArray(candidate?.walletAddresses) ? candidate.walletAddresses : []),
    ...(Array.isArray(candidate?.linkedAccounts)
      ? candidate.linkedAccounts.map((account: any) => account?.address)
      : []),
  ]
    .map((wallet) => normalizeAddress(wallet))
    .filter(Boolean)

  return Array.from(new Set(wallets))
}

function formatCompact(value: number) {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0)
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M`
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(1)}K`
  return Math.round(safe).toLocaleString()
}

function formatMoney(value: number, currency = 'USDC') {
  return `${formatCompact(value)} ${currency}`
}

function shortAddress(value?: string | null) {
  const normalized = normalizeAddress(value)
  if (!normalized) return 'Wallet owner'
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`
}

function profileName(profile: BotaFighterProfile) {
  return profile.origin === 'ens' && profile.ensName ? profile.ensName : profile.displayName
}

function sourceKeyForProfile(profile: BotaFighterProfile): MarketplaceAgent['sourceKey'] {
  const source = getFighterSourceMeta(profile)
  if (source.leaderboardOrigin === 'virtuals') return 'virtuals'
  if (source.leaderboardOrigin === 'eliza') return 'eliza'
  if (source.leaderboardOrigin === 'bankr') return 'bankr'
  if (source.leaderboardOrigin === 'agentkit') return 'agentkit'
  if (source.leaderboardOrigin === 'game-sdk') return 'game-sdk'
  if (source.leaderboardOrigin === 'ens') return 'ens'
  if (source.leaderboardOrigin === 'nft') return 'nft'
  if (source.leaderboardOrigin === 'meme') return 'meme'
  return 'bota'
}

function listingForProfile(profile: BotaFighterProfile): MarketplaceAgent['listing'] {
  const listing =
    asRecord(profile.metadata?.marketplaceListing) ||
    asRecord(profile.metadata?.listing) ||
    asRecord(profile.metadata?.sale)
  const status = (
    textValue(listing?.status) ||
    textValue(profile.metadata?.marketplaceStatus) ||
    textValue(profile.metadata?.listingStatus) ||
    'not_listed'
  ).toLowerCase()
  const active = ['listed', 'active', 'for_sale', 'open'].includes(status)
  const price =
    numberValue(listing?.price) ??
    numberValue(listing?.amount) ??
    numberValue(profile.metadata?.salePrice) ??
    numberValue(profile.metadata?.listingPrice)
  const currency =
    textValue(listing?.currency) ||
    textValue(profile.metadata?.saleCurrency) ||
    textValue(profile.metadata?.listingCurrency) ||
    'USDC'
  const checkoutUrl =
    textValue(listing?.checkoutUrl) ||
    textValue(listing?.listingUrl) ||
    textValue(profile.metadata?.marketplaceUrl) ||
    null

  return {
    active,
    status: active ? 'Listed' : 'Not listed',
    price,
    currency,
    priceLabel: price !== null ? formatMoney(price, currency) : null,
    seller: textValue(listing?.seller) || textValue(profile.walletAddress),
    checkoutUrl,
  }
}

function saleEventsForProfile(profile: BotaFighterProfile, listing: MarketplaceAgent['listing']) {
  const history = Array.isArray(profile.metadata?.saleHistory)
    ? profile.metadata.saleHistory
    : Array.isArray(profile.metadata?.priceHistory)
      ? profile.metadata.priceHistory
      : []
  const events: SaleEvent[] = []

  history.forEach((entry, index) => {
    const record = asRecord(entry)
    if (!record) return
    const price = numberValue(record.price) ?? numberValue(record.amount)
    if (price === null) return
    events.push({
      id: `${profile.agentId}:sale:${index}`,
      fighterName: profileName(profile),
      price,
      currency: textValue(record.currency) || listing.currency,
      when: textValue(record.soldAt) || textValue(record.createdAt) || textValue(record.date),
    })
  })

  const lastSale = numberValue(profile.metadata?.lastSalePrice)
  if (lastSale !== null) {
    events.push({
      id: `${profile.agentId}:last-sale`,
      fighterName: profileName(profile),
      price: lastSale,
      currency: textValue(profile.metadata?.lastSaleCurrency) || listing.currency,
      when: textValue(profile.metadata?.lastSaleAt),
    })
  }

  return events
}

function ownerAddressForProfile(profile: BotaFighterProfile) {
  return (
    normalizeAddress(profile.walletAddress) ||
    normalizeAddress(textValue(profile.metadata?.ownerWallet)) ||
    normalizeAddress(textValue(profile.metadata?.importedByWallet)) ||
    null
  )
}

function isExternalApiProfile(profile: BotaFighterProfile) {
  return ['virtuals', 'eliza', 'bankr', 'agentkit', 'game-sdk'].includes(profile.origin)
}

function isBantahMarketAsset(profile: BotaFighterProfile, listingActive: boolean) {
  if (isExternalApiProfile(profile)) return false
  return Boolean(
    listingActive ||
      profile.importedAt ||
      profile.origin === 'bota' ||
      profile.origin === 'ens' ||
      profile.origin === 'nft' ||
      profile.origin === 'manual' ||
      profile.metadata?.importedFrom ||
      profile.metadata?.ownerWallet ||
      profile.metadata?.importedByWallet,
  )
}

function valueTier(valueScore: number) {
  if (valueScore >= 90) return 'Legendary'
  if (valueScore >= 74) return 'Elite'
  if (valueScore >= 58) return 'Gold'
  if (valueScore >= 42) return 'Rising'
  return 'Prospect'
}

function valueScoreFor(profile: BotaFighterProfile, winRate: number, listingActive: boolean) {
  const titles = Array.isArray(profile.titles) ? profile.titles.length : 0
  const streak = Math.max(0, Number(profile.currentStreak || 0))
  const bantCredits = Math.min(18, Math.log10(Math.max(1, Number(profile.bantCreditsEarned || 0))) * 4)
  const score = Math.min(32, Number(profile.fameScore || 0) / 3)
  const wins = Math.min(20, Number(profile.wins || 0) / 4)
  const rate = Math.min(18, winRate / 6)
  const titleBonus = Math.min(8, titles * 2)
  const streakBonus = Math.min(6, streak * 1.5)
  const listedBonus = listingActive ? 3 : 0
  return Math.max(1, Math.min(100, Math.round(score + wins + rate + bantCredits + titleBonus + streakBonus + listedBonus)))
}

function profileToMarketplaceAgent(profile: BotaFighterProfile, viewerWalletSet: Set<string>, viewerId?: string | null): MarketplaceAgent {
  const source = getFighterSourceMeta(profile)
  const listing = listingForProfile(profile)
  const ownerAddress = ownerAddressForProfile(profile)
  const ownerUserId = textValue(profile.metadata?.ownerUserId)
  const isUserOwned = Boolean(
    (ownerAddress && viewerWalletSet.has(ownerAddress)) ||
      (viewerId && ownerUserId && ownerUserId === viewerId),
  )
  const battles = Math.max(0, Number(profile.wins || 0) + Number(profile.losses || 0))
  const winRate = battles > 0 ? Math.round((Number(profile.wins || 0) / battles) * 100) : 0
  const predictionAccuracy =
    numberValue(profile.metadata?.predictionAccuracy) ??
    numberValue(profile.metadata?.accuracy) ??
    numberValue(profile.metadata?.predictionWinRate)
  const valueScore = valueScoreFor(profile, winRate, listing.active)
  const isExternalApiAgent = isExternalApiProfile(profile)
  const canTrade = isBantahMarketAsset(profile, listing.active)
  const canList = canTrade && isUserOwned

  return {
    id: profile.agentId,
    name: profileName(profile),
    source: source.label,
    sourceKey: sourceKeyForProfile(profile),
    sourceIconUrl: source.iconUrl,
    avatarUrl: botaFighterProfileArt({
      avatarUrl: profile.avatarUrl,
      seed: profile.agentId,
      source: source.kind,
    }),
    rank: profile.rank,
    wins: profile.wins,
    losses: profile.losses,
    battles,
    winRate,
    predictionAccuracy,
    bantCredits: Math.max(0, Math.round(Number(profile.bantCreditsEarned || profile.metadata?.bantCreditsEarned || 0))),
    score: Math.max(0, Math.round(Number(profile.fameScore || 0))),
    streak: Math.max(0, Math.round(Number(profile.currentStreak || 0))),
    ownerAddress,
    isExternalApiAgent,
    isUserOwned,
    canList,
    canTrade,
    valueScore,
    valueTier: valueTier(valueScore),
    listing,
    sales: saleEventsForProfile(profile, listing),
  }
}

function ActionButtons({ agent, onNavigate }: { agent: MarketplaceAgent; onNavigate?: (section: AppSection) => void }) {
  if (agent.isExternalApiAgent) {
    return (
      <button
        type="button"
        onClick={() => onNavigate?.('battles')}
        className="h-9 rounded bg-primary px-3 text-xs font-black text-primary-foreground"
      >
        Challenge
      </button>
    )
  }

  if (agent.listing.active && agent.listing.checkoutUrl && !agent.isUserOwned) {
    return (
      <a
        href={agent.listing.checkoutUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-9 items-center rounded bg-primary px-3 text-xs font-black text-primary-foreground"
      >
        Buy Fighter
      </a>
    )
  }

  if (agent.canList) {
    return (
      <button
        type="button"
        onClick={() => onNavigate?.('profile')}
        className="h-9 rounded bg-primary px-3 text-xs font-black text-primary-foreground"
      >
        {agent.listing.active ? 'Manage' : 'List Fighter'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate?.('battles')}
      className="h-9 rounded bg-primary/12 px-3 text-xs font-black text-primary"
    >
      Challenge
    </button>
  )
}

function FighterCard({
  agent,
  onNavigate,
  onSelect,
}: {
  agent: MarketplaceAgent
  onNavigate?: (section: AppSection) => void
  onSelect: (agent: MarketplaceAgent) => void
}) {
  return (
    <article className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="relative h-32 overflow-hidden bg-background">
        <img
          src={agent.avatarUrl}
          alt={botaCharacterAlt(agent.name)}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] font-black uppercase text-white">
          {agent.valueTier}
        </div>
        {agent.sourceIconUrl ? (
          <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-background shadow">
            <img src={agent.sourceIconUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black">{agent.name}</h2>
            <p className="truncate text-[11px] font-bold text-muted-foreground">
              {agent.source} {agent.rank ? `#${agent.rank}` : ''}
            </p>
          </div>
          <div className="rounded bg-primary/12 px-1.5 py-1 text-[10px] font-black text-primary">
            {agent.valueScore}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 text-center">
          <div className="rounded bg-background/70 px-1 py-1">
            <div className="text-xs font-black">{agent.wins}W</div>
            <div className="text-[9px] font-bold uppercase text-muted-foreground">{agent.losses}L</div>
          </div>
          <div className="rounded bg-background/70 px-1 py-1">
            <div className="text-xs font-black">{agent.winRate}%</div>
            <div className="text-[9px] font-bold uppercase text-muted-foreground">Win rate</div>
          </div>
          <div className="rounded bg-background/70 px-1 py-1">
            <div className="text-xs font-black">{formatCompact(agent.bantCredits)}</div>
            <div className="text-[9px] font-bold uppercase text-muted-foreground">BC</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase text-muted-foreground">
              {agent.isExternalApiAgent ? 'Arena opponent' : agent.listing.status}
            </div>
            <div className="truncate text-sm font-black">
              {agent.listing.priceLabel || (agent.canTrade ? 'Not listed' : 'Challenge only')}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onSelect(agent)}
              className="h-9 rounded bg-background px-2.5 text-xs font-black text-foreground"
            >
              Details
            </button>
            <ActionButtons agent={agent} onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    </article>
  )
}

function FighterDetailOverlay({
  agent,
  onClose,
  onNavigate,
}: {
  agent: MarketplaceAgent
  onClose: () => void
  onNavigate?: (section: AppSection) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/68 p-2 backdrop-blur-sm md:items-center md:justify-center">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-lg bg-card shadow-2xl">
        <div className="grid max-h-[92vh] overflow-y-auto md:grid-cols-[1fr_1fr]">
          <div className="relative min-h-[320px] overflow-hidden bg-background">
            <img
              src={agent.avatarUrl}
              alt={botaCharacterAlt(agent.name)}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/18 to-transparent" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white"
              aria-label="Close fighter details"
            >
              <X size={17} />
            </button>
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <div className="inline-flex rounded bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase text-black">
                {agent.valueTier}
              </div>
              <h2 className="mt-2 truncate text-3xl font-black uppercase leading-none">{agent.name}</h2>
              <p className="mt-1 text-sm font-bold text-white/72">{agent.source}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-background/70 p-3">
                <div className="text-[10px] font-black uppercase text-muted-foreground">Current Owner</div>
                <div className="mt-1 truncate text-sm font-black">{shortAddress(agent.ownerAddress)}</div>
              </div>
              <div className="rounded bg-background/70 p-3">
                <div className="text-[10px] font-black uppercase text-muted-foreground">Community</div>
                <div className="mt-1 truncate text-sm font-black">{agent.source}</div>
              </div>
            </div>

            <div className="rounded-lg bg-background/70 p-3">
              <div className="mb-2 text-[10px] font-black uppercase text-muted-foreground">Career</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-black">{agent.wins}</div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Wins</div>
                </div>
                <div>
                  <div className="text-lg font-black">{agent.losses}</div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Losses</div>
                </div>
                <div>
                  <div className="text-lg font-black">{agent.predictionAccuracy === null ? 'N/A' : `${Math.round(agent.predictionAccuracy)}%`}</div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Accuracy</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-primary/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black uppercase text-primary">Fighter Value Score</div>
                  <div className="mt-1 text-xl font-black">{agent.valueTier}</div>
                </div>
                <div className="text-4xl font-black text-primary">{agent.valueScore}</div>
              </div>
            </div>

            <div className="rounded-lg bg-background/70 p-3">
              <div className="mb-2 text-[10px] font-black uppercase text-muted-foreground">Price History</div>
              <div className="flex flex-col gap-2">
                {agent.sales.slice(0, 4).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between rounded bg-card px-2 py-1.5 text-xs font-bold">
                    <span>{sale.when ? 'Sold' : 'Recorded sale'}</span>
                    <span className="font-black">{formatMoney(sale.price, sale.currency)}</span>
                  </div>
                ))}
                {agent.listing.active ? (
                  <div className="flex items-center justify-between rounded bg-card px-2 py-1.5 text-xs font-bold">
                    <span>Listed</span>
                    <span className="font-black">{agent.listing.priceLabel || 'No price'}</span>
                  </div>
                ) : null}
                {!agent.sales.length && !agent.listing.active ? (
                  <div className="rounded bg-card p-2 text-xs font-bold text-muted-foreground">
                    No recorded price history yet.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => onNavigate?.('battles')}
                className="h-9 rounded bg-background px-3 text-xs font-black text-foreground"
              >
                Challenge Fighter
              </button>
              <ActionButtons agent={agent} onNavigate={onNavigate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MarketplacePage({ onNavigate }: { onNavigate?: (section: AppSection) => void }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<MarketFilter>('all')
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null)
  const { data, isLoading, isError, error } = useQuery<FighterProfilesFeed>({
    queryKey: ['/api/bantahbro/fighter-profiles', { limit: '160', refreshLive: 'true' }],
    staleTime: 20_000,
    refetchInterval: 45_000,
  })

  const wallets = useMemo(() => viewerWallets(user), [user])
  const walletSet = useMemo(() => new Set(wallets), [wallets])
  const viewerId = typeof (user as any)?.id === 'string' ? (user as any).id : null
  const agents = useMemo(
    () => (data?.profiles || []).map((profile) => profileToMarketplaceAgent(profile, walletSet, viewerId)),
    [data?.profiles, walletSet, viewerId],
  )
  const visibleAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return agents
      .filter((agent) => {
        if (filter === 'tradable' && !agent.canTrade) return false
        if (filter === 'ens' && agent.sourceKey !== 'ens') return false
        if (filter === 'virtuals' && agent.sourceKey !== 'virtuals') return false
        if (filter === 'eliza' && agent.sourceKey !== 'eliza') return false
        if (filter === 'nft' && agent.sourceKey !== 'nft') return false
        if (!normalizedQuery) return true
        return `${agent.name} ${agent.source}`.toLowerCase().includes(normalizedQuery)
      })
      .sort((left, right) => {
        if (left.listing.active !== right.listing.active) return left.listing.active ? -1 : 1
        return right.valueScore - left.valueScore
      })
  }, [agents, filter, query])

  const tradableAgents = agents.filter((agent) => agent.canTrade)
  const listedAgents = tradableAgents.filter((agent) => agent.listing.active)
  const listedValue = listedAgents.reduce((total, agent) => total + (agent.listing.price || 0), 0)
  const featured = [...tradableAgents, ...agents]
    .sort((left, right) => right.valueScore - left.valueScore || right.winRate - left.winRate)[0] || null
  const trending = [...agents].sort((left, right) => right.valueScore - left.valueScore).slice(0, 8)

  return (
    <main className="flex-1 overflow-y-auto bg-background p-2 pb-24 text-foreground md:p-3 md:pb-3">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <section className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="relative min-h-[98px] overflow-hidden bg-[#170d31] px-3 py-3 text-white md:min-h-[190px] md:px-5 md:py-4">
            <img
              src="/assets/bota-app-thumbnail.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#170d31]/95 via-[#170d31]/62 to-black/14" />
            <div className="relative z-10 flex h-full flex-col gap-2 md:gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex h-6 items-center gap-1.5 rounded bg-primary px-2 text-[9px] font-black uppercase text-primary-foreground md:h-7 md:gap-2 md:px-2.5 md:text-[10px]">
                  <Store size={12} />
                  Marketplace
                </div>
                <h1 className="mt-2 text-lg font-black uppercase leading-none md:mt-3 md:text-4xl">
                  Season 1 Transfer Window
                </h1>
                <p className="mt-1 text-[11px] font-bold text-white/72 md:hidden">
                  {formatCompact(listedAgents.length)} listed · {formatMoney(listedValue)}
                </p>
                <p className="mt-2 hidden max-w-2xl text-sm font-semibold text-white/78 md:block">
                  Trade BOTA-owned fighter records. External API agents stay challenge-only.
                </p>
              </div>
              <div className="hidden grid-cols-3 gap-2 text-center md:grid">
                <div className="rounded bg-white/12 px-3 py-2 backdrop-blur">
                  <div className="text-lg font-black">Live</div>
                  <div className="text-[10px] font-bold uppercase text-white/65">Window</div>
                </div>
                <div className="rounded bg-white/12 px-3 py-2 backdrop-blur">
                  <div className="text-lg font-black">{formatMoney(listedValue)}</div>
                  <div className="text-[10px] font-bold uppercase text-white/65">Listed Value</div>
                </div>
                <div className="rounded bg-white/12 px-3 py-2 backdrop-blur">
                  <div className="text-lg font-black">{formatCompact(listedAgents.length)}</div>
                  <div className="text-[10px] font-bold uppercase text-white/65">Listed</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex min-h-10 items-center gap-2 rounded-lg bg-card px-3">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Fighters, ENS, Virtuals, Communities..."
              className="h-10 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`h-9 shrink-0 rounded-md px-3 text-xs font-black uppercase transition ${
                  filter === item.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {featured ? (
          <section className="grid overflow-hidden rounded-lg bg-card shadow-sm lg:grid-cols-[1.15fr_.85fr]">
            <div className="relative min-h-[128px] overflow-hidden bg-[#140b24] md:min-h-[260px]">
              <img
                src={featured.avatarUrl}
                alt={botaCharacterAlt(featured.name)}
                className="absolute inset-0 h-full w-full object-cover opacity-90"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/24 to-transparent" />
              <div className="absolute left-2 top-2 inline-flex h-6 items-center gap-1 rounded bg-yellow-400 px-2 text-[8px] font-black uppercase text-black shadow md:left-4 md:top-4 md:h-8 md:gap-2 md:px-3 md:text-[10px]">
                <Crown size={11} />
                Champion
              </div>
              {featured.sourceIconUrl ? (
                <img
                  src={featured.sourceIconUrl}
                  alt=""
                  className="absolute right-2 top-2 h-7 w-7 rounded-full bg-background object-cover shadow md:right-4 md:top-4 md:h-10 md:w-10"
                  loading="lazy"
                />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 p-2 text-white md:p-4">
                <h2 className="truncate text-base font-black uppercase leading-none md:text-3xl">{featured.name}</h2>
                <p className="mt-0.5 text-[10px] font-bold text-white/72 md:mt-1 md:text-sm">
                  {featured.source} {featured.rank ? `#${featured.rank}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-2 p-2 md:gap-4 md:p-4">
              <div className="grid grid-cols-4 gap-1.5 md:grid-cols-2 md:gap-2">
                <div className="rounded bg-background/70 p-2 text-center md:p-3 md:text-left">
                  <div className="text-[8px] font-black uppercase text-muted-foreground md:text-[10px]">Win Rate</div>
                  <div className="mt-0.5 text-sm font-black md:mt-1 md:text-xl">{featured.winRate}%</div>
                </div>
                <div className="rounded bg-background/70 p-2 text-center md:p-3 md:text-left">
                  <div className="text-[8px] font-black uppercase text-muted-foreground md:text-[10px]">Record</div>
                  <div className="mt-0.5 text-sm font-black md:mt-1 md:text-xl">{featured.wins}W-{featured.losses}L</div>
                </div>
                <div className="rounded bg-background/70 p-2 text-center md:p-3 md:text-left">
                  <div className="text-[8px] font-black uppercase text-muted-foreground md:text-[10px]">Prediction</div>
                  <div className="mt-0.5 text-sm font-black md:mt-1 md:text-xl">
                    {featured.predictionAccuracy === null ? 'N/A' : `${Math.round(featured.predictionAccuracy)}%`}
                  </div>
                </div>
                <div className="rounded bg-background/70 p-2 text-center md:p-3 md:text-left">
                  <div className="text-[8px] font-black uppercase text-muted-foreground md:text-[10px]">Value</div>
                  <div className="mt-0.5 text-sm font-black md:mt-1 md:text-xl">{featured.valueScore}</div>
                </div>
              </div>
              <div className="rounded-lg bg-primary/10 p-2 md:p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary md:gap-2 md:text-[10px]">
                  <Sparkles size={12} />
                  Value Score
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 md:mt-2">
                  <div>
                    <div className="text-base font-black md:text-2xl">{featured.valueTier}</div>
                    <div className="hidden text-xs font-bold text-muted-foreground md:block">
                      Wins, reputation, streaks, titles, and BantCredit.
                    </div>
                  </div>
                  <div className="text-xl font-black text-primary md:text-3xl">{featured.valueScore}</div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black uppercase text-muted-foreground">
                    {featured.isExternalApiAgent ? 'Challenge only' : 'Current Price'}
                  </div>
                  <div className="text-base font-black md:text-2xl">
                    {featured.listing.priceLabel || (featured.canTrade ? 'Not listed' : 'Not tradable')}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5 md:gap-2">
                  <ActionButtons agent={featured} onNavigate={onNavigate} />
                  <button
                    type="button"
                    onClick={() => onNavigate?.('battles')}
                    className="h-9 rounded bg-background px-2 text-[11px] font-black text-foreground md:px-3 md:text-xs"
                  >
                    Challenge
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-lg bg-card p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-black uppercase">
              <Activity size={16} className="text-primary" />
              Trending Fighters
            </div>
            <div className="text-[10px] font-black uppercase text-muted-foreground">
              {formatCompact(trending.length)} live cards
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trending.map((agent) => (
              <div key={agent.id} className="w-48 shrink-0 overflow-hidden rounded-lg bg-background">
                <div className="relative h-28">
                  <img src={agent.avatarUrl} alt={botaCharacterAlt(agent.name)} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
                  {agent.sourceIconUrl ? (
                    <img src={agent.sourceIconUrl} alt="" className="absolute right-2 top-2 h-7 w-7 rounded-full bg-background object-cover" />
                  ) : null}
                </div>
                <div className="p-2">
                  <div className="truncate text-xs font-black">{agent.name}</div>
                  <div className="truncate text-[10px] font-bold text-muted-foreground">
                    Owner {shortAddress(agent.ownerAddress)}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-black text-primary">{agent.listing.priceLabel || 'Challenge'}</div>
                      <div className="text-[10px] font-bold text-muted-foreground">{agent.winRate}% WR</div>
                    </div>
                    <ActionButtons agent={agent} onNavigate={onNavigate} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {visibleAgents.map((agent) => (
              <FighterCard
                key={agent.id}
                agent={agent}
                onNavigate={onNavigate}
                onSelect={setSelectedAgent}
              />
            ))}
          </div>
        </section>

        {isError ? (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm font-bold text-destructive">
            {error instanceof Error ? error.message : 'Marketplace data could not be loaded.'}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-lg bg-card p-4 text-sm font-bold text-muted-foreground">
            Loading marketplace fighters...
          </div>
        ) : !visibleAgents.length ? (
          <div className="rounded-lg bg-card p-4 text-sm font-bold text-muted-foreground">
            No matching fighters in the live profile feed.
          </div>
        ) : null}

        <section className="grid gap-2 md:grid-cols-4">
          <div className="rounded-lg bg-card p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
              <Users size={14} className="text-primary" />
              Fighters
            </div>
            <div className="mt-2 text-xl font-black">{formatCompact(agents.length)}</div>
          </div>
          <div className="rounded-lg bg-card p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
              <BadgeDollarSign size={14} className="text-primary" />
              Tradable
            </div>
            <div className="mt-2 text-xl font-black">{formatCompact(tradableAgents.length)}</div>
          </div>
          <div className="rounded-lg bg-card p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
              <Swords size={14} className="text-primary" />
              Opponents
            </div>
            <div className="mt-2 text-xl font-black">{formatCompact(agents.filter((agent) => agent.isExternalApiAgent).length)}</div>
          </div>
          <div className="rounded-lg bg-card p-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
              <Trophy size={14} className="text-primary" />
              Listed Value
            </div>
            <div className="mt-2 text-xl font-black">{formatMoney(listedValue)}</div>
          </div>
        </section>
      </div>
      {selectedAgent ? (
        <FighterDetailOverlay
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onNavigate={onNavigate}
        />
      ) : null}
    </main>
  )
}
