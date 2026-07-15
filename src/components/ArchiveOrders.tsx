// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Multi-Portal Archive Orders View
//  Used by Admin, Ingénieur, Production, and Stock portals.
//  Displays completed/archived orders with real-time search by project
//  name, client name, serial number, or city.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../config/api'

interface ArchiveOrder {
  id: string
  serialNumber: string
  clientName: string
  clientCity: string
  projectName?: string | null
  status: string
  typeMotorisation: string
  largeurGaineMm: string
  profondeurGaineMm: string
  hauteurGaineMm: string
  createdAt: string
  completedAt?: string | null
  priority?: string
}

const STATUS_LABELS: Record<string, string> = {
  LIVREE: 'Livrée', VALIDEE: 'Validée', ANNULEE: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  LIVREE: 'bg-emerald-500/15 text-emerald-400',
  VALIDEE: 'bg-emerald-500/15 text-emerald-400',
  ANNULEE: 'bg-red-500/15 text-red-400',
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ArchiveOrders({ onSelectOrder }: { onSelectOrder?: (id: string) => void }) {
  const [orders, setOrders] = useState<ArchiveOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const loadArchives = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const query = params.toString()
      const data: ArchiveOrder[] = await apiFetch(`/orders/archives${query ? '?' + query : ''}`)
      setOrders(data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { loadArchives() }, [loadArchives])

  // Client-side filtering by search term
  const filtered = orders.filter(o => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      (o.projectName?.toLowerCase().includes(s)) ||
      (o.clientName?.toLowerCase().includes(s)) ||
      (o.serialNumber?.toLowerCase().includes(s)) ||
      (o.clientCity?.toLowerCase().includes(s))
    )
  })

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-extrabold text-gray-200">📦 Archives</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {orders.length} commande{orders.length !== 1 ? 's' : ''} archivée{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setLoading(true) }}
            className="h-9 px-3 rounded-xl border border-white/10 bg-white/[0.04] text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            <option value="">Tous les statuts</option>
            <option value="LIVREE">Livrée</option>
            <option value="VALIDEE">Validée</option>
            <option value="ANNULEE">Annulée</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom de projet, client, ville ou N° de série..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-sm">✕</button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement des archives...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">📭</span>
          <p className="text-sm text-gray-500 font-medium">
            {search ? `Aucun résultat pour "${search}"` : 'Aucune commande archivée'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {search ? 'Essayez un autre terme de recherche.' : 'Les commandes terminées apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <div key={order.id}
              onClick={() => onSelectOrder?.(order.id)}
              className="bg-white/[0.03] rounded-xl border border-white/5 px-4 py-3.5 hover:bg-white/[0.06] transition-all cursor-pointer group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold font-mono text-gray-200">{order.serialNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-white/10 text-gray-400'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    {order.priority === 'URGENT' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">🔴 Urgent</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-300">{order.clientName} — {order.clientCity}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    {order.projectName && <span>🏗️ {order.projectName}</span>}
                    <span>⚡ {order.typeMotorisation}</span>
                    <span>📐 {order.largeurGaineMm}×{order.profondeurGaineMm}×{order.hauteurGaineMm} mm</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-gray-500">Créé le {fmtDate(order.createdAt)}</p>
                  {order.completedAt && (
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">✅ {fmtDate(order.completedAt)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count summary */}
      {!loading && filtered.length > 0 && (
        <p className="text-[10px] text-gray-500 text-center mt-4">
          {search ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''} trouvé${filtered.length > 1 ? 's' : ''}` : `${filtered.length} commande${filtered.length > 1 ? 's' : ''} affichée${filtered.length > 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  )
}
