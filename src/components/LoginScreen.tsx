// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Login Screen
//  Design : Glassmorphism sombre, animations, responsive
//  Heavy components (ElevatorAnimation) are lazy-loaded after render
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, lazy, Suspense } from 'react'
import { login, initPortalUsers } from '../data/portalUsers'
import type { PortalSession } from '../data/portalUsers'
import InstallPWA from './InstallPWA'
import AmbientParticles from './AmbientParticles'
import IndustrialStatusBar from './IndustrialStatusBar'
import AnimatedLogo from './AnimatedLogo'

// Lazy load the heavy elevator animation (not needed on first paint)
const ElevatorAnimation = lazy(() => import('./ElevatorAnimation'))

interface Props { onLogin: (session: PortalSession) => void }

const PORTAL_CARDS = [
  { role: 'ADMIN', icon: '👑', title: 'ADMINISTRATION' },
  { role: 'INGENIEUR_1', icon: '📐', title: "BUREAU D'ÉTUDES 1" },
  { role: 'INGENIEUR_2', icon: '✏️', title: "BUREAU D'ÉTUDES 2" },
  { role: 'VERIFICATEUR', icon: '🔍', title: 'VÉRIFICATEUR' },
  { role: 'PRODUCTION', icon: '🏭', title: 'PRODUCTION 1' },
  { role: 'PRODUCTION_2', icon: '🏭', title: 'PRODUCTION 2' },
  { role: 'MAGASINIER', icon: '📦', title: 'STOCKS' },
]

export default function LoginScreen({ onLogin }: Props) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [networkOnline, setNetworkOnline] = useState(true)

  useEffect(() => {
    initPortalUsers()
    // Detect network status for helpful error messages
    setNetworkOnline(navigator.onLine)
    const goOnline = () => setNetworkOnline(true)
    const goOffline = () => setNetworkOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null)
    if (!loginId.trim()) { setError('Veuillez saisir votre identifiant.'); return }
    if (!password.trim()) { setError('Veuillez saisir votre mot de passe.'); return }
    setLoading(true)
    // Single attempt — local auth is instant; API fallback has its own retries
    const session = await login(loginId.trim(), password)
    setLoading(false)
    if (!session) {
      setError(networkOnline
        ? 'Identifiants incorrects. Verifiez votre identifiant et mot de passe.'
        : 'Hors-ligne. Veuillez verifier votre connexion reseau.')
      return
    }
    onLogin(session)
  }

  return (
    <div className="h-dvh flex flex-col md:flex-row relative overflow-hidden bg-slate-950">
      {/* Background — CSS gradients only, NO heavy image download */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, rgba(251,146,60,0.5) 0%, transparent 50%),
                             radial-gradient(circle at 80% 70%, rgba(249,115,22,0.4) 0%, transparent 40%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-slate-950/85 md:bg-gradient-to-r md:from-slate-950/85 md:via-slate-950/55 md:to-slate-950/15" />
        <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
      </div>
      <AmbientParticles count={12} />

      {/* ── Left Panel ── */}
      <div className="md:flex-1 flex flex-col justify-center relative z-10 overflow-hidden pb-12 md:pb-0">
        <div className="flex items-center justify-center flex-1 gap-3 md:gap-8 lg:gap-16 px-4 md:px-8">
          <div className="w-[130px] md:w-[200px] lg:w-[260px] flex-shrink-0 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Suspense fallback={<div className="w-full h-[300px] rounded-2xl bg-slate-800/40 border border-white/5 animate-pulse" />}>
              <ElevatorAnimation />
            </Suspense>
          </div>
          <div className="max-w-[200px] md:max-w-xs lg:max-w-sm">
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 overflow-hidden flex-shrink-0">
                <img src="/images/rmasc-logo.png" alt="RMASC" className="w-7 h-7 md:w-11 md:h-11 object-contain" />
              </div>
              <div>
                <AnimatedLogo />
                <p className="text-[9px] md:text-sm text-white/90 font-semibold tracking-widest uppercase mt-0.5">Progiciel de Gestion Intégré</p>
              </div>
            </div>
            <p className="text-white/50 text-xs md:text-base leading-relaxed mb-3 hidden md:block">
              Système de gestion des commandes, Bureau d'Études intégré,<br />
              et suivi de production ascenseur.
            </p>
            <div className="grid grid-cols-3 gap-1.5 hidden md:grid">
              {PORTAL_CARDS.map(card => (
                <div key={card.role} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-800/60 border border-white/10 hover:bg-white/[0.06] transition-all">
                  <span className="text-base">{card.icon}</span>
                  <span className="text-[9px] font-bold text-white/80 leading-tight">{card.title}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-white/30 mt-4 hidden md:block">RMASC FACTORY v2.6.0 — Tous droits réservés © 2026</p>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="w-full md:w-[440px] flex flex-col justify-center px-4 md:px-10 relative z-10 overflow-y-auto pb-12 md:pb-0">
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-5 md:p-8 border border-white/10 shadow-2xl">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Système sécurisé</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white">Connexion</h2>
            <p className="text-xs md:text-sm text-white/50 mt-1">Identifiez-vous pour accéder à votre espace de travail.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Identifiant</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg">👤</span>
                <input type="text" value={loginId} onChange={e => { setLoginId(e.target.value); setError(null) }}
                  placeholder="Saisir votre identifiant..." autoFocus
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/15 bg-white/[0.05] text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all hover:border-white/25" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Mot de passe</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg">🔑</span>
                <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/15 bg-white/[0.05] text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all hover:border-white/25" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-red-400 text-lg">⚠️</span>
                <p className="text-sm text-red-300 font-medium">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]">
              {loading ? (
                <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Vérification...</span></>
              ) : (
                <><span className="text-lg">🚀</span><span>Se connecter</span></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40 font-medium">
            <span className="flex items-center gap-1.5"><span>🔒</span> Connexion locale sécurisée</span>
            <span>RMASC ERP <span className="text-amber-400/80">v2.8.1</span></span>
          </div>
        </div>
      </div>

      {/* Industrial Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <IndustrialStatusBar />
      </div>
    </div>
  )
}
