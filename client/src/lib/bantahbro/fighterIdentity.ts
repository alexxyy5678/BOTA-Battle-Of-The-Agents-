import type { BotaFighterOrigin, BotaFighterProfile } from '@shared/botaFighterProfile'
import { getBotaDerivativeFighter } from '@shared/botaDerivativeFighter'

export type FighterIdentityKind =
  | 'external-agent'
  | 'generated-fighter'
  | 'bantah-eliza'
  | 'hybrid'

export type FighterSourceKind = BotaFighterOrigin | 'meme-token' | 'meme' | string

export type FighterIdentityMeta = {
  kind: FighterIdentityKind
  label: string
  sourceLabel: string
  brainLabel: string
  story: string
  logoUrl: string
}

export type FighterSourceMeta = {
  kind: FighterSourceKind
  label: string
  iconUrl: string | null
  leaderboardOrigin: BotaFighterOrigin | 'meme'
}

const EXTERNAL_AGENT_LOGO = '/assets/bota-external-agent.svg'
const GENERATED_FIGHTER_LOGO = '/assets/bota-generated-fighter.svg'
const BANTAH_LOGO = '/assets/bota-bantah-icon.png'
const ENS_LOGO = '/assets/ens-badge.jpg'
const ELIZA_LOGO = '/assets/source-elizaos.png'
const VIRTUALS_LOGO = '/assets/source-virtuals.jpg'
const BANKR_LOGO = '/assets/source-bankr.png'
const GAME_SDK_LOGO = '/assets/source-game-sdk.svg'
const AGENTKIT_LOGO = '/assets/source-agentkit.svg'

function titleCase(value?: string | null) {
  return String(value || 'BOTA')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function metadataText(metadata: Record<string, unknown> | undefined, keys: string[]) {
  if (!metadata) return null
  for (const key of keys) {
    const value = stringValue(metadata[key])
    if (value) return value
  }
  return null
}

export function metadataTokenLogo(metadata: Record<string, unknown> | undefined) {
  const token = asRecord(metadata?.token)
  const logoUrl = stringValue(token?.logoUrl)
  return logoUrl || null
}

function isExternalAgentOrigin(origin: BotaFighterOrigin) {
  return origin === 'eliza' || origin === 'virtuals' || origin === 'bankr' || origin === 'game-sdk' || origin === 'agentkit'
}

function identityKind(value: unknown, origin: BotaFighterOrigin): FighterIdentityKind {
  if (
    value === 'external-agent' ||
    value === 'generated-fighter' ||
    value === 'bantah-eliza' ||
    value === 'hybrid'
  ) {
    return value
  }
  return isExternalAgentOrigin(origin) ? 'external-agent' : 'generated-fighter'
}

function defaultIdentityLogo(kind: FighterIdentityKind) {
  if (kind === 'bantah-eliza' || kind === 'hybrid') return BANTAH_LOGO
  return kind === 'external-agent' ? EXTERNAL_AGENT_LOGO : GENERATED_FIGHTER_LOGO
}

function defaultSourceLogo(origin: BotaFighterOrigin) {
  if (origin === 'eliza') return ELIZA_LOGO
  if (origin === 'virtuals') return VIRTUALS_LOGO
  if (origin === 'bankr') return BANKR_LOGO
  if (origin === 'game-sdk') return GAME_SDK_LOGO
  if (origin === 'agentkit') return AGENTKIT_LOGO
  if (origin === 'ens') return ENS_LOGO
  if (origin === 'bota') return BANTAH_LOGO
  return null
}

function realLogoUrl(value: string | null) {
  if (value === '/assets/source-elizaos.svg') return ELIZA_LOGO
  if (value === '/assets/source-virtuals.svg') return VIRTUALS_LOGO
  if (value === '/assets/source-bankr.svg') return BANKR_LOGO
  return value
}

function defaultSourceLabel(profile: BotaFighterProfile) {
  if (profile.origin === 'eliza') return 'ElizaOS'
  if (profile.origin === 'virtuals') return 'Virtuals Protocol'
  if (profile.origin === 'bankr') return 'Bankr'
  if (profile.origin === 'game-sdk') return 'GAME SDK'
  if (profile.origin === 'agentkit') return 'AgentKit'
  if (profile.origin === 'ens') return 'ENS'
  if (profile.origin === 'nft') return 'NFT'
  if (profile.origin === 'token' || profile.origin === 'dexscreener') return 'Meme'
  if (profile.origin === 'bota') return 'BOTA'
  return profile.badgeLabel || titleCase(profile.origin)
}

function platformSourceLabel(profile: BotaFighterProfile) {
  const sourceHint = metadataText(profile.metadata, ['sourceHint', 'importSource', 'importedFrom'])
  const rawLabel = stringValue(sourceHint) || stringValue(profile.badgeLabel) || defaultSourceLabel(profile)
  const normalized = rawLabel
    .replace(/\s*external\s+agent\s+brain/gi, '')
    .replace(/\s*external\s+agent/gi, '')
    .replace(/\s*generated\s+fighter\s*\/?\s*/gi, '')
    .replace(/\s*generated\b/gi, '')
    .replace(/\s*Eliza-ready\b/gi, '')
    .replace(/\s*brain\b/gi, '')
    .trim()

  if (profile.origin === 'eliza' || /eliza/i.test(normalized)) return 'ElizaOS'
  if (profile.origin === 'virtuals' || /virtual/i.test(normalized)) return 'Virtuals Protocol'
  if (profile.origin === 'bankr' || /bankr/i.test(normalized)) return 'Bankr'
  if (profile.origin === 'game-sdk' || /game sdk|game/i.test(normalized)) return 'GAME SDK'
  if (profile.origin === 'agentkit' || /agent\s*kit/i.test(normalized)) return 'AgentKit'
  if (profile.origin === 'ens') return 'ENS'
  if (profile.origin === 'nft') return 'NFT'
  if (profile.origin === 'token' || profile.origin === 'dexscreener') return 'Meme'
  if (profile.origin === 'bota') return 'BOTA'
  return normalized || defaultSourceLabel(profile)
}

export function getFighterIdentity(profile: BotaFighterProfile): FighterIdentityMeta {
  const identity = asRecord(profile.metadata?.agentIdentity)
  const logoBadge = asRecord(profile.metadata?.logoBadge)
  const kind = identityKind(identity?.kind, profile.origin)
  const sourceLabel = platformSourceLabel(profile)
  const label = sourceLabel
  const brainLabel = sourceLabel
  const sourceLogo = realLogoUrl(stringValue(identity?.sourceLogoUrl)) || defaultSourceLogo(profile.origin)
  const logoUrl =
    kind === 'external-agent'
      ? sourceLogo || defaultIdentityLogo(kind)
      : realLogoUrl(stringValue(identity?.logoUrl)) ||
        realLogoUrl(stringValue(identity?.identityLogoUrl)) ||
        realLogoUrl(stringValue(logoBadge?.imageUrl)) ||
        defaultIdentityLogo(kind)
  const story = sourceLabel

  return {
    kind,
    label,
    sourceLabel,
    brainLabel,
    story,
    logoUrl,
  }
}

export function getFighterSourceMeta(profile: BotaFighterProfile): FighterSourceMeta {
  const derivative = getBotaDerivativeFighter(profile.metadata)
  const sourceHint = metadataText(profile.metadata, ['sourceHint', 'importSource', 'importedFrom'])?.toLowerCase() || ''
  const tokenLogo =
    metadataText(profile.metadata, ['sourceIconUrl', 'originIconUrl', 'tokenLogoUrl']) ||
    metadataTokenLogo(profile.metadata)
  const identity = getFighterIdentity(profile)
  const isMemeToken = profile.origin === 'dexscreener' || sourceHint.includes('dex') || sourceHint.includes('meme')

  if (derivative) {
    return {
      kind: derivative.species,
      label: 'NFT',
      iconUrl: BANTAH_LOGO,
      leaderboardOrigin: 'nft',
    }
  }

  if (isMemeToken) {
    return {
      kind: 'meme-token',
      label: 'Meme',
      iconUrl: BANTAH_LOGO,
      leaderboardOrigin: 'meme',
    }
  }

  if (profile.origin === 'eliza') {
    return { kind: profile.origin, label: 'ElizaOS', iconUrl: ELIZA_LOGO, leaderboardOrigin: 'eliza' }
  }

  if (profile.origin === 'virtuals') {
    return { kind: profile.origin, label: 'Virtuals Protocol', iconUrl: VIRTUALS_LOGO, leaderboardOrigin: 'virtuals' }
  }

  if (profile.origin === 'bankr') {
    return { kind: profile.origin, label: 'Bankr', iconUrl: BANKR_LOGO, leaderboardOrigin: 'bankr' }
  }

  if (profile.origin === 'game-sdk') {
    return { kind: profile.origin, label: 'GAME SDK', iconUrl: GAME_SDK_LOGO, leaderboardOrigin: 'game-sdk' }
  }

  if (profile.origin === 'agentkit') {
    return { kind: profile.origin, label: 'AgentKit', iconUrl: AGENTKIT_LOGO, leaderboardOrigin: 'agentkit' }
  }

  if (profile.origin === 'ens') {
    return {
      kind: profile.origin,
      label: 'ENS',
      iconUrl: ENS_LOGO,
      leaderboardOrigin: 'ens',
    }
  }

  if (profile.origin === 'nft') {
    return { kind: profile.origin, label: 'NFT', iconUrl: BANTAH_LOGO, leaderboardOrigin: 'nft' }
  }

  if (profile.origin === 'token') {
    return {
      kind: 'meme-token',
      label: 'Meme',
      iconUrl: BANTAH_LOGO,
      leaderboardOrigin: 'meme',
    }
  }

  if (profile.origin === 'bota') {
    return { kind: profile.origin, label: 'BOTA', iconUrl: BANTAH_LOGO, leaderboardOrigin: 'bota' }
  }

  return {
    kind: profile.origin,
    label: profile.badgeLabel || titleCase(profile.origin),
    iconUrl: identity.logoUrl,
    leaderboardOrigin: profile.origin,
  }
}

export function fighterTitle(profile: BotaFighterProfile) {
  const derivative = getBotaDerivativeFighter(profile.metadata)
  if (derivative) return derivative.titles[1] || 'Derivative Fighter'
  return profile.titles?.[0] || profile.badgeLabel || titleCase(profile.archetype)
}
