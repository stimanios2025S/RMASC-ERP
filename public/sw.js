// RMASC FACTORY — Service Worker (PWA)
// Enables offline caching and "Add to Home Screen" capability.
const CACHE = 'rmasc-erp-v2'

// Core assets to pre-cache on install
const PRE_CACHE = [
  '/',
  '/manifest.json',
  '/images/icon-192.svg',
  '/images/icon-512.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      // Pre-cache assets (non-blocking — failures are silent)
      return Promise.allSettled(
        PRE_CACHE.map((url) =>
          cache.add(url).catch(() => {
            /* asset may not exist yet; skip */
          })
        )
      )
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Clean old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  )
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Only cache GET requests to our own origin
  if (event.request.method !== 'GET') return

  // Skip API calls — never cache dynamic data
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => cached || new Response('Offline', { status: 503 }))
      return cached || fetchPromise
    })
  )
})
