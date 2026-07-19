// ─── RMASC FACTORY — SSE Real-time Hook ─────────────────────────────────
// Se connecte au flux SSE du backend et notifie les composants React
// des changements en temps réel (commandes, stock, etc.)

import { useEffect, useRef, useCallback } from 'react'
import { resolveUrl } from '../config/api'

interface SSEEvent {
  type: string
  data: any
}

type EventHandler = (event: SSEEvent) => void

// ─── Hook principal ──────────────────────────────────────────────────────
export function useSSE(onEvent?: EventHandler) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    const token = localStorage.getItem('rmasc_token')
    if (!token) return

    const url = resolveUrl('/realtime/subscribe') + `?token=${token}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.addEventListener('connected', (e: MessageEvent) => {
      console.log('[SSE] Connecté au flux temps réel')
    })

    es.addEventListener('order:created', (e: MessageEvent) => {
      try { onEventRef.current?.({ type: 'order:created', data: JSON.parse(e.data) }) } catch {}
    })

    es.addEventListener('order:status', (e: MessageEvent) => {
      try { onEventRef.current?.({ type: 'order:status', data: JSON.parse(e.data) }) } catch {}
    })

    es.addEventListener('stock:movement', (e: MessageEvent) => {
      try { onEventRef.current?.({ type: 'stock:movement', data: JSON.parse(e.data) }) } catch {}
    })

    es.addEventListener('order:approval', (e: MessageEvent) => {
      try { onEventRef.current?.({ type: 'order:approval', data: JSON.parse(e.data) }) } catch {}
    })

    es.addEventListener('order:file', (e: MessageEvent) => {
      try { onEventRef.current?.({ type: 'order:file', data: JSON.parse(e.data) }) } catch {}
    })

    es.onerror = () => {
      // Reconnexion automatique — EventSource le fait nativement
      console.warn('[SSE] Reconnexion...')
    }

    return () => {
      es.close()
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
