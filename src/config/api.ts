// ─── RMASC FACTORY — Production API Config ──────────────────────────────
// Connects exclusively to the Neon PostgreSQL backend.
// NO localStorage fallback. NO offline mode. Production only.

let activePort = 4000
let baseUrl = ''

export function getApiUrl(): string {
  if (baseUrl) return baseUrl
  // Production: same origin (Vercel serves both frontend and API via /api)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
    const envUrl = (import.meta as any).env.VITE_API_URL
    if (envUrl === 'same-origin' || !envUrl) {
      baseUrl = '/api'
      return '/api'
    }
    baseUrl = envUrl
    return baseUrl
  }
  // Check if running on Vercel (no host header means same-origin)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    baseUrl = '/api'
    return '/api'
  }
  return `http://localhost:${activePort}/api`
}

export function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const api = getApiUrl()
  // If path already starts with the API prefix, don't double it
  if (api && path.startsWith(api)) return path
  if (!api) return path.startsWith('/') ? path : `/${path}`
  return `${api}${path.startsWith('/') ? path : `/${path}`}`
}
export const apiPath = resolveUrl

export async function apiFetch<T = any>(path: string, options: RequestInit = {}, retries = 2): Promise<T> {
  const token = localStorage.getItem('rmasc_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }

  const url = resolveUrl(path)

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (res.status === 401 && attempt < retries) {
        // Token expired — try to refresh
        continue
      }

      if (!res.ok) {
        const eb = await res.json().catch(() => ({ error: `Erreur ${res.status}` }))
        throw new Error(eb.error || `Erreur ${res.status}`)
      }
      return await res.json()
    } catch (err: any) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        throw new Error('La requête a expiré. Vérifiez votre connexion au serveur.')
      }
      if (attempt >= retries) throw err
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  throw new Error('Impossible de contacter le serveur. Vérifiez que le backend est démarré.')
}

// ─── Simple API wrapper ─────────────────────────────────────────────────
export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
