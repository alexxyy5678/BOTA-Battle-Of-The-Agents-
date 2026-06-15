import type { BotaFighterOrigin } from '@shared/botaFighterProfile'

export type BotaCharacterSource =
  | BotaFighterOrigin
  | 'ai-agent'
  | 'meme-token'
  | 'dexscreener'
  | 'token'
  | 'manual'
  | string

export const BOTA_CHARACTER_AVATARS = [
  '/2dgame/image/mascots/actions/bantah-punch-avatar-portrait.png',
  '/2dgame/image/mascots/actions/bantah-rival-punch-avatar-portrait.png',
  '/2dgame/image/mascots/actions/bantah-sword-avatar-portrait.png',
  '/2dgame/image/mascots/actions/bantah-avatar-emerald-portrait.png',
  '/2dgame/image/mascots/actions/bantah-avatar-purple-portrait.png',
  '/2dgame/image/mascots/actions/bantah-avatar-red-portrait.png',
  '/2dgame/image/mascots/actions/bantah-avatar-silver-portrait.png',
] as const

const SOURCE_CHARACTER_OFFSET: Record<string, number> = {
  eliza: 0,
  elizaos: 0,
  virtuals: 6,
  'virtuals-protocol': 6,
  bankr: 1,
  'bankr-bot': 1,
  'game-sdk': 6,
  gamesdk: 6,
  ens: 3,
  agentkit: 4,
  nft: 5,
  token: 5,
  dexscreener: 5,
  'meme-token': 5,
  slime: 5,
  blob: 5,
  mech: 6,
  'bantah-kittie': 3,
  bantahkittie: 3,
  'bantah-pengu': 6,
  bantahpengu: 6,
  'bantah-zuki': 2,
  bantahzuki: 2,
  'bantah-doodle': 4,
  bantahdoodle: 4,
  'bantah-bird': 6,
  bantahbird: 6,
  'bantah-ape': 0,
  bantahape: 0,
  'bantah-hypurr': 3,
  bantahhypurr: 3,
  'bantah-relic': 6,
  bantahrelic: 6,
  bota: 0,
  manual: 5,
  advanced: 5,
  'ai-agent': 0,
}

function stableIndex(seed: string, length: number) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return hash % length
}

function normalizeSource(source?: BotaCharacterSource | null) {
  return String(source || '').trim().toLowerCase().replace(/[\s_]+/g, '-')
}

export function botaCharacterAvatar(seed?: string | null, source?: BotaCharacterSource | null) {
  const normalizedSource = normalizeSource(source)
  const sourceOffset = SOURCE_CHARACTER_OFFSET[normalizedSource] || 0
  const seedIndex = stableIndex(`${normalizedSource || 'bota'}:${seed || 'agent'}`, BOTA_CHARACTER_AVATARS.length)
  return BOTA_CHARACTER_AVATARS[(sourceOffset + seedIndex) % BOTA_CHARACTER_AVATARS.length]
}

export function isNonFighterCoverArtUrl(value?: string | null) {
  const url = String(value || '').trim().toLowerCase()
  if (!url) return true
  if (url.includes('/arena-agents/')) return true
  if (!url.startsWith('/assets/')) return false
  return (
    url.includes('/source-') ||
    url.includes('/ens-badge') ||
    url.includes('/bota-bantah-icon') ||
    url.includes('/bota-external-agent') ||
    url.includes('/bota-generated-fighter') ||
    url.includes('/base-icon-') ||
    url.endsWith('.svg')
  )
}

export function botaFighterProfileArt({
  avatarUrl,
  seed,
  source,
}: {
  avatarUrl?: string | null
  seed?: string | null
  source?: BotaCharacterSource | null
}) {
  const isImportedAgent = Boolean(seed && String(seed).includes(':'))

  if (isImportedAgent) {
    let resolvedSource = source
    if (!resolvedSource && seed) {
      const parts = String(seed).split(':')
      if (parts.length > 1) {
        resolvedSource = parts[1] as BotaCharacterSource
      }
    }
    return botaCharacterAvatar(seed, resolvedSource)
  }

  return isNonFighterCoverArtUrl(avatarUrl)
    ? botaCharacterAvatar(seed, source)
    : String(avatarUrl).trim()
}

export function botaCharacterAlt(name?: string | null) {
  return `${String(name || 'BOTA Agent').trim() || 'BOTA Agent'} fighter avatar`
}
