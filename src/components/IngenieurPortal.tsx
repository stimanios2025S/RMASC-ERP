// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Private Engineer Portal
//  Each role (Ing 1, Ing 2, Verif) gets its own isolated workspace with:
//    • Tableau de Bord  — their assigned orders
//    • Archive          — all orders with documents (read-only)
//    • Gestion Docs     — upload / delete files on any order
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import FicheTechniqueView from './FicheTechniqueView'
import FileViewer from './FileViewer'
import type { PortalSession } from '../data/portalUsers'
import { apiFetch } from '../config/api'
import { addUpload, getUploads } from '../config/runtime-store'
import { PageBackground } from './PageBackground'
import InstallPWA from './InstallPWA'

interface OrderRow {
  id: string; serialNumber: string; clientName: string; clientCity: string
  typeMotorisation: string; status: string; createdAt: string
  largeurGaineMm: string; profondeurGaineMm: string; hauteurGaineMm: string
  materiauCabine: string | null; materiauPortes: string | null
  _count: { cadSubmissions: number }
}

interface VaultFile { id: string; orderId: string; fileName: string; engineer: string; uploadedAt: string; size: string; type: string }

interface Props { onBack?: () => void; session: PortalSession; role: string }

const ROLE_CONFIG: Record<string, { icon: string; title: string; subtitle: string; status: string; nextStatus: string; nextLabel: string; color: string }> = {
  INGENIEUR_1: {
    icon: '📐', title: 'Ingénieur Dessinateur 1', subtitle: "Plan d'Installation Technique",
    status: 'ATTENTE_DESSIN_TECH', nextStatus: 'ATTENTE_APPROBATION_ADMIN', nextLabel: "📤 Envoyer le Plan à l'Admin",
    color: 'from-sky-500 to-sky-600',
  },
  INGENIEUR_2: {
    icon: '✏️', title: 'Ingénieur Dessinateur 2', subtitle: 'Dessin 2D Cabine',
    status: 'ATTENTE_DESSIN_2D', nextStatus: 'ATTENTE_VERIFICATION', nextLabel: '✏️ Envoyer le Dessin 2D (Vérification)',
    color: 'from-violet-500 to-violet-600',
  },
  VERIFICATEUR: {
    icon: '🔍', title: 'Vérificateur en Chef', subtitle: 'Contrôle Final & Approbation',
    status: 'ATTENTE_VERIFICATION', nextStatus: 'PRET_POUR_PRODUCTION', nextLabel: '🏭 Soumettre à la Production',
    color: 'from-rose-500 to-rose-600',
  },
}

type IngenieurTab = 'dashboard' | 'archive' | 'gestion-docs'

const TAB_CONFIG: { id: IngenieurTab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '📊', label: 'Tableau de Bord' },
  { id: 'archive', icon: '📦', label: 'Archive' },
  { id: 'gestion-docs', icon: '📁', label: 'Gestion des Documents' },
]

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    BROUILLON: 'bg-slate-100 text-slate-600', ATTENTE_DESSIN_TECH: 'bg-sky-100 text-sky-700',
    ATTENTE_APPROBATION_ADMIN: 'bg-amber-100 text-amber-700', ATTENTE_DESSIN_2D: 'bg-violet-100 text-violet-700',
    ATTENTE_VERIFICATION: 'bg-rose-100 text-rose-700', PRET_POUR_PRODUCTION: 'bg-emerald-100 text-emerald-700',
    EN_LIVRAISON: 'bg-cyan-100 text-cyan-700', LIVREE: 'bg-emerald-100 text-emerald-700',
    VALIDEE: 'bg-emerald-100 text-emerald-700', ANNULEE: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    BROUILLON: 'Brouillon', ATTENTE_DESSIN_TECH: 'Plan Installation', ATTENTE_APPROBATION_ADMIN: 'Approbation Admin',
    ATTENTE_DESSIN_2D: 'Dessin 2D', ATTENTE_VERIFICATION: 'Vérification', PRET_POUR_PRODUCTION: 'Prêt Production',
    EN_LIVRAISON: 'En Livraison', LIVREE: 'Livrée', VALIDEE: 'Validée', ANNULEE: 'Annulée',
  }
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-500'}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"/> {labels[status] || status}</span>
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short' })
const fmtFull = (iso: string) => new Date(iso).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function IngenieurPortal({ onBack, session, role }: Props) {
  const config = ROLE_CONFIG[role]
  const [tab, setTab] = useState<IngenieurTab>('dashboard')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploading, setUploading] = useState(false)
  const [fileDropped, setFileDropped] = useState<Record<string, { name: string; size: number }>>({})
  const [showFiche, setShowFiche] = useState(false)
  const [showFile, setShowFile] = useState(false)
  const [fileIndex, setFileIndex] = useState(0)

  const showFeedback = (ok: boolean, msg: string) => { setFeedback({ ok, msg }); setTimeout(() => setFeedback(null), 4000) }

  const loadOrders = useCallback(async () => {
    try { setOrders(await apiFetch('/orders')) } catch {}
  }, [])

  const loadVault = useCallback(() => {
    try { setVaultFiles(JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')) } catch {}
  }, [])

  useEffect(() => { loadOrders(); loadVault() }, [])
  useEffect(() => {
    const iv = setInterval(() => { loadOrders(); loadVault() }, 8000)
    const onFocus = () => { loadOrders(); loadVault() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadOrders(); loadVault() } })
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [loadOrders, loadVault])

  const advanceStatus = async (orderId: string, status: string, msg: string) => {
    try {
      setUploading(true)
      await apiFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      showFeedback(true, msg)
      loadOrders()
    } catch (err: any) { showFeedback(false, err.message) }
    finally { setUploading(false) }
  }

  const handleFileDrop = useCallback(async (orderId: string, file: File) => {
    setFileDropped(prev => ({ ...prev, [orderId]: { name: file.name, size: file.size } }))
    const reader = new FileReader()
    reader.onload = () => {
      addUpload(orderId, { data: reader.result as string, name: file.name, type: file.type, uploadedAt: new Date().toISOString() })
      try {
        const raw = JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')
        raw.push({ id: 'f_' + Date.now(), orderId, fileName: file.name, engineer: session?.name || 'Ingénieur', uploadedAt: new Date().toISOString(), size: (file.size / 1024).toFixed(1) + ' KB', type: file.type })
        localStorage.setItem('rmasc_vault_files', JSON.stringify(raw))
        setVaultFiles(raw)
      } catch {}
    }
    reader.readAsDataURL(file)
  }, [session])

  const deleteVaultFile = useCallback((fileId: string) => {
    try {
      const raw: VaultFile[] = JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')
      const updated = raw.filter(f => f.id !== fileId)
      localStorage.setItem('rmasc_vault_files', JSON.stringify(updated))
      setVaultFiles(updated)
      showFeedback(true, '✅ Fichier supprimé')
    } catch { showFeedback(false, '⚠️ Erreur') }
  }, [])

  // ── My assigned orders ─────────────────────────────────────────────
  const myOrders = orders.filter(o => o.status === config.status)
  const filteredOrders = orders.filter(o => !searchTerm || o.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) || o.clientName.toLowerCase().includes(searchTerm.toLowerCase()))

  if (showFiche && selectedOrder) {
    return <div className="fixed inset-0 z-50 bg-surface-50 overflow-y-auto"><FicheTechniqueView orderId={selectedOrder.id} onBack={() => setShowFiche(false)} /></div>
  }

  // ── Header ─────────────────────────────────────────────────────────
  function renderHeader() {
    return (
      <header className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-md`}><span className="text-white text-lg">{config.icon}</span></div>
            <div><h1 className="text-lg font-extrabold text-slate-800">{config.icon} {config.title}</h1><p className="text-[11px] text-slate-400 font-medium">{config.subtitle} — {myOrders.length} commande{myOrders.length !== 1 ? 's' : ''}</p></div>
          </div>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded">{session.name}</span>
      </header>
    )
  }

  function renderTabs() {
    return (
      <div className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 flex gap-0">
        {TAB_CONFIG.map(t => {
          const isActive = tab === t.id
          const badge = t.id === 'dashboard' ? myOrders.length : t.id === 'gestion-docs' ? vaultFiles.length : 0
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${isActive ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {badge > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{badge}</span>}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <PageBackground className="h-full flex flex-col">
        {renderHeader()}
        {renderTabs()}

        {/* Feedback */}
        {feedback && (
          <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${feedback.ok ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' : 'bg-amber-50 text-amber-700 border-b border-amber-100'}`}>
            <span>{feedback.ok ? '✅' : '⚠️'}</span> {feedback.msg}
            <button onClick={() => setFeedback(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: TABLEAU DE BORD */}
        {/* ════════════════════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              {myOrders.length === 0 ? (
                <div className="bg-surface-50 rounded-2xl border border-slate-200 p-16 text-center">
                  <span className="text-5xl block mb-4">📭</span>
                  <h3 className="text-base font-bold text-slate-700">Aucune commande assignée</h3>
                  <p className="text-sm text-slate-400 mt-1">Les commandes au statut <strong>{config.status.replace(/_/g, ' ')}</strong> apparaîtront ici.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myOrders.map(order => {
                    const isExpanded = selectedOrder?.id === order.id
                    const orderFiles = vaultFiles.filter(f => f.orderId === order.id)
                    return (
                      <div key={order.id} className="bg-surface-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div onClick={() => setSelectedOrder(isExpanded ? null : order)}
                          className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            <div>
                              <p className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</p>
                              <p className="text-xs text-slate-500">{order.clientName} — {order.clientCity}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={order.status} />
                            {orderFiles.length > 0 && <span className="text-xs text-slate-400">{orderFiles.length} fichier{orderFiles.length > 1 ? 's' : ''}</span>}
                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-2.5">
                            {/* Drop zone */}
                            <div onDragOver={e => e.preventDefault()}
                              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileDrop(order.id, f) }}
                              onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '*/*'; i.onchange = (ev: any) => { const f = ev.target?.files?.[0]; if (f) handleFileDrop(order.id, f) }; i.click() }}
                              className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${fileDropped[order.id] ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-surface-50 hover:border-slate-400 hover:bg-slate-100'}`}>
                              {fileDropped[order.id] ? <p className="text-sm text-emerald-600 font-semibold">✅ {fileDropped[order.id].name}</p>
                                : <><p className="text-sm font-semibold text-slate-600 mb-1">📂 Déposer le fichier</p><p className="text-xs text-slate-400">PDF, DWG, images — glissez ou cliquez</p></>}
                            </div>
                            {/* Advance button */}
                            <button onClick={() => advanceStatus(order.id, config.nextStatus, '✅ ' + config.nextLabel.replace(/^[^\s]+\s/, ''))}
                              disabled={uploading}
                              className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 shadow-sm disabled:opacity-50 transition-all">
                              {config.nextLabel}
                            </button>
                            {/* View files */}
                            <button onClick={() => { setFileIndex(0); setShowFile(true) }}
                              className="w-full py-2 rounded-lg text-xs font-semibold bg-surface-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all">
                              👁️ Voir les fichiers uploadés ({orderFiles.length})
                            </button>
                            {/* Fiche technique */}
                            <button onClick={() => { setSelectedOrder(order); setShowFiche(true) }}
                              className="w-full py-2 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-100 transition-all">
                              📄 Fiche Technique
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: ARCHIVE */}
        {/* ════════════════════════════════════════════════════════════ */}
        {tab === 'archive' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">📦 Archive Documentaire</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Toutes les commandes — consultable en lecture</p>
                </div>
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="🔍 Rechercher..." className="w-56 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
              <div className="space-y-3">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-sm text-slate-400">Aucune commande.</div>
                ) : filteredOrders.map(order => {
                  const orderFiles = vaultFiles.filter(f => f.orderId === order.id)
                  const isExpanded = selectedOrder?.id === order.id
                  return (
                    <div key={order.id} className="bg-surface-50 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                      <div onClick={() => setSelectedOrder(isExpanded ? null : order)}
                        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${order.status === 'LIVREE' || order.status === 'VALIDEE' ? 'bg-emerald-500' : order.status === 'EN_LIVRAISON' ? 'bg-cyan-500' : 'bg-amber-500'}`} />
                          <div>
                            <p className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</p>
                            <p className="text-xs text-slate-500">{order.clientName} — {order.clientCity}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={order.status} />
                          {orderFiles.length > 0 && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{orderFiles.length} fichier{orderFiles.length > 1 ? 's' : ''}</span>}
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                      {isExpanded && orderFiles.length > 0 && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">📎 Documents ({orderFiles.length})</p>
                          <div className="space-y-1.5">
                            {orderFiles.map((f, fi) => (
                              <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 hover:bg-slate-100 transition-all group">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span>{f.type.includes('pdf') ? '📄' : (f.type.includes('dwg') || f.type.includes('image') ? '📐' : '📎')}</span>
                                  <div className="min-w-0">
                                    <span className="text-sm font-medium text-slate-700 truncate block">{f.fileName}</span>
                                    <span className="text-[10px] text-slate-400">{f.size} • {f.engineer}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-[10px] text-slate-400 hidden sm:inline">{fmtDate(f.uploadedAt)}</span>
                                  <button onClick={(e) => {
                                    e.stopPropagation()
                                    // Find the matching upload data for this file
                                    const all = getUploads(order.id)
                                    const idx = all.findIndex(u => u.name === f.fileName)
                                    if (idx >= 0) { setFileIndex(idx); setShowFile(true) }
                                    else { // Fallback: direct download using vault data
                                      const a = document.createElement('a')
                                      a.download = f.fileName
                                      a.click()
                                    }
                                  }}
                                    className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-semibold transition-all flex items-center gap-1"
                                    title="Télécharger / Voir">
                                    ⬇️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {isExpanded && orderFiles.length === 0 && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                          <p className="text-xs text-slate-400 italic">Aucun document dans cette commande.</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TAB: GESTION DOCUMENTS */}
        {/* ════════════════════════════════════════════════════════════ */}
        {tab === 'gestion-docs' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-4">
                <h2 className="text-lg font-extrabold text-slate-800">📁 Gestion des Documents</h2>
                <p className="text-sm text-slate-400 mt-0.5">Ajoutez ou supprimez des fichiers pour chaque commande</p>
              </div>
              <div className="space-y-3">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-sm text-slate-400">Aucune commande.</div>
                ) : filteredOrders.map(order => {
                  const orderFiles = vaultFiles.filter(f => f.orderId === order.id)
                  const isExpanded = selectedOrder?.id === order.id
                  return (
                    <div key={order.id} className="bg-surface-50 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                      <div onClick={() => setSelectedOrder(isExpanded ? null : order)}
                        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50">
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <div>
                            <p className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</p>
                            <p className="text-xs text-slate-500">{order.clientName} — {order.clientCity}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={order.status} />
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{orderFiles.length} fichier{orderFiles.length > 1 ? 's' : ''}</span>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                          {/* Upload zone */}
                          <div onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileDrop(order.id, f) }}
                            onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '*/*'; i.onchange = (ev: any) => { const f = ev.target?.files?.[0]; if (f) handleFileDrop(order.id, f) }; i.click() }}
                            className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all bg-surface-50 border-slate-300 hover:border-slate-400 hover:bg-slate-100">
                            <p className="text-sm font-semibold text-slate-600 mb-1">📤 Ajouter un fichier</p>
                            <p className="text-xs text-slate-400">Cliquez ou glissez-déposez</p>
                          </div>
                          {/* Existing files */}
                          {orderFiles.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-2">📋 Fichiers ({orderFiles.length})</p>
                              <div className="space-y-1.5">
                                {orderFiles.map(f => (
                                  <div key={f.id} className="flex items-center justify-between bg-surface-50 rounded-lg px-3 py-2.5 border border-slate-200 hover:border-red-200 group transition-all">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span>{f.type.includes('pdf') ? '📄' : '📐'}</span>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">{f.fileName}</p>
                                        <p className="text-[10px] text-slate-400">{f.engineer} • {f.size} • {fmtDate(f.uploadedAt)}</p>
                                      </div>
                                    </div>
                                    <button onClick={() => deleteVaultFile(f.id)}
                                      className="opacity-0 group-hover:opacity-100 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-all">🗑️ Supprimer</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
                              <p className="text-xs text-slate-400 italic">Aucun fichier. Utilisez la zone ci-dessus pour ajouter un document.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ FILE VIEWER ═══ */}
        {showFile && selectedOrder && (() => {
          const allUploads = getUploads(selectedOrder.id)
          const currentFile = allUploads[fileIndex] || null
          return (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
              <div className="bg-[#0a0f1a] rounded-2xl border border-slate-700 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-5 py-3 bg-[#111827] border-b border-slate-700 flex-shrink-0">
                  <div><span className="text-sm font-bold text-white">{selectedOrder.serialNumber}</span><span className="text-xs text-slate-400 ml-3">| {allUploads.length} fichier{allUploads.length > 1 ? 's' : ''}</span></div>
                  <button onClick={() => setShowFile(false)} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold">✕ Fermer</button>
                </div>
                {allUploads.length > 1 && (
                  <div className="flex gap-1 px-4 pt-3 pb-0 bg-[#0d1520] border-b border-slate-700 flex-shrink-0">
                    {allUploads.map((f, i) => (
                      <button key={i} onClick={() => setFileIndex(i)}
                        className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-all ${fileIndex === i ? 'bg-[#0a0f1a] text-white border border-slate-700 border-b-transparent' : 'text-slate-400 hover:text-white bg-slate-800/50'}`}>
                        {f.name.length > 20 ? f.name.slice(0, 18) + '…' : f.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  {currentFile ? <FileViewer fileData={currentFile.data} fileName={currentFile.name} fileType={currentFile.type} />
                  : <div className="h-full flex flex-col items-center justify-center text-slate-400"><span className="text-5xl mb-4">📁</span><p className="text-sm font-medium">Aucun fichier</p></div>}
                </div>
              </div>
            </div>
          )
        })()}

        <InstallPWA variant="compact" />
        {/* ═══ FOOTER ═══ */}
        <footer className="flex-shrink-0 bg-surface-50 border-t border-slate-200 px-6 py-2 flex items-center justify-between text-[10px] text-slate-400">
          <span>RMASC — {config.title} v2.5.3</span>
          <span>{orders.length} commandes • {vaultFiles.length} fichiers</span>
        </footer>
      </PageBackground>
    </div>
  )
}
