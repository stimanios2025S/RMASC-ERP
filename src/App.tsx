import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import BureauEtudeWorkspace from './components/BureauEtudeWorkspace'
import ProductionWorkspace from './components/ProductionWorkspace'
import StockWorkspace from './components/StockWorkspace'
import LoginScreen from './components/LoginScreen'
import ActivationScreen from './components/ActivationScreen'
import UpdaterBanner from './components/UpdaterBanner'
import type { PortalSession } from './data/portalUsers'
import { getSession, initPortalUsers, logout } from './data/portalUsers'

interface LicenseInfo {
  valid: boolean
  company: string
  type: string
  remainingDays: number
  expiresAt: string | null
  error: string
  requiresActivation?: boolean
}

const ROLE_TO_ENGINEER_TAB: Record<string, string> = {
  INGENIEUR_1: 'ingenieur-1',
  INGENIEUR_2: 'ingenieur-2',
  VERIFICATEUR: 'verificateur',
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean
      platform: string
      apiBaseUrl: string
      appVersion: string
      appName: string
      license: {
        checkStatus: () => Promise<LicenseInfo>
        activate: (key: string) => Promise<{ success: boolean; error?: string; status?: LicenseInfo }>
        getInfo: () => Promise<LicenseInfo>
      }
      updater?: {
        checkNow: () => Promise<any>
        downloadUpdate: () => Promise<any>
        quitAndInstall: () => Promise<any>
        onUpdateAvailable: (cb: (info: any) => void) => () => void
        onUpdateNotAvailable: (cb: () => void) => () => void
        onDownloadProgress: (cb: (progress: any) => void) => () => void
        onUpdateDownloaded: (cb: (info: any) => void) => () => void
        onError: (cb: (err: any) => void) => () => void
      }
    }
  }
}

const DEV_LICENSE: LicenseInfo = {
  valid: true,
  company: 'RMASC CLIENT OFFICIEL',
  type: 'ENTERPRISE',
  remainingDays: 365,
  expiresAt: null,
  error: '',
}

// ═══ INIT ────────────────────────────────────────────────────────────────
initPortalUsers()

export default function App() {
  const [session, setSession] = useState<PortalSession | null>(() => getSession())
  const [licenseStatus, setLicenseStatus] = useState<LicenseInfo | null>(null)
  const [licenseLoading, setLicenseLoading] = useState(true)

  useEffect(() => {
    async function checkLicense() {
      try {
        if (window.electronAPI?.license) {
          const status = await window.electronAPI.license.checkStatus()
          setLicenseStatus(status)
        } else {
          setLicenseStatus(DEV_LICENSE)
        }
      } catch { setLicenseStatus(DEV_LICENSE) }
      finally { setLicenseLoading(false) }
    }
    checkLicense()
  }, [])

  const handleActivate = async (licenseKey: string) => {
    if (window.electronAPI?.license) {
      const result = await window.electronAPI.license.activate(licenseKey)
      if (result.success && result.status) setLicenseStatus(result.status)
    }
  }

  const handleLogin = (s: PortalSession) => setSession(s)
  const handleLogout = () => { logout(); setSession(null) }
  const handleSessionUpdate = () => {
    const refreshed = getSession()
    if (refreshed) setSession({ ...refreshed })
  }

  function ViewWithUpdater({ children }: { children: React.ReactNode }) {
    return (
      <>
        {children}
        {window.electronAPI?.updater && <UpdaterBanner electronAPI={window.electronAPI as any} />}
      </>
    )
  }

  if (licenseLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/25">
            <span className="text-2xl font-black text-white">RM</span>
          </div>
          <div className="w-10 h-10 rounded-full border-3 border-slate-700 border-t-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Initialisation...</p>
        </div>
      </div>
    )
  }

  if (licenseStatus && !licenseStatus.valid) {
    return (
      <ViewWithUpdater>
        <ActivationScreen licenseStatus={licenseStatus} onActivate={handleActivate} />
      </ViewWithUpdater>
    )
  }

  if (!session) {
    return (
      <ViewWithUpdater>
        <LoginScreen onLogin={handleLogin} />
      </ViewWithUpdater>
    )
  }

  const role = session.role

  if (role === 'ADMIN') {
    return <ViewWithUpdater><Dashboard onLogout={handleLogout} session={session} onSessionUpdate={handleSessionUpdate} /></ViewWithUpdater>
  }
  if (role === 'INGENIEUR_1' || role === 'INGENIEUR_2' || role === 'VERIFICATEUR') {
    const forcedTab = ROLE_TO_ENGINEER_TAB[role] || 'ingenieur-1'
    return <ViewWithUpdater><BureauEtudeWorkspace onBack={handleLogout} forcedTab={forcedTab} session={session} /></ViewWithUpdater>
  }
  if (role === 'PRODUCTION') {
    return <ViewWithUpdater><ProductionWorkspace onBack={handleLogout} session={session} /></ViewWithUpdater>
  }
  if (role === 'MAGASINIER') {
    return <ViewWithUpdater><StockWorkspace onBack={handleLogout} session={session} /></ViewWithUpdater>
  }

  return <ViewWithUpdater><LoginScreen onLogin={handleLogin} /></ViewWithUpdater>
}
