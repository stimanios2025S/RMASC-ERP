import { useState, useEffect } from 'react'
import { apiFetch } from '../config/api'

interface Order {
  id: string
  serialNumber: string
  clientName: string
  clientEmail: string | null
  clientPhone: string
  clientCity: string
  status: string
  typeMotorisation: string
  largeurGaineMm: string
  profondeurGaineMm: string
  hauteurGaineMm: string
  createdAt: string
  lifecycleStage?: string
  engineeredBy?: string
  totalCostDZD?: number
  salePriceDZD?: number
  marginPct?: number
  completedAt?: string
}

// ─── Lifecycle Pipeline Stages ─────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'engineering', label: 'Ingenierie', icon: '✏️', color: 'bg-amber-100 text-amber-700' },
  { key: 'invoicing', label: 'Facturation', icon: '💰', color: 'bg-blue-100 text-blue-700' },
  { key: 'production', label: 'En Production', icon: '🏭', color: 'bg-primary-100 text-primary-700' },
  { key: 'delivered', label: 'Livre', icon: '✅', color: 'bg-emerald-100 text-emerald-700' },
]

function detectStage(order: Order): string {
  if (order.lifecycleStage) return order.lifecycleStage
  if (order.status === 'VALIDEE') return 'delivered'
  if (order.status === 'PRET_POUR_PRODUCTION') return 'production'
  if (order.status === 'ATTENTE_APPROBATION_ADMIN') return 'invoicing'
  return 'engineering'
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtCurrency = (n: number | undefined) => n ? n.toLocaleString('fr-DZ') + ' DZD' : '—'

// ─── Main Component ────────────────────────────────────────────────────────
interface Props {
  onBack: () => void
}

export default function LifecyclePipeline({ onBack }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [filterStage, setFilterStage] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data: Order[] = await apiFetch('/orders')
        if (!cancelled) setOrders(data)
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const ordersByStage = PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: orders.filter(o => detectStage(o) === stage.key).length,
  }))

  const filtered = filterStage === 'all'
    ? orders
    : orders.filter(o => detectStage(o) === filterStage)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-surface-50">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-all">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Retour au Tableau de bord
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Cycle de Vie — Pipeline</span>
          <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-semibold">{orders.length} commandes</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-primary-50/60 via-surface-50 to-surface-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Pipeline Kanban-style stage cards */}
          <div className="grid grid-cols-4 gap-4">
            {ordersByStage.map(stage => (
              <div key={stage.key} className={`rounded-2xl p-4 shadow-card border border-gray-50 ${stage.key === filterStage ? 'ring-2 ring-primary-400' : ''}`}
                onClick={() => setFilterStage(stage.key)}
                style={{ cursor: 'pointer' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{stage.icon}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.color}`}>{stage.count}</span>
                </div>
                <p className="text-sm font-bold text-gray-800">{stage.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {stage.count === 0 ? 'Aucune commande' : `${stage.count} commande${stage.count > 1 ? 's' : ''}`}
                </p>
              </div>
            ))}
          </div>

          {/* Master audit log table */}
          <div className="bg-surface-50 rounded-2xl shadow-card border border-gray-50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">
                {filterStage === 'all' ? 'Toutes les commandes' : PIPELINE_STAGES.find(s => s.key === filterStage)?.label || 'Commandes'}
              </h3>
              <div className="flex items-center gap-2">
                {filterStage !== 'all' && (
                  <button onClick={() => setFilterStage('all')}
                    className="text-xs text-primary-600 hover:underline">Afficher tout</button>
                )}
                <span className="text-xs text-gray-400">{filtered.length} commande{filtered.length > 1 ? 's' : ''}</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-sm text-gray-400 italic">Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 italic">Aucune commande dans cette etape.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Serie</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Client</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Motorisation</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Stage</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Ingenieur</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Cout Total</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Prix Vente</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Marge</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(o => {
                      const stage = PIPELINE_STAGES.find(s => s.key === detectStage(o))
                      const marginVal = o.salePriceDZD && o.totalCostDZD
                        ? ((o.salePriceDZD - o.totalCostDZD) / o.totalCostDZD * 100).toFixed(0)
                        : '—'
                      return (
                        <tr key={o.id} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-6 py-3">
                            <span className="text-sm font-mono font-bold text-gray-800">{o.serialNumber}</span>
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-sm font-semibold text-gray-700">{o.clientName}</p>
                            <p className="text-[10px] text-gray-400">{o.clientCity}</p>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-xs text-gray-600">{o.typeMotorisation}</span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage?.color || 'bg-gray-100 text-gray-600'}`}>
                              {stage?.icon} {stage?.label || detectStage(o)}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-xs text-gray-600">{o.engineeredBy || '—'}</span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm font-mono text-gray-700">{fmtCurrency(o.totalCostDZD)}</span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm font-mono font-semibold text-gray-800">{fmtCurrency(o.salePriceDZD)}</span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className={`text-sm font-mono font-bold ${Number(marginVal) >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {marginVal}%
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="text-xs text-gray-400 font-mono">{fmtDate(o.createdAt)}</div>
                            {o.completedAt && <div className="text-[10px] text-gray-400">Livré: {fmtDate(o.completedAt)}</div>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
