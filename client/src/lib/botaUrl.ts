const BOTA_ROOT_HOSTS = new Set(['bota.bantah.fun', 'battle.bantah.fun'])
const DEFAULT_BOTA_BASE_URL = 'https://bota.bantah.fun'

function normalizePath(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized || '/'
}

export function isBotaRootHost(hostname?: string | null) {
  return BOTA_ROOT_HOSTS.has(String(hostname || '').trim().toLowerCase())
}

export function getCurrentBaseUrl(fallback = DEFAULT_BOTA_BASE_URL) {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`
  }
  return fallback
}

export function normalizeBotaPathForBase(baseUrl: string, path = '/') {
  const normalized = normalizePath(path)
  try {
    if (isBotaRootHost(new URL(baseUrl).hostname)) {
      return normalized.replace(/^\/bota(?=\/|\?|$)/i, '') || '/'
    }
  } catch {
    // Keep the path unchanged if the base URL is not parseable.
  }
  return normalized
}

export function buildBotaPublicUrl(path = '/') {
  const baseUrl = getCurrentBaseUrl(DEFAULT_BOTA_BASE_URL).replace(/\/+$/, '')
  return `${baseUrl}${normalizeBotaPathForBase(baseUrl, path)}`
}

export function botaAppHref(path = '/bota') {
  const normalized = normalizePath(path)
  if (typeof window !== 'undefined' && isBotaRootHost(window.location.hostname)) {
    return normalized.replace(/^\/bota(?=\/|\?|$)/i, '') || '/'
  }
  return normalized
}
