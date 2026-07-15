import { useState, useEffect, useCallback } from 'react'
import FicheTechniqueView from './FicheTechniqueView'
import type { PortalSession } from '../data/portalUsers'
import { apiFetch } from '../config/api'
import { PageBackground } from './PageBackground'
import InstallPWA from './InstallPWA'
import FileManager from './FileManager'
import AgentPanel from './agent/AgentPanel'
import SmartSearch from './smart/SmartSearch'
import ArchiveOrders from './ArchiveOrders'

interface OrderRow {
  id: string; serialNumber: string; clientName: string; clientCity: string
  typeMotorisation: string; status: string; createdAt: string
  largeurGaineMm: string; profondeurGaineMm: string; hauteurGaineMm: string
  materiauCabine: string | null; materiauPortes: string | null
  productionPhase?: string
  _count: { cadSubmissions: number }
}

interface Props { onBack?: () => void; session?: PortalSession }

const PHASES = [
  { id: 'decoupe', icon: '✂️', label: 'Découpe', desc: 'Découpe des tôles et profilés selon les plans techniques', color: 'from-sky-500 to-blue-600', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/20', textColor: 'text-sky-400' },
  { id: 'pliage', icon: '🔧', label: 'Pliage', desc: 'Pliage et formage des éléments de structure', color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20', textColor: 'text-indigo-400' },
  { id: 'soudeur', icon: '⚡', label: 'Soudure', desc: 'Soudure et assemblage des structures métalliques', color: 'from-violet-500 to-violet-600', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', textColor: 'text-violet-400' },
  { id: 'peinture', icon: '🎨', label: 'Peinture', desc: 'Application des revêtements et finitions', color: 'from-rose-500 to-rose-600', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20', textColor: 'text-rose-400' },
  { id: 'assemblage', icon: '🔩', label: 'Assemblage', desc: 'Assemblage final des sous-ensembles', color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', textColor: 'text-amber-400' },
  { id: 'emballage', icon: '📦', label: 'Emballage', desc: 'Emballage et protection pour le transport', color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', textColor: 'text-emerald-400' },
  { id: 'livraison', icon: '🚛', label: 'Livraison', desc: 'Transport, installation sur site client et confirmation de réception', color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', textColor: 'text-cyan-400' },
]

export default function ProductionWorkspace({ onBack, session }: Props) {
  const [tab, setTab] = useState<'production' | 'archives'>('production')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [activePhase, setActivePhase] = useState('decoupe')
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [showFiche, setShowFiche] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAgent, setShowAgent] = useState(false)
  const [showSmartSearch, setShowSmartSearch] = useState(false)

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSmartSearch(p => !p) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); setShowAgent(p => !p) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const loadOrders = useCallback(async () => {
    try {
      const data: OrderRow[] = await apiFetch('/orders')
      setOrders(data.filter(o => ['PRET_POUR_PRODUCTION', 'VALIDEE'].includes(o.status)))
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadOrders() }, [])
  useEffect(() => {
    const iv = setInterval(loadOrders, 8_000)
    const onFocus = () => loadOrders()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loadOrders() })
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [loadOrders])

  if (showFiche && selectedOrder) {
    return <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto"><FicheTechniqueView orderId={selectedOrder.id} onBack={() => setShowFiche(false)} /></div>
  }

  // ── Production phase from DB (NOT localStorage) ──────────────────────
  function getProdPhase(order: OrderRow): string {
    return order.productionPhase || 'decoupe'
  }

  const currentPhase = PHASES.find(p => p.id === activePhase)!
  const phaseOrders = orders.filter(o => {
    const p = getProdPhase(o)
    const phaseIdx = PHASES.findIndex(x => x.id === p)
    const currentIdx = PHASES.findIndex(x => x.id === activePhase)
    return phaseIdx >= currentIdx || (activePhase === 'decoupe' && p === 'decoupe')
  })

  const advancePhase = async (orderId: string, order: OrderRow) => {
    const current = getProdPhase(order)
    const idx = PHASES.findIndex(p => p.id === current)
    if (idx < PHASES.length - 1) {
      const nextPhase = PHASES[idx + 1].id
      // Update DB immediately
      try {
        await apiFetch(`/orders/${orderId}/production-phase`, {
          method: 'PATCH',
          body: JSON.stringify({ productionPhase: nextPhase }),
        })
        // Refresh orders
        loadOrders()
        setExpandedId(null)
        // When moving to livraison, mark order ready for delivery
        if (nextPhase === 'livraison') {
          await apiFetch(`/orders/${orderId}/mark-delivery`, { method: 'POST' })
          loadOrders()
        }
      } catch { /* retry on next refresh */ }
    }
  }

  // ── Archives tab ────────────────────────────────────────────────────
  if (tab === 'archives') {
    return (
      <PageBackground className="h-full flex flex-col">
        <header className="flex-shrink-0 bg-white/[0.04] border-b border-white/5 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md"><span className="text-white text-lg">🏭</span></div>
              <div><h1 className="text-lg font-extrabold text-gray-200">Production & Atelier</h1><p className="text-[11px] text-gray-400 font-semibold">{orders.length} commandes actives</p></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAgent(p => !p)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${showAgent ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' : 'bg-white/[0.06] hover:bg-white/[0.1] text-gray-400'}`}
              title="Assistant IA Salim (⌘I)"><span className="text-base">🤖</span></button>
            {session?.name && <span className="text-xs text-gray-500 bg-white/[0.06] px-2.5 py-1 rounded">{session.name}</span>}
          </div>
        </header>
        <div className="flex-shrink-0 bg-white/[0.04] border-b border-white/5 px-6 flex gap-0">
          <button onClick={() => setTab('production')} className="px-5 py-3 text-sm font-bold border-b-2 border-transparent text-white/60 hover:text-white">🏭 Production</button>
          <button onClick={() => setTab('archives')} className="px-5 py-3 text-sm font-bold border-b-2 border-amber-400 text-white">📦 Archives</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ArchiveOrders />
        </div>
      </PageBackground>
    )
  }

  // ── Main Production view ────────────────────────────────────────────
  return (
    <PageBackground className="h-full flex flex-col">
      <header className="flex-shrink-0 bg-white/[0.04] border-b border-white/5 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md"><span className="text-white text-lg">🏭</span></div>
            <div><h1 className="text-lg font-extrabold text-gray-200">Production & Atelier</h1><p className="text-[11px] text-gray-400 font-semibold">{orders.length} commandes en production</p></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAgent(p => !p)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${showAgent ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' : 'bg-white/[0.06] hover:bg-white/[0.1] text-gray-400'}`}
            title="Assistant IA Salim (⌘I)"><span className="text-base">🤖</span></button>
          {session?.name && <span className="text-xs text-gray-500 bg-white/[0.06] px-2.5 py-1 rounded">{session.name}</span>}
          <button onClick={loadOrders} className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-white/[0.04] border-b border-white/5 px-6 flex gap-0">
        <button onClick={() => setTab('production')} className="px-5 py-3 text-sm font-bold border-b-2 border-amber-400 text-white">🏭 Production</button>
        <button onClick={() => setTab('archives')} className="px-5 py-3 text-sm font-bold border-b-2 border-transparent text-white/60 hover:text-white">📦 Archives</button>
      </div>

      {/* Phase tabs */}
      <div className="flex-shrink-0 bg-white/[0.04] border-b border-white/5 overflow-x-auto">
        <div className="flex gap-0 px-4">
          {PHASES.map(phase => {
            const isActive = activePhase === phase.id
            const count = orders.filter(o => getProdPhase(o) === phase.id).length
            return (
              <button key={phase.id} onClick={() => { setActivePhase(phase.id); setExpandedId(null) }}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${isActive ? 'border-amber-400 text-white' : 'border-transparent text-white/60 hover:text-white'}`}>
                <span>{phase.icon}</span>
                <span>{phase.label}</span>
                {count > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/70'}`}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Phase description */}
      <div className={`flex-shrink-0 px-6 py-3 ${currentPhase.bgColor} border-b ${currentPhase.borderColor}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${currentPhase.color} flex items-center justify-center text-white shadow-sm`}>{currentPhase.icon}</div>
          <div><p className="text-sm font-bold text-gray-200">{currentPhase.label}</p><p className="text-xs text-gray-500">{currentPhase.desc}</p></div>
        </div>
      </div>

      {/* Orders grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {phaseOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-5xl mb-4">📭</span>
            <p className="text-sm font-medium">Aucune commande dans cette phase</p>
            <p className="text-xs mt-1">Les commandes prêtes pour la production apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {phaseOrders.map(order => {
              const currentProdPhase = getProdPhase(order)
              const phaseIdx = PHASES.findIndex(p => p.id === currentProdPhase)
              const currentIdx = PHASES.findIndex(p => p.id === activePhase)
              const isInThisPhase = phaseIdx === currentIdx
              const isExpanded = expandedId === order.id

              return (
                <div key={order.id}
                  className={`bg-white/[0.03] rounded-xl border transition-all cursor-pointer ${isExpanded ? 'border-amber-500/30 shadow-lg' : isInThisPhase ? 'border-white/5 hover:border-white/10 hover:shadow-sm' : 'border-white/5 opacity-40'}`}>
                  <div className={`px-4 py-3 border-b ${isExpanded ? 'border-amber-500/20' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold font-mono text-gray-200">{order.serialNumber}</span>
                      {isInThisPhase && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                      {phaseIdx > currentIdx && <span className="text-xs font-bold text-emerald-400">✅ Terminé</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{order.clientName} — {order.clientCity}</p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Phase actuelle</span>
                      <span className={`font-semibold ${PHASES[phaseIdx]?.textColor}`}>{PHASES[phaseIdx]?.icon} {PHASES[phaseIdx]?.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Motorisation</span>
                      <span className="text-gray-200 font-semibold">{order.typeMotorisation}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-2">
                      <div className={`h-full rounded-full bg-gradient-to-r ${currentPhase.color}`} style={{ width: `${((phaseIdx + 1) / PHASES.length) * 100}%` }} />
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="w-full py-1.5 mt-1 rounded-lg text-xs font-semibold bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] transition-all">
                      {isExpanded ? '▲ Réduire' : '▼ Détails'}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                        <FileManager orderId={order.id} engineerName={session?.name || 'Production'} compact />
                        {isInThisPhase && phaseIdx < PHASES.length - 1 && (
                          <button onClick={() => advancePhase(order.id, order)}
                            className="w-full py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-400 shadow-md transition-all">
                            ➡️ Passer à {PHASES[phaseIdx + 1]?.icon} {PHASES[phaseIdx + 1]?.label}
                          </button>
                        )}
                        <button onClick={() => { setSelectedOrder(order); setShowFiche(true) }}
                          className="w-full py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all">
                          📄 Fiche Technique
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <footer className="flex-shrink-0 bg-white/[0.04] border-t border-white/5 px-6 py-2 flex items-center justify-between text-[10px] text-gray-500">
        <span>RMASC Factory — Production & Atelier v2.6</span>
        <span>{orders.length} commandes • ⌘K Recherche • ⌘I Agent</span>
      </footer>
      <InstallPWA variant="compact" />
      {showAgent && <AgentPanel onClose={() => setShowAgent(false)} />}
      {showSmartSearch && <SmartSearch onNavigate={() => setShowSmartSearch(false)} />}
    </PageBackground>
  )
}
