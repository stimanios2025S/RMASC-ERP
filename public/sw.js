// ─── RMASC FACTORY — Service Worker v2.7.1 (CACHE BUSTER) ──────────────────
// CRITICAL: Every deploy changes SW_VERSION. On activate, ALL old caches
// are DELETED. This forces all devices to fetch fresh files immediately.
// No cache-first strategy — always network-first to prevent stale apps.
// ──────────────────────────────────────────────────────────────────────────

const SW_VERSION = 'v2.7.1'

// ─── INSTALL: Skip waiting so new SW activates immediately ────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// ─── ACTIVATE: DELETE ALL OLD CACHES, take control of all tabs ───────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Delete EVERY cache — forces fresh downloads on next fetch
      const deletions = keys.map((key) => caches.delete(key))
      return Promise.allSettled(deletions)
    }).then(() => {
      // Take control of ALL open tabs immediately
      return self.clients.claim()
    })
  )
})

// ─── FETCH: Network-first for EVERYTHING (no cache-first) ─────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API calls: Network only (no cache fallback for mutations)
  if (url.pathname.startsWith('/api')) {
    event.respondWith(networkOnly(request))
    return
  }

  // Everything else (HTML, JS, CSS, images): Network first, fallback to cache
  event.respondWith(networkFirstWithCacheFallback(request))
})

// ─── STRATEGIES ───────────────────────────────────────────────────────────

async function networkFirstWithCacheFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok && response.type !== 'opaque') {
      // Cache the response for offline fallback, but DON'T serve from cache first
      const cache = await caches.open(SW_VERSION)
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch {
    // Offline: serve from cache if available
    const cached = await caches.match(request)
    if (cached) return cached
    // Last resort for navigation: serve index.html (SPA fallback)
    if (request.mode === 'navigate') {
      const indexCached = await caches.match('/index.html')
      if (indexCached) return indexCached
    }
    return new Response('Hors-ligne', { status: 503 })
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request)
  } catch {
    return new Response(JSON.stringify({ offline: true, error: 'Hors-ligne' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ─── MESSAGE HANDLER: Listen for messages from the app ────────────────────
self.addEventListener('message', (event) => {
  const { data } = event
  if (data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (data?.type === 'CLEAR_CACHES') {
    caches.keys().then(keys => Promise.allSettled(keys.map(k => caches.delete(k))))
  }
})
