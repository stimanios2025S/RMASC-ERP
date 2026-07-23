import { useState } from 'react'
import Dashboard from './components/Dashboard'
import IngenieurPortal from './components/IngenieurPortal'
import ProductionWorkspace from './components/ProductionWorkspace'
import StockWorkspace from './components/StockWorkspace'
import LoginScreen from './components/LoginScreen'
import type { PortalSession } from './data/portalUsers'
import { getSession, initPortalUsers, logout } from './data/portalUsers'
import { ToastProvider } from './components/ui/Toast'

// ═══ INIT ────────────────────────────────────────────────────────────────
initPortalUsers()

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

  return <ToastProvider>{portal}</ToastProvider>
}
