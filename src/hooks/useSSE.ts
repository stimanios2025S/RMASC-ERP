// ─── RMASC FACTORY — SSE Real-time Hook ─────────────────────────────────
// Se connecte au flux SSE du backend et notifie les composants React
// des changements en temps réel (commandes, stock, pièces solo, etc.)
//
// SECURITY: the full JWT is never put in the SSE URL. We fetch a short-lived
// (15 min) dedicated SSE token from /api/realtime/token and refresh it
// every 10 minutes, reconnecting with the fresh token.

import { useEffect, useRef, useCallback } from 'react'
import { resolveUrl, apiFetch } from '../config/api'

interface SSEEvent {
  type: string
  data: any
}

export type { SSEEvent }

type EventHandler = (event: SSEEvent) => void

// ─── Fetch a short-lived SSE token ──────────────────────────────────────
async function getSSEToken(): Promise<string | null> {
  try {
    const res = await apiFetch<{ token: string }>('/realtime/token', { method: 'POST' })
    return res.token || null
  } catch {
    return null
  }
}

// ─── Hook principal ──────────────────────────────────────────────────────
export function useSSE(onEvent?: EventHandler) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    let es: EventSource | null = null
    let cancelled = false
    let refreshTimer: ReturnType<typeof setTimeout> | null = null

    const attachListeners = (source: EventSource) => {
      source.addEventListener('connected', () => {
        console.log('[SSE] Connecté au flux temps réel')
      })

      const types = ['order:created', 'order:status', 'stock:movement', 'order:approval', 'order:file', 'order:deleted', 'force:sync', 'production:phase', 'part:created', 'part:status']
      for (const t of types) {
        source.addEventListener(t, (e: MessageEvent) => {
          try { onEventRef.current?.({ type: t, data: JSON.parse(e.data) }) } catch {}
        })
      }

      source.onerror = () => {
        // EventSource se reconnecte nativement
        console.warn('[SSE] Reconnexion...')
      }
    }

    const connect = (token: string) => {
      if (cancelled) return
      if (es) es.close()
      const url = resolveUrl('/realtime/subscribe') + `?token=${encodeURIComponent(token)}`
      es = new EventSource(url)
      eventSourceRef.current = es
      attachListeners(es)

      // Refresh the short token every 10 min and reconnect with it
      refreshTimer = setTimeout(async () => {
        const fresh = await getSSEToken()
        if (fresh && !cancelled) connect(fresh)
      }, 10 * 60 * 1000)
    }

    ;(async () => {
      const token = await getSSEToken()
      if (token && !cancelled) connect(token)
    })()

    return () => {
      cancelled = true
      if (refreshTimer) clearTimeout(refreshTimer)
      if (es) es.close()
      eventSourceRef.current = null
    }
  }, [])

  return eventSourceRef
}

// ─── Hook spécifique pour le rafraîchissement auto ──────────────────────
// Déclenche un callback de refresh quand un événement pertinent arrive
export function useSSERefresh(onRefresh: () => void) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useSSE(useCallback(() => {
    // Debounce le refresh pour éviter les appels multiples
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(onRefresh, 500)
  }, [onRefresh]))
}
