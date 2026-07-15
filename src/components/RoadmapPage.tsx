import { useState, useEffect } from 'react'

interface OrderRow {
  id: string; serialNumber: string; clientName: string; clientCity: string
  typeMotorisation: string; status: string; createdAt: string
  largeurGaineMm: string; profondeurGaineMm: string; hauteurGaineMm: string
  materiauCabine: string | null; materiauPortes: string | null
  materiauParois: string | null; materiauSol: string | null
  _count: { cadSubmissions: number }
}

const STATUS_STEPS = [
  { key: 'BROUILLON', label: 'Création', icon: '📝', hours: 0 },
  { key: 'ATTENTE_DESSIN_TECH', label: 'Plan Installation', icon: '📐', hours: 16 },
  { key: 'ATTENTE_APPROBATION_ADMIN', label: 'Validation Admin', icon: '✅', hours: 4 },
  { key: 'ATTENTE_DESSIN_2D', label: 'Dessin 2D Cabine', icon: '✏️', hours: 24 },
  { key: 'ATTENTE_VERIFICATION', label: 'Vérification', icon: '🔍', hours: 8 },
  { key: 'PRET_POUR_PRODUCTION', label: 'Prêt Production', icon: '🏭', hours: 0 },
  { key: 'EN_LIVRAISON', label: 'Livraison', icon: '🚛', hours: 8 },
  { key: 'LIVREE', label: 'Livrée', icon: '✅', hours: 0 },
]

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STEPS.find(s => s.key === status)
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
      status === 'LIVREE' || status === 'VALIDEE'
        ? 'bg-emerald-500/15 text-emerald-400'
        : status === 'EN_LIVRAISON'
          ? 'bg-cyan-500/15 text-cyan-400'
          : status === 'ANNULEE'
            ? 'bg-red-500/15 text-red-400'
            : 'bg-amber-500/15 text-amber-400'
    }`}>
      {s?.label || status}
    </span>
  )
}

interface Props {
  orders: OrderRow[]
  onBack?: () => void
}

export default function RoadmapPage({ orders, onBack }: Props) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const now = Date.now()

  const filtered = orders
    .filter(o => filterStatus === 'all' || o.status === filterStatus)
    .filter(o => !search || o.serialNumber.toLowerCase().includes(search.toLowerCase()) || o.clientName.toLowerCase().includes(search.toLowerCase()))

  const uniqueStatuses = [...new Set(orders.map(o => o.status))]

  // Stats
  const total = orders.length
  const termines = orders.filter(o => ['PRET_POUR_PRODUCTION', 'VALIDEE'].includes(o.status)).length
  const enCours = orders.filter(o => ['ATTENTE_DESSIN_TECH', 'ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION'].includes(o.status)).length
  const enAttente = orders.filter(o => ['BROUILLON', 'ATTENTE_APPROBATION_ADMIN'].includes(o.status)).length

  return (
    <div className="flex-1 overflow-y-auto bg-white/[0.04]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/[0.04] border-b border-white/10 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>
          )}
          <h1 className="text-lg font-extrabold text-gray-200">🚀 Roadmap Production</h1>
          <span className="text-xs text-slate-400 font-mono">{orders.length} commandes</span>
        </div>
        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par série ou client..."
            className="w-60 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-gray-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-200" />
        </div>
      </div>

      {/* KPI */}
      <div className="px-6 py-4 grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-gray-200', bg: 'bg-white/[0.04] border border-white/10' },
          { label: 'En cours', value: enCours, color: 'text-cyan-700', bg: 'bg-cyan-50 border border-cyan-100' },
          { label: 'En attente', value: enAttente, color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-100' },
          { label: 'Terminées', value: termines, color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-100' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl px-4 py-3 flex items-center justify-between ${kpi.bg}`}>
            <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
            <span className={`text-xl font-extrabold ${kpi.color}`}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="px-6 pb-3 flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'all' ? 'bg-slate-800 text-white' : 'bg-white/[0.04] border border-white/10 text-slate-500 hover:bg-white/[0.04]'}`}>
          Tous
        </button>
        {uniqueStatuses.map(s => {
          const st = STATUS_STEPS.find(x => x.key === s)
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === s ? 'bg-slate-800 text-white' : 'bg-white/[0.04] border border-white/10 text-slate-500 hover:bg-white/[0.04]'}`}>
              {st?.icon} {st?.label || s}
            </button>
          )
        })}
      </div>

      {/* Roadmap cards */}
      <div className="px-6 pb-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">Aucune commande trouvée.</div>
        ) : (
          filtered.map(order => {
            const currentIdx = STATUS_STEPS.findIndex(s => s.key === order.status)
            const activeIdx = currentIdx >= 0 ? currentIdx : 0
            const createdAt = new Date(order.createdAt).getTime()
            const isExpanded = expanded === order.id

            return (
              <div key={order.id} className="bg-white/[0.04] rounded-2xl border border-white/10 overflow-hidden shadow-sm hover:shadow-md transition-all">
                {/* Order header — clickable to expand */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : order.id)}
                  className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      order.status === 'PRET_POUR_PRODUCTION' || order.status === 'VALIDEE' ? 'bg-emerald-500'
                      : order.status === 'BROUILLON' || order.status === 'ATTENTE_APPROBATION_ADMIN' ? 'bg-amber-500'
                      : 'bg-cyan-500'
                    }`} />
                    <div>
                      <p className="text-sm font-bold text-gray-200 font-mono">{order.serialNumber}</p>
                      <p className="text-xs text-slate-500">{order.clientName} — {order.clientCity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-400">{order.typeMotorisation}</p>
                      <p className="text-[10px] text-slate-400">Gaine: {order.largeurGaineMm}×{order.profondeurGaineMm} mm</p>
                    </div>
                    <StatusBadge status={order.status} />
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                </div>

                {/* Expanded timeline */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                    <div className="relative ml-1">
                      {STATUS_STEPS.map((step, i) => {
                        const isPast = i <= activeIdx
                        const isCurrent = i === activeIdx
                        const elapsedH = (now - createdAt) / 3600000
                        const phaseProgress = isCurrent && step.hours > 0 ? Math.min(100, Math.round((elapsedH / step.hours) * 100)) : 0
                        const remainingH = isCurrent && step.hours > 0 ? Math.max(0, Math.round(step.hours - elapsedH)) : 0

                        return (
                          <div key={step.key} className="flex gap-3 pb-4 last:pb-0">
                            <div className="flex flex-col items-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                isPast ? 'bg-emerald-500 text-white' : 'bg-white/[0.08] text-gray-400'
                              }`}>
                                {isPast ? '✓' : i + 1}
                              </div>
                              {i < STATUS_STEPS.length - 1 && (
                                <div className={`w-0.5 flex-1 min-h-[18px] ${isPast ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                              )}
                            </div>
                            <div className="flex-1 pb-1">
                              <div className="flex items-center justify-between">
                                <p className={`text-sm font-bold ${isCurrent ? 'text-gray-200' : isPast ? 'text-gray-400' : 'text-slate-400'}`}>
                                  {step.icon} {step.label}
                                </p>
                                {isCurrent && step.hours > 0 && (
                                  <span className={`text-xs font-bold ${remainingH > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    ~{remainingH > 0 ? `${remainingH}h restantes` : 'Terminé'}
                                  </span>
                                )}
                                {isPast && !isCurrent && step.hours > 0 && (
                                  <span className="text-xs text-slate-400 font-medium">✓ {step.hours}h</span>
                                )}
                              </div>
                              {isCurrent && step.hours > 0 && (
                                <div className="w-full h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                                  <div className={`h-full rounded-full ${phaseProgress > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(100, phaseProgress)}%` }} />
                                </div>
                              )}
                              <p className="text-[10px] text-slate-400 mt-1">
                                {isCurrent ? (step.hours > 0 ? `${Math.round(elapsedH)}h écoulées sur ${step.hours}h` : 'En cours...')
                                  : isPast ? (step.hours > 0 ? `Durée estimée: ${step.hours}h` : '—')
                                    : 'En attente'}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Materials & options summary */}
                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Matériaux</p>
                        <p className="text-gray-200">Cabine: {order.materiauCabine || '—'}</p>
                        <p className="text-gray-200">Portes: {order.materiauPortes || '—'}</p>
                        <p className="text-gray-200">Parois: {order.materiauParois || '—'}</p>
                        <p className="text-gray-200">Sol: {order.materiauSol || '—'}</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Motorisation</p>
                        <p className="text-gray-200">Type: {order.typeMotorisation}</p>
                        <p className="text-gray-200">Dimensions: {order.largeurGaineMm}×{order.profondeurGaineMm}×{order.hauteurGaineMm} mm</p>
                        <p className="text-gray-200">Soumissions CAD: {order._count?.cadSubmissions || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
