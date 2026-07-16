// ─── RMASC FACTORY — API Configuration (Production) ────────────────────
// All API calls use relative paths (/api/...) — the Cloudflare Tunnel
// routes requests seamlessly whether users are inside or outside the factory.
// CORS is locked to: https://sarl-rmasc.com + localhost dev ports.

const API_PREFIX = '/api'

export function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith(API_PREFIX)) return path
  return `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`
}

export const apiPath = resolveUrl

export async function apiFetch<T = any>(path: string, options: RequestInit = {}, retries = 1): Promise<T> {
  const token = localStorage.getItem('rmasc_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }

  const url = resolveUrl(path)

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })
      clearTimeout(timeout)

      // ── 401 → Token expired or invalid → Redirect to login ──
      if (res.status === 401) {
        localStorage.removeItem('rmasc_token')
        localStorage.removeItem('rmasc_portal_session')
        // Redirect to login (only on 401, not retryable)
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
        throw new Error('Session expirée. Veuillez vous reconnecter.')
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
      if (err.message?.includes('Session expirée')) throw err
      if (attempt >= retries) throw err
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  throw new Error('Impossible de contacter le serveur. Vérifiez que le backend est démarré.')
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
