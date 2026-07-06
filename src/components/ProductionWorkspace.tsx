import { useState, useEffect, useCallback } from 'react'
import FicheTechniqueView from './FicheTechniqueView'
import FileViewer from './FileViewer'
import type { PortalSession } from '../data/portalUsers'
import { apiFetch } from '../config/api'
import { getProductionPhase, setProductionPhase, getUploads } from '../config/runtime-store'
import { PageBackground } from './PageBackground'
import InstallPWA from './InstallPWA'
import FileManager from './FileManager'

interface OrderRow {
  id: string; serialNumber: string; clientName: string; clientCity: string
  typeMotorisation: string; status: string; createdAt: string
  largeurGaineMm: string; profondeurGaineMm: string; hauteurGaineMm: string
  materiauCabine: string | null; materiauPortes: string | null
  _count: { cadSubmissions: number }
}

interface Props { onBack?: () => void; session?: PortalSession }

const PHASES = [
  { id: 'decoupe', icon: '✂️', label: 'Découpe', desc: 'Découpe des tôles et profilés selon les plans techniques', color: 'from-sky-500 to-blue-600', bgColor: 'bg-sky-50', borderColor: 'border-sky-200', textColor: 'text-sky-700' },
  { id: 'pliage', icon: '🔧', label: 'Pliage', desc: 'Pliage et formage des éléments de structure', color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-700' },
  { id: 'soudeur', icon: '⚡', label: 'Soudure', desc: 'Soudure et assemblage des structures métalliques', color: 'from-violet-500 to-violet-600', bgColor: 'bg-violet-50', borderColor: 'border-violet-200', textColor: 'text-violet-700' },
  { id: 'peinture', icon: '🎨', label: 'Peinture', desc: 'Application des revêtements et finitions', color: 'from-rose-500 to-rose-600', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', textColor: 'text-rose-700' },
  { id: 'assemblage', icon: '🔩', label: 'Assemblage', desc: 'Assemblage final des sous-ensembles', color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-700' },
  { id: 'emballage', icon: '📦', label: 'Emballage', desc: 'Emballage et protection pour le transport', color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700' },
  { id: 'livraison', icon: '🚛', label: 'Livraison', desc: 'Transport, installation sur site client et confirmation de réception', color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', textColor: 'text-cyan-700' },
]

function getProdPhase(orderId: string): string {
  return getProductionPhase(orderId)
}
function setProdPhase(orderId: string, phase: string) {
  setProductionPhase(orderId, phase)
}

export default function ProductionWorkspace({ onBack, session }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [activePhase, setActivePhase] = useState('decoupe')
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [showFiche, setShowFiche] = useState(false)
  const [showFile, setShowFile] = useState(false)
  const [fileIndex, setFileIndex] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      const data: OrderRow[] = await apiFetch('/orders')
      setOrders(data.filter(o => ['PRET_POUR_PRODUCTION', 'VALIDEE'].includes(o.status)))
    } catch { console.error('[PROD] load failed') }
  }, [])

  useEffect(() => { loadOrders() }, [])
  // ── Auto-refresh: every 8s + on window focus + visibility change ───────
  useEffect(() => {
    const iv = setInterval(loadOrders, 8_000)
    const onFocus = () => loadOrders()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loadOrders() })
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [loadOrders])

  // Fiche overlay (early return)
  if (showFiche && selectedOrder) {
    return <div className="fixed inset-0 z-50 bg-surface-50 overflow-y-auto"><FicheTechniqueView orderId={selectedOrder.id} onBack={() => setShowFiche(false)} /></div>
  }

  const currentPhase = PHASES.find(p => p.id === activePhase)!
  const phaseOrders = orders.filter(o => {
    const p = getProdPhase(o.id)
    const phaseIdx = PHASES.findIndex(x => x.id === p)
    const currentIdx = PHASES.findIndex(x => x.id === activePhase)
    return phaseIdx >= currentIdx || (activePhase === 'decoupe' && p === 'decoupe')
  })

  const advancePhase = async (orderId: string) => {
    const current = getProdPhase(orderId)
    const idx = PHASES.findIndex(p => p.id === current)
    if (idx < PHASES.length - 1) {
      const nextPhase = PHASES[idx + 1].id
      setProdPhase(orderId, nextPhase)
      setExpandedId(null)
      setOrders([...orders])
      // Sync to backend
      try {
        await apiFetch(`/orders/${orderId}/production-phase`, {
          method: 'PATCH',
          body: JSON.stringify({ productionPhase: nextPhase }),
        })
        // When moving to livraison, mark order as ready for delivery
        if (nextPhase === 'livraison') {
          await apiFetch(`/orders/${orderId}/mark-delivery`, { method: 'POST' })
        }
      } catch { /* silent — local state already updated */ }
    }
  }

  return (
    <PageBackground className="h-full flex flex-col">
      <header className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md"><span className="text-white text-lg">🏭</span></div>
            <div><h1 className="text-lg font-extrabold text-slate-800">Production & Atelier</h1>
            <p className="text-[11px] text-slate-400 font-medium">{orders.length} commandes en production</p></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-slate-600">{session.name}</span>
            </div>
          )}
          <button onClick={loadOrders} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </header>

      {/* Phase tabs */}
      <div className="flex-shrink-0 bg-surface-50 border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-0 px-4">
          {PHASES.map(phase => {
            const isActive = activePhase === phase.id
            const count = orders.filter(o => getProdPhase(o.id) === phase.id).length
            return (
              <button key={phase.id} onClick={() => { setActivePhase(phase.id); setSelectedOrder(null); setExpandedId(null) }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive ? 'border-slate-800 text-slate-800 bg-surface-50' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                <span>{phase.icon}</span>
                <span>{phase.label}</span>
                {count > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Phase description */}
      <div className={`flex-shrink-0 px-6 py-3 ${currentPhase.bgColor} border-b ${currentPhase.borderColor}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${currentPhase.color} flex items-center justify-center text-white shadow-sm`}>{currentPhase.icon}</div>
          <div>
            <p className="text-sm font-bold text-slate-800">{currentPhase.label}</p>
            <p className="text-xs text-slate-500">{currentPhase.desc}</p>
          </div>
        </div>
      </div>

      {/* Orders grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {phaseOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <span className="text-5xl mb-4">📭</span>
            <p className="text-sm font-medium">Aucune commande dans cette phase</p>
            <p className="text-xs mt-1">Les commandes prêtes pour la production apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {phaseOrders.map(order => {
              const currentProdPhase = getProdPhase(order.id)
              const phaseIdx = PHASES.findIndex(p => p.id === currentProdPhase)
              const currentIdx = PHASES.findIndex(p => p.id === activePhase)
              const isInThisPhase = phaseIdx === currentIdx
              const isExpanded = expandedId === order.id

              return (
                <div key={order.id}
                  className={`bg-surface-50 rounded-xl border-2 transition-all cursor-pointer ${
                    isExpanded ? 'border-slate-800 shadow-lg' : isInThisPhase ? 'border-slate-200 hover:border-slate-400 hover:shadow-sm' : 'border-slate-100 opacity-40'
                  }`}>
                  <div className={`px-4 py-3 border-b ${isExpanded ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold font-mono text-slate-800">{order.serialNumber}</span>
                      {isInThisPhase && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                      {phaseIdx > currentIdx && <span className="text-xs font-bold text-emerald-600">✅ Terminé</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{order.clientName} — {order.clientCity}</p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Phase actuelle</span>
                      <span className={`font-semibold ${PHASES[phaseIdx]?.textColor}`}>{PHASES[phaseIdx]?.icon} {PHASES[phaseIdx]?.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Motorisation</span>
                      <span className="text-slate-700 font-semibold">{order.typeMotorisation}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
                      <div className={`h-full rounded-full bg-gradient-to-r ${currentPhase.color}`} style={{ width: `${((phaseIdx + 1) / PHASES.length) * 100}%` }} />
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="w-full py-1.5 mt-1 rounded-lg text-xs font-semibold bg-surface-50 text-slate-600 hover:bg-slate-100 transition-all">
                      {isExpanded ? '▲ Réduire' : '▼ Détails'}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                        <FileManager orderId={order.id} engineerName={session?.name || 'Production'} compact />
                        {isInThisPhase && phaseIdx < PHASES.length - 1 && (
                          <button onClick={() => advancePhase(order.id)}
                            className="w-full py-2 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 shadow-md transition-all">
                            ➡️ Passer à {PHASES[phaseIdx + 1]?.icon} {PHASES[phaseIdx + 1]?.label}
                          </button>
                        )}
                        <button onClick={() => { setSelectedOrder(order); setFileIndex(0); setShowFile(true) }}
                          className="w-full py-1.5 rounded-lg text-xs font-semibold bg-surface-50 text-slate-600 hover:bg-slate-100 transition-all">
                          👁️ Voir les plans techniques
                        </button>
                        <button onClick={() => { setSelectedOrder(order); setShowFiche(true) }}
                          className="w-full py-1.5 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">
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

      {/* File Viewer Modal — shows all uploaded documents */}
      {showFile && selectedOrder && (() => {
        const allUploads: { data: string; name: string; type: string; uploadedAt: string }[] = (() => {
          return getUploads(selectedOrder.id)
        })()
        const currentFile = allUploads[fileIndex] || null

        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
            <div className="bg-[#0a0f1a] rounded-2xl border border-slate-700 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              {/* Title bar */}
              <div className="flex items-center justify-between px-5 py-3 bg-[#111827] border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">{selectedOrder.serialNumber}</span>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-300">{allUploads.length} fichier{allUploads.length > 1 ? 's' : ''}</span>
                </div>
                <button onClick={() => setShowFile(false)} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold">✕ Fermer</button>
              </div>

              {/* File tabs */}
              {allUploads.length > 1 && (
                <div className="flex gap-1 px-4 pt-3 pb-0 bg-[#0d1520] border-b border-slate-700 flex-shrink-0">
                  {allUploads.map((f, i) => (
                    <button key={i} onClick={() => setFileIndex(i)}
                      className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-all ${
                        fileIndex === i ? 'bg-[#0a0f1a] text-white border border-slate-700 border-b-transparent' : 'text-slate-400 hover:text-white bg-slate-800/50'
                      }`}>
                      {f.name.length > 20 ? f.name.slice(0, 18) + '…' : f.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Viewer */}
              <div className="flex-1 overflow-hidden">
                {currentFile ? (
                  <FileViewer fileData={currentFile.data} fileName={currentFile.name} fileType={currentFile.type} stampApproved />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <span className="text-5xl mb-4">📁</span>
                    <p className="text-sm font-medium">Aucun fichier disponible</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      <footer className="flex-shrink-0 bg-surface-50 border-t border-slate-200 px-6 py-2 flex items-center justify-between text-[10px] text-slate-400">
        <span>RMASC Factory — Production & Atelier v2.5.2</span>
        <span>{orders.length} commandes en production</span>
      </footer>
      <InstallPWA variant="compact" />
    </PageBackground>
  )
}
