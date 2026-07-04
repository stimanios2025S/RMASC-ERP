import { useState } from 'react'
import Dashboard from './components/Dashboard'
import IngenieurPortal from './components/IngenieurPortal'
import ProductionWorkspace from './components/ProductionWorkspace'
import StockWorkspace from './components/StockWorkspace'
import LoginScreen from './components/LoginScreen'
import type { PortalSession } from './data/portalUsers'
import { getSession, initPortalUsers, logout } from './data/portalUsers'

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
  if (role === 'ADMIN') {
    return <Dashboard onLogout={handleLogout} session={session} onSessionUpdate={handleSessionUpdate} />
  }
  if (role === 'INGENIEUR_1') {
    return <IngenieurPortal onBack={handleLogout} session={session} role="INGENIEUR_1" />
  }
  if (role === 'INGENIEUR_2') {
    return <IngenieurPortal onBack={handleLogout} session={session} role="INGENIEUR_2" />
  }
  if (role === 'VERIFICATEUR') {
    return <IngenieurPortal onBack={handleLogout} session={session} role="VERIFICATEUR" />
  }
  if (role === 'PRODUCTION') {
    return <ProductionWorkspace onBack={handleLogout} session={session} />
  }
  if (role === 'MAGASINIER') {
    return <StockWorkspace onBack={handleLogout} session={session} />
  }

  return <LoginScreen onLogin={handleLogin} />
}
