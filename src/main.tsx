import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// ═══ VERSION CONTROL — forces cache reset on all devices when deployed ═════
// Every deploy MUST increment this version. It's checked against localStorage.
// If it doesn't match, ALL localStorage is wiped and the page reloads.
// This ensures the old cached data (orders, items, etc.) never persists.
const APP_VERSION = 'v2.6.2-force-sync'

// ─── Force localStorage reset on version change ──────────────────────────
// This is the FIRST thing that runs — before React mounts, before anything.
// Old versions of RMASC stored orders in localStorage. This wipes them ALL.
;(() => {
  try {
    const storedVersion = localStorage.getItem('rmasc_app_version')
    if (storedVersion !== APP_VERSION) {
      console.log(`[VERSION] ${storedVersion || 'none'} → ${APP_VERSION}. Clearing all local data...`)

      // Wipe EVERYTHING in localStorage (old orders, cache, sessions, everything)
      localStorage.clear()

      // Set new version
      localStorage.setItem('rmasc_app_version', APP_VERSION)

      console.log('[VERSION] Local storage wiped. Fresh start.')
    }
  } catch (e) {
    // Silently fail — never block app rendering
    console.warn('[VERSION] Could not check version:', e)
  }
})()

// ─── Lazy load Sentry (keeps main bundle small) ────────────────────────
let SentryModule: any = null
async function initSentry() {
  if (window.location.hostname === 'localhost') return
  try {
    SentryModule = await import('@sentry/react')
    SentryModule.init({
      dsn: 'https://fa2884aa65c1f0a3446c5f4d5c85c5ed@o4511808265977856.ingest.de.sentry.io/4511808272466000',
      integrations: [SentryModule.browserTracingIntegration(), SentryModule.replayIntegration()],
      tracesSampleRate: 0.3,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 0.5,
      environment: 'production',
    })
    console.log('[Sentry] Initialized')
  } catch { /* silent fail */ }
}
initSentry()

// ─── Global error handler ────────────────────────────────────────────────
window.onerror = (_msg, _source, _line, _col, error) => {
  console.error('[GLOBAL ERROR]', error?.message)
  if (SentryModule) SentryModule.captureException(error)
  const root = document.getElementById('root')
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `
      <div style="height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:sans-serif;padding:20px;">
        <div style="max-width:500px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
          <h1 style="font-size:20px;margin-bottom:8px;">RMASC ERP — Erreur de chargement</h1>
          <p style="color:#94a3b8;font-size:14px;line-height:1.5;">
            L'application n'a pas pu se charger correctement.
            <br/>
            <span style="font-size:12px;color:#64748b;">${String(error?.message || _msg).substring(0, 200)}</span>
          </p>
          <button onclick="localStorage.clear();location.reload()"
            style="margin-top:16px;padding:10px 24px;border-radius:12px;border:none;background:linear-gradient(135deg,#f59e0b,#ea580c);color:white;font-weight:bold;font-size:14px;cursor:pointer;">
            🔄 Vider le cache & recharger
          </button>
        </div>
      </div>
    `
  }
  return true
}

// ─── Service Worker management ──────────────────────────────────────────
// Unregister ALL old service workers (legacy), and listen for updates
;(async () => {
  if ('serviceWorker' in navigator) {
    try {
      // 1. Unregister any OLD service workers (pre-v2.6.2)
      const oldRegistrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of oldRegistrations) {
        // If it's an old SW (not our new one), unregister it
        if (reg.active?.scriptURL && !reg.active.scriptURL.includes('sw.js')) {
          await reg.unregister()
        }
      }

      // 2. Register the new service worker
      const registration = await navigator.serviceWorker.register('/sw.js')

      // 3. Listen for messages from the SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') {
          console.log('[SW] New service worker activated. Reloading...')
          // Force a hard reload from server (not cache)
          window.location.reload()
        }
      })

      // 4. If there's a waiting SW, tell it to activate now
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

      // 5. Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW installed but not active — tell it to take over
              newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
            if (newWorker.state === 'activated') {
              console.log('[SW] New version activated. Reloading...')
              window.location.reload()
            }
          })
        }
      })

      // 6. Check for SW updates every 5 minutes
      setInterval(() => {
        registration.update().catch(() => {})
      }, 5 * 60 * 1000)

    } catch (err) {
      console.warn('[SW] Service Worker registration failed:', err)
    }
  }
})()

// ─── Mount timeout fallback ────────────────────────────────────────────
const mountTimeout = setTimeout(() => {
  const root = document.getElementById('root')
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `
      <div style="height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:sans-serif;padding:20px;">
        <div style="text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">⏳</div>
          <h1 style="font-size:20px;margin-bottom:8px;">RMASC ERP — Chargement</h1>
          <p style="color:#94a3b8;font-size:14px;">L'application prend plus de temps que prévu...</p>
          <div style="margin-top:20px;display:flex;gap:12px;justify-content:center;">
            <button onclick="localStorage.clear();location.reload()" style="padding:10px 20px;border-radius:12px;border:none;background:linear-gradient(135deg,#f59e0b,#ea580c);color:white;font-weight:bold;font-size:13px;cursor:pointer;">🗑️ Vider le cache & recharger</button>
          </div>
        </div>
      </div>
    `
  }
}, 8000)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

clearTimeout(mountTimeout)
