// ─── RMASC FACTORY — Service Worker v2.7.0 ──────────────────────────────
// Stratégie : Network-first pour toujours servir le JS le plus récent.
// File d'attente offline pour les mutations (POST/PATCH/DELETE).

const SW_VERSION = 'v2.7.0'
const CACHE_STATIC = 'rmasc-static-v2'
const CACHE_DYNAMIC = 'rmasc-dynamic-v2'

const STATIC_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/icon-192.svg',
  '/images/icon-512.svg',
  '/images/rmasc-logo.svg',
  '/images/rmasc-logo.png',
]

const API_PREFIX = '/api'

// ─── INSTALL ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return Promise.allSettled(
        STATIC_URLS.map((url) => cache.add(url).catch(() => {}))
      )
    })
  )
})

// ─── ACTIVATE ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ─── FETCH ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API calls: Network First
  if (url.pathname.startsWith(API_PREFIX)) {
    event.respondWith(networkFirstWithQueue(request))
    return
  }

  // Static assets (JS, CSS, images): NETWORK FIRST — always try fresh, cache as fallback
  if (isStaticAsset(request)) {
    event.respondWith(networkFirstWithCache(request))
    return
  }

  // Navigation: Network First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // Default: Network only
  event.respondWith(fetch(request).catch(() => new Response('Offline', { status: 503 })))
})

// ─── STRATÉGIES ─────────────────────────────────────────────────────────────

// Network-first for static assets — always get fresh JS/CSS, fall back to cache
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response('Offline', { status: 503 })
  }
}

async function networkFirstWithQueue(request) {
  try {
    const response = await fetch(request)
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_DYNAMIC)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // Queue mutations for later sync
    if (request.method !== 'GET') {
      await addToQueue(request)
      return new Response(JSON.stringify({ offline: true, queued: true, message: 'File d\'attente offline' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ offline: true, error: 'Hors-ligne' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return caches.match('/index.html') || new Response('Hors-ligne', { status: 503 })
  }
}

// ─── FILE D'ATTENTE OFFLINE (IndexedDB) ────────────────────────────────────
async function addToQueue(request) {
  try {
    const db = await openDB()
    const tx = db.transaction('queue', 'readwrite')
    const store = tx.objectStore('queue')
    const clone = request.clone()
    const body = await clone.text()
    store.add({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      url: request.url,
      method: request.method,
      headers: JSON.stringify(Array.from(request.headers.entries())),
      body: body || null,
      createdAt: new Date().toISOString(),
      retries: 0,
    })
  } catch (err) {
    console.error('[SW] Queue error:', err)
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('rmasc-offline-queue', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ─── SYNC ──────────────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-rmasc') event.waitUntil(processQueue())
})

async function processQueue() {
  try {
    const db = await openDB()
    const tx = db.transaction('queue', 'readonly')
    const entries = await new Promise((resolve) => {
      const req = tx.objectStore('queue').getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => resolve([])
    })
    for (const entry of entries) {
      try {
        await fetch(entry.url, {
          method: entry.method,
          headers: JSON.parse(entry.headers).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
          body: entry.body || undefined,
        })
        const delTx = db.transaction('queue', 'readwrite')
        delTx.objectStore('queue').delete(entry.id)
      } catch {
        entry.retries++
        if (entry.retries < 5) {
          const updTx = db.transaction('queue', 'readwrite')
          updTx.objectStore('queue').put(entry)
        }
      }
    }
  } catch {}
}

// ─── MESSAGE HANDLER ────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

// ─── UTILITIES ──────────────────────────────────────────────────────────────
function isStaticAsset(request) {
  const ext = new URL(request.url).pathname.split('.').pop()?.toLowerCase()
  return ['js', 'css', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'woff', 'woff2', 'ttf'].includes(ext || '')
}
