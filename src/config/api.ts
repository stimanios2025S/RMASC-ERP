// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — API Configuration (Production Hardened)
//  Exponential backoff retry, timeouts, error normalization
// ═══════════════════════════════════════════════════════════════════════════

const API_PREFIX = '/api'
const MAX_RETRIES = 2
const BASE_DELAY = 500
const TIMEOUT_MS = 15000

export function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith(API_PREFIX)) return path
  return `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`
}

export const apiPath = resolveUrl

// ─── Retry with exponential backoff ─────────────────────────────────────
async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<T> {
  const token = localStorage.getItem('rmasc_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }

  const url = resolveUrl(path)
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.status === 401) {
        localStorage.removeItem('rmasc_token')
        throw new Error('Session expirée')
      }

      if (!res.ok) {
        const eb = await res.json().catch(() => ({ error: `Erreur ${res.status}` }))
        throw new Error(eb.error || `Erreur ${res.status}`)
      }

      return await res.json()
    } catch (err: any) {
      clearTimeout(timeout)
      lastError = err

      // Don't retry auth errors
      if (err.message === 'Session expirée') throw err

      // Don't retry 4xx errors
      if (err.message?.startsWith('Erreur 4')) throw err

      if (attempt < retries) {
        const delay = BASE_DELAY * Math.pow(2, attempt)
        await sleep(delay)
        continue
      }
    }
  }

  throw lastError || new Error('Impossible de contacter le serveur.')
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
