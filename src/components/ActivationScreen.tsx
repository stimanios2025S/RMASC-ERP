import { useState } from 'react'

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

// ─── License status types ─────────────────────────────────────────────────
interface LicenseInfo {
  valid: boolean
  company: string
  type: string
  remainingDays: number
  expiresAt: string | null
  error: string
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props {
  licenseStatus: LicenseInfo
  onActivate: (licenseKey: string) => void
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function ActivationScreen({ licenseStatus, onActivate }: Props) {
  const [licenseKey, setLicenseKey] = useState('')
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setActivationError(null)

    if (!licenseKey.trim()) {
      setActivationError('Veuillez saisir votre clé de licence.')
      return
    }

    setActivating(true)
    // Brief delay for UX
    await new Promise(r => setTimeout(r, 800))
    setActivating(false)

    onActivate(licenseKey.trim())
  }

  const remainingText = () => {
    const d = licenseStatus.remainingDays
    if (d <= 0) return 'Expirée'
    if (d === 1) return '1 jour restant'
    if (d < 30) return `${d} jours restants`
    const months = Math.floor(d / 30)
    const days = d % 30
    return `${months} mois${days > 0 ? ` ${days} jours` : ''} restants`
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Industrial grid background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        <div className="max-w-lg w-full">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <FactoryIcon className="w-11 h-11 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">
              <span className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.7)]">RM</span>
              <span className="text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.7)]">ASC</span>
              <span className="text-amber-400"> FACTORY</span>
            </h1>
            <p className="text-sm text-slate-400 font-medium tracking-widest uppercase mt-1">
              Progiciel de Gestion Intégré
            </p>
          </div>

          {/* Activation Card */}
          <div className="bg-surface-50/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Activation requise</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Activation du Logiciel</h2>

            {licenseStatus.error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-5">
                <span className="text-red-400 text-lg flex-shrink-0 mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm text-red-300 font-medium">{licenseStatus.error}</p>
                  {licenseStatus.company && (
                    <p className="text-xs text-red-400 mt-1">
                      {licenseStatus.company} — {remainingText()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Clé de licence
                </label>
                <textarea
                  value={licenseKey}
                  onChange={e => { setLicenseKey(e.target.value); setActivationError(null) }}
                  placeholder="Collez votre clé de licence ici..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-surface-50/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all font-mono resize-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Format: GD-YYMMDD-XXXXXX (ex: GD-260629-A1B2C3)</p>
              </div>

              {activationError && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <p className="text-sm text-red-300 font-medium">{activationError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={activating}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {activating ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Vérification...</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">🔑</span>
                    <span>Activer le logiciel</span>
                  </>
                )}
              </button>
            </form>

            {/* Help toggle */}
            <button
              type="button"
              onClick={() => setShowHelp(p => !p)}
              className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-all w-full justify-center"
            >
              <span>💡</span>
              <span>{showHelp ? 'Masquer l\'aide' : 'Comment obtenir ma clé ?'}</span>
            </button>

            {showHelp && (
              <div className="mt-3 bg-surface-50/5 border border-white/10 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-400">Pour activer RMASC FACTORY :</p>
                <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside">
                  <li>Contactez votre administrateur RMASC</li>
                  <li>Fournissez le nom de votre société</li>
                  <li>Vous recevrez une clé de licence valide 1 an</li>
                  <li>Copiez-collez la clé dans le champ ci-dessus</li>
                  <li>Cliquez sur "Activer le logiciel"</li>
                </ol>
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] text-slate-500">
                    📧 Support : license@rmasc.erp<br />
                    Version : 2.5.2 — Enterprise
                  </p>
                </div>
              </div>
            )}

            {/* Already activated info */}
            {licenseStatus.valid && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-emerald-400 text-lg">✅</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Licence active</p>
                  <p className="text-xs text-emerald-400/80">
                    {licenseStatus.company} — {remainingText()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-[10px] text-slate-600 text-center mt-6">
            RMASC FACTORY v2.5.2 — Tous droits réservés © 2026
          </p>
        </div>
      </div>
    </div>
  )
}
