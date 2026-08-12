import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// ═══ Sentry — Initialisé au plus tôt (import statique, chunk séparé) ─────
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: 'https://1d656a08e00f5e785cf080aa537baebb@o4511808265977856.ingest.de.sentry.io/4511812636704848',
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  // Replay disabled — it added ~500 KB to the bundle and hurt mobile load time.
  environment: 'production',
})

// ═══ VERSION CONTROL — forces cache reset on all devices when deployed ═════
const APP_VERSION = 'v2.8.0'

;(() => {
  try {
    const storedVersion = localStorage.getItem('rmasc_app_version')
    if (storedVersion !== APP_VERSION) {
      console.log(`[VERSION] ${storedVersion || 'none'} → ${APP_VERSION}. Clearing all local data...`)
      localStorage.clear()
      localStorage.setItem('rmasc_app_version', APP_VERSION)
      console.log('[VERSION] Local storage wiped. Fresh start.')
    }
  } catch (e) {
    console.warn('[VERSION] Could not check version:', e)
  }
})()

// ─── Global error handler ────────────────────────────────────────────────
window.onerror = (_msg, _source, _line, _col, error) => {
  console.error('[GLOBAL ERROR]', error?.message)
  Sentry.captureException(error)
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
;(async () => {
  if ('serviceWorker' in navigator) {
    try {
      // ═══ FIX iOS 17 — les téléphones restaient sur l'ANCIENNE VERSION ═══
      // iOS Safari en mode "écran d'accueil" ne re-vérifie PAS le service
      // worker au lancement : URL fixe /sw.js → ancien SW gardé pour toujours
      // → l'app servait l'ancien HTML/cache. SOLUTION : URL d'enregistrement
      // VERSIONNÉE (/sw.js?v=<version>) — une URL différente à chaque
      // déploiement force iOS à re-télécharger le nouveau SW.
      // updateViaCache:'none' interdit au navigateur de servir le SW depuis
      // son cache HTTP. Quand le nouveau SW prend le contrôle (controllerchange)
      // on recharge la page UNE fois automatiquement — aucune action manuelle.
      const SW_URL = `/sw.js?v=${APP_VERSION}`
      const hadController = !!navigator.serviceWorker.controller

      const oldRegistrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of oldRegistrations) {
        const url = reg.active?.scriptURL || reg.installing?.scriptURL || ''
        if (!url.includes('/sw.js')) {
          await reg.unregister()
        }
      }

      const registration = await navigator.serviceWorker.register(SW_URL, {
        updateViaCache: 'none',
      })

      // ── Auto-reload UNE fois quand la nouvelle version prend le contrôle ──
      // (skipWaiting + clients.claim activent le nouveau SW immédiatement)
      let reloaded = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloaded) return // 1er install = page déjà fraîche
        reloaded = true
        // Si l'utilisateur tape dans un champ, on attend la fin de saisie (max 30s)
        const busy = () => {
          const el = document.activeElement as HTMLElement | null
          return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
        }
        if (busy()) {
          const t0 = Date.now()
          const iv = window.setInterval(() => {
            if (!busy() || Date.now() - t0 > 30000) {
              window.clearInterval(iv)
              window.location.reload()
            }
          }, 300)
        } else {
          window.setTimeout(() => window.location.reload(), 800)
        }
      })

      // If a new SW is waiting, activate it silently (no page reload)
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

      // When a new SW is found, activate it silently
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        }
      })

      // Check for SW updates every 10 minutes (silent, no reload)
      setInterval(() => { registration.update().catch(() => {}) }, 10 * 60 * 1000)
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
