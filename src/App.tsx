import { useState } from 'react'
import Dashboard from './components/Dashboard'
import BureauEtudeWorkspace from './components/BureauEtudeWorkspace'
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

  if (role === 'ADMIN') {
    return <Dashboard onLogout={handleLogout} session={session} onSessionUpdate={handleSessionUpdate} />
  }
  if (role === 'INGENIEUR_1' || role === 'INGENIEUR_2' || role === 'VERIFICATEUR') {
    const ROLE_TO_ENGINEER_TAB: Record<string, string> = {
      INGENIEUR_1: 'ingenieur-1',
      INGENIEUR_2: 'ingenieur-2',
      VERIFICATEUR: 'verificateur',
    }
    return <BureauEtudeWorkspace onBack={handleLogout} forcedTab={ROLE_TO_ENGINEER_TAB[role]} session={session} />
  }
  if (role === 'PRODUCTION') {
    return <ProductionWorkspace onBack={handleLogout} session={session} />
  }
  if (role === 'MAGASINIER') {
    return <StockWorkspace onBack={handleLogout} session={session} />
  }

  return <LoginScreen onLogin={handleLogin} />
}
