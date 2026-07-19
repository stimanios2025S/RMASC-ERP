import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// ─── Service Worker — auto-update on new deployments ──────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    // Unregister any old SWs with different scopes
    regs.forEach(r => r.unregister().catch(() => {}))
  }).then(() => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
      // Check for updates every 5 minutes
      setInterval(() => reg.update(), 300_000)
      // Auto-reload when new SW activates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            // New SW activated — reload to get latest assets
            window.location.reload()
          }
        })
      })
    }).catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
