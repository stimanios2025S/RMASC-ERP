// ─── RMASC FACTORY — Service Worker for PWA ────────────────────────────
// Manages offline cache and install prompt for desktop shortcut.

const CACHE = 'rmasc-v1'
const ASSETS = [
  '/',
  '/manifest.json',
  '/index.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => cached)
      return fetchPromise
    })
  )
})
