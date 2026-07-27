import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// ─── Lazy load Sentry (keeps main bundle small) ────────────────────────
// Sentry is loaded AFTER the app renders, so it doesn't delay page load
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

// ─── Service Worker safeguard ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
}

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
            <button onclick="location.reload()" style="padding:10px 20px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:13px;cursor:pointer;">🔁 Recharger</button>
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
