import { useState, lazy, Suspense } from 'react'
import LoginScreen from './components/LoginScreen'
import type { PortalSession } from './data/portalUsers'
import { getSession, initPortalUsers, logout } from './data/portalUsers'
import { ToastProvider } from './components/ui/Toast'

// ═══ LAZY PORTALS — each role only downloads ITS portal chunk ════════════
// Big win: an admin never downloads Stock/Ingénieur bundles, and vice-versa.
const Dashboard = lazy(() => import('./components/Dashboard'))
const IngenieurPortal = lazy(() => import('./components/IngenieurPortal'))
const ProductionWorkspace = lazy(() => import('./components/ProductionWorkspace'))
const StockWorkspace = lazy(() => import('./components/StockWorkspace'))

// ═══ INIT ────────────────────────────────────────────────────────────────
initPortalUsers()

function PortalLoading() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
      <div style={{ textAlign: 'center', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>RMASC FACTORY</div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(251,146,60,.3)', borderTopColor: '#f97316', animation: 'spin 1s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<PortalSession | null>(() => getSession())

  const handleLogin = (s: PortalSession) => setSession(s)
  const handleLogout = () => { logout(); setSession(null) }
  const handleSessionUpdate = () => {
    const refreshed = getSession()
    if (refreshed) setSession({ ...refreshed })
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />
  }

  const role = session.role

  // ── Each role has its OWN private portal ─────────────────────────
  let portal: React.ReactNode
  if (role === 'ADMIN') {
    portal = <Dashboard onLogout={handleLogout} session={session} onSessionUpdate={handleSessionUpdate} />
  } else if (role === 'INGENIEUR_1') {
    portal = <IngenieurPortal onBack={handleLogout} session={session} role="INGENIEUR_1" />
  } else if (role === 'INGENIEUR_2') {
    portal = <IngenieurPortal onBack={handleLogout} session={session} role="INGENIEUR_2" />
  } else if (role === 'VERIFICATEUR') {
    portal = <IngenieurPortal onBack={handleLogout} session={session} role="VERIFICATEUR" />
  } else if (role === 'PRODUCTION') {
    portal = <ProductionWorkspace onBack={handleLogout} session={session} />
  } else if (role === 'MAGASINIER') {
    portal = <StockWorkspace onBack={handleLogout} session={session} />
  } else {
    portal = <LoginScreen onLogin={handleLogin} />
  }

  return (
    <ToastProvider>
      <Suspense fallback={<PortalLoading />}>{portal}</Suspense>
    </ToastProvider>
  )
}
