import { useState, useEffect } from 'react'
import { login, initPortalUsers } from '../data/portalUsers'
import type { PortalSession } from '../data/portalUsers'

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props {
  onLogin: (session: PortalSession) => void
}

// ─── Factory Icon ──────────────────────────────────────────────────────────
function FactoryIcon({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20V8a2 2 0 0 1 2-2h2v12"/>
      <path d="M6 20V6a2 2 0 0 1 2-2h2v16"/>
      <path d="M10 20V4a2 2 0 0 1 2-2h2v18"/>
      <path d="M14 20v-8a2 2 0 0 1 2-2h4v10"/>
      <path d="M2 20h20"/>
    </svg>
  )
}

// ─── Role Descriptions ────────────────────────────────────────────────────
const ROLE_INFO: Record<string, { icon: string; label: string; desc: string }> = {
  ADMIN:          { icon: '👑', label: 'Direction & Administration', desc: 'Gestion globale, commandes, validations, tableau de bord' },
  INGENIEUR_1:    { icon: '📐', label: "Bureau d'Études — Ingénieur 1", desc: "Plan d'Installation Technique (Dessin 1)" },
  INGENIEUR_2:    { icon: '✏️', label: "Bureau d'Études — Ingénieur 2", desc: 'Dessin 2D Cabine' },
  VERIFICATEUR:   { icon: '🔍', label: "Bureau d'Études — Vérificateur", desc: 'Contrôle Final & Approbation' },
  PRODUCTION:     { icon: '🏭', label: 'Production & Atelier', desc: 'Suivi de fabrication et ordres de production' },
}

// ─── Role Display Cards (for hint) ────────────────────────────────────────
const PORTAL_CARDS = [
  { role: 'ADMIN', icon: '👑', title: 'ADMINISTRATION', color: 'from-amber-500 to-orange-600' },
  { role: 'INGENIEUR_1', icon: '📐', title: 'BUREAU D\'ÉTUDES 1', color: 'from-sky-400 to-sky-600' },
  { role: 'INGENIEUR_2', icon: '✏️', title: 'BUREAU D\'ÉTUDES 2', color: 'from-violet-400 to-violet-600' },
  { role: 'VERIFICATEUR', icon: '🔍', title: 'VÉRIFICATEUR', color: 'from-rose-400 to-rose-600' },
  { role: 'PRODUCTION', icon: '🏭', title: 'PRODUCTION', color: 'from-emerald-400 to-emerald-600' },
  { role: 'MAGASINIER', icon: '📦', title: 'STOCKS', color: 'from-cyan-400 to-cyan-600' },
]

// ─── Main Component ───────────────────────────────────────────────────────
export default function LoginScreen({ onLogin }: Props) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    initPortalUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!loginId.trim()) {
      setError('Veuillez saisir votre identifiant.')
      return
    }
    if (!password.trim()) {
      setError('Veuillez saisir votre mot de passe.')
      return
    }

    setLoading(true)

    // Retry up to 3 times (backend may be starting)
    let session = null
    for (let i = 0; i < 3; i++) {
      session = await login(loginId.trim(), password)
      if (session) break
      if (i < 2) await new Promise(r => setTimeout(r, 2000))
    }
    setLoading(false)

    if (!session) {
      setError('Impossible de se connecter au serveur. Vérifiez que le backend est démarré (port 4000).')
      return
    }

    onLogin(session)
  }

  return (
    <div className="h-screen flex relative overflow-hidden">
      {/* Full background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=1920&q=80"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.3) saturate(1.2) contrast(1.1)' }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/20" />
        {/* Subtle orange glow */}
        <div className="absolute -top-40 right-1/4 w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-orange-600/8 blur-3xl" />
      </div>

      {/* ── Left Panel: Branding + Info ── */}
      <div className="flex-1 flex flex-col justify-center px-16 relative z-10">
        <div className="max-w-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <FactoryIcon className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">
                <span className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.7)]">RM</span>
                <span className="text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.7)]">ASC</span>
                <span className="text-amber-400"> FACTORY</span>
              </h1>
              <p className="text-sm text-slate-400 font-medium tracking-widest uppercase mt-1">
                Progiciel de Gestion Intégré
              </p>
            </div>
          </div>

          <p className="text-slate-400 text-lg leading-relaxed mb-4">
            Système de gestion des commandes, Bureau d'Études intégré,<br />
            et suivi de production ascenseur.
          </p>

          {/* Portal indicator cards */}
          <div className="grid grid-cols-3 gap-2.5 mt-6">
            {PORTAL_CARDS.map(card => (
              <div
                key={card.role}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-50/[0.03] border border-white/10"
              >
                <span className="text-base">{card.icon}</span>
                <span className="text-[10px] font-bold text-slate-400 leading-tight">{card.title}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-slate-600 mt-10">
          RMASC FACTORY v2.5.2 — Plateforme unifiée. Tous droits réservés © 2026.
        </p>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="w-[440px] flex flex-col justify-center px-10 relative z-10">
        <div className="bg-surface-50/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Système sécurisé</span>
            </div>
            <h2 className="text-xl font-bold text-white">Connexion</h2>
            <p className="text-sm text-slate-400 mt-1">Identifiez-vous pour accéder à votre espace de travail.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ID field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Identifiant</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">👤</span>
                <input
                  type="text"
                  value={loginId}
                  onChange={e => { setLoginId(e.target.value); setError(null) }}
                  placeholder="Saisir votre identifiant..."
                  autoFocus
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-50/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Mot de passe</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">🔑</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-50/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all"
                />
              </div>
            </div>

            {/* Login hint toggle */}
            <button
              type="button"
              onClick={() => setShowHint(p => !p)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-all"
            >
              <span>💡</span>
              <span>{showHint ? 'Masquer les identifiants' : 'Afficher les identifiants de test'}</span>
            </button>

            {showHint && (
              <div className="bg-surface-50/5 border border-white/10 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Comptes disponibles</p>
                <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                  <p>👑 <span className="text-amber-400 font-semibold">admin</span> / admin123 — Direction</p>
                  <p>📐 <span className="text-sky-400 font-semibold">ingenieur1</span> / ingenieur1 — BE Dessin 1</p>
                  <p>✏️ <span className="text-violet-400 font-semibold">ingenieur2</span> / ingenieur2 — BE Dessin 2</p>
                  <p>🔍 <span className="text-rose-400 font-semibold">verificateur</span> / verificateur — BE Vérif.</p>
                  <p>🏭 <span className="text-emerald-400 font-semibold">production</span> / production — Atelier</p>
                  <p>📦 <span className="text-cyan-400 font-semibold">magasinier</span> / magasinier — Stocks & Logistique</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-red-400 text-lg">⚠️</span>
                <p className="text-sm text-red-300 font-medium">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">🚀</span>
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-600">
            <span>🔒 Connexion locale sécurisée</span>
            <span>RMASC ERP v2.5.2</span>
          </div>
        </div>
      </div>
    </div>
  )
}
