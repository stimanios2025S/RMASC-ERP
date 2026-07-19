// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Private Engineer Portal
//  Portails Ingénieur 1, Ingénieur 2 & Vérificateur
//  Design : Glassmorphism — textes blancs hiérarchisés
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import FicheTechniqueView from './FicheTechniqueView'
import type { PortalSession } from '../data/portalUsers'
import { apiFetch } from '../config/api'
import { getUploads } from '../config/runtime-store'
import { PageBackground } from './PageBackground'
import InstallPWA from './InstallPWA'
import FileManager from './FileManager'
import AgentPanel from './agent/AgentPanel'
import SmartSearch from './smart/SmartSearch'
import ArchiveOrders from './ArchiveOrders'
import PiecesSoloWorkspace from './PiecesSoloWorkspace'

// ─── Types ─────────────────────────────────────────────────────────────────
interface OrderRow {
  id: string; serialNumber: string; clientName: string; clientCity: string
  typeMotorisation: string; status: string; createdAt: string
  largeurGaineMm: string; profondeurGaineMm: string; hauteurGaineMm: string
  materiauCabine: string | null; materiauPortes: string | null
  rejectionReason?: string | null; rejectedBy?: string | null; rejectedAt?: string | null
  _count: { cadSubmissions: number }
}
interface VaultFile { id: string; orderId: string; fileName: string; engineer: string; uploadedAt: string; size: string; type: string }
interface Props { onBack?: () => void; session: PortalSession; role: string }

// ─── Configuration des rôles ──────────────────────────────────────────────
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

type IngenieurTab = 'dashboard' | 'archive' | 'gestion-docs' | 'archives' | 'pieces-solo'
const TAB_CONFIG: { id: IngenieurTab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '📊', label: 'Tableau de Bord' },
  { id: 'archive', icon: '📦', label: 'Archive' },
  { id: 'gestion-docs', icon: '📁', label: 'Gestion Docs' },
  { id: 'archives', icon: '📚', label: 'Archives' },
  { id: 'pieces-solo', icon: '🔧', label: 'Pièces Solo' },
]

// ─── Status Badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    BROUILLON: 'bg-white/10 text-white', ATTENTE_DESSIN_TECH: 'bg-sky-500/20 text-sky-300',
    ATTENTE_APPROBATION_ADMIN: 'bg-amber-500/20 text-amber-300', ATTENTE_DESSIN_2D: 'bg-violet-500/20 text-violet-300',
    ATTENTE_VERIFICATION: 'bg-rose-500/20 text-rose-300', PRET_POUR_PRODUCTION: 'bg-emerald-500/20 text-emerald-300',
    EN_LIVRAISON: 'bg-cyan-500/20 text-cyan-300', LIVREE: 'bg-emerald-500/15 text-emerald-300',
    VALIDEE: 'bg-emerald-500/15 text-emerald-300', ANNULEE: 'bg-red-500/15 text-red-300',
  }
  const labels: Record<string, string> = {
    BROUILLON: 'Brouillon', ATTENTE_DESSIN_TECH: 'Plan Installation', ATTENTE_APPROBATION_ADMIN: 'Approbation Admin',
    ATTENTE_DESSIN_2D: 'Dessin 2D', ATTENTE_VERIFICATION: 'Vérification', PRET_POUR_PRODUCTION: 'Prêt Production',
    EN_LIVRAISON: 'En Livraison', LIVREE: 'Livrée', VALIDEE: 'Validée', ANNULEE: 'Annulée',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-white/10 ${colors[status] || 'bg-white/10 text-white'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {labels[status] || status}
    </span>
  )
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short' })

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
  const [showFiche, setShowFiche] = useState(false)
  const [showAgent, setShowAgent] = useState(false)
  const [showSmartSearch, setShowSmartSearch] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSmartSearch(p => !p) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); setShowAgent(p => !p) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const flash = (ok: boolean, msg: string) => { setFeedback({ ok, msg }); setTimeout(() => setFeedback(null), 4000) }

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
      flash(true, msg)
      loadOrders()
    } catch (err: any) { flash(false, err.message) }
    finally { setUploading(false) }
  }

  const myOrders = orders.filter(o => o.status === config.status)
  const filteredOrders = orders.filter(o => !searchTerm || o.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) || o.clientName.toLowerCase().includes(searchTerm.toLowerCase()))

  if (showFiche && selectedOrder) {
    return <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto"><FicheTechniqueView orderId={selectedOrder.id} onBack={() => setShowFiche(false)} /></div>
  }

  // ── Render: Header ─────────────────────────────────────────────────────
  const renderHeader = () => (
    <header className="flex-shrink-0 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg shadow-${config.color.split(' ')[0]}/20`}>
          <span className="text-white text-lg">{config.icon}</span>
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-white tracking-tight">{config.title}</h1>
          <p className="text-[11px] text-white/60 font-medium mt-0.5">
            {config.subtitle} · <span className="text-amber-400 font-bold">{myOrders.length}</span> commande{myOrders.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setShowAgent(p => !p)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
            showAgent ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20' : 'bg-white/10 hover:bg-white/15 text-white/70 hover:text-white'
          }`} title="Assistant IA Salim (⌘I)">
          <span className="text-base">🤖</span>
        </button>
        <span className="text-xs font-semibold text-white/80 bg-white/10 px-3 py-1.5 rounded-lg">{session.name}</span>
      </div>
    </header>
  )

  // ── Render: Tabs ───────────────────────────────────────────────────────
  const renderTabs = () => (
    <div className="flex-shrink-0 bg-white/[0.03] border-b border-white/10 px-6 flex gap-0 overflow-x-auto">
      {TAB_CONFIG.map(t => {
        if (t.id === 'pieces-solo' && role !== 'INGENIEUR_2') return null
        const isActive = tab === t.id
        const badge = t.id === 'dashboard' ? myOrders.length : t.id === 'gestion-docs' ? vaultFiles.length : 0
        return (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm md:text-base font-bold border-b-2 transition-all whitespace-nowrap ${
              isActive ? 'border-amber-400 text-white' : 'border-transparent text-white/50 hover:text-white/80 hover:border-white/20'
            }`}>
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            {badge > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isActive ? 'bg-amber-500 text-white' : 'bg-white/15 text-white/80'}`}>
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  // ── Render: Order Card ─────────────────────────────────────────────────
  const renderOrderCard = (order: OrderRow) => {
    const isExpanded = selectedOrder?.id === order.id
    const orderFiles = vaultFiles.filter(f => f.orderId === order.id)
    return (
      <div key={order.id} className="glass-card overflow-hidden transition-all duration-200">
        <div onClick={() => setSelectedOrder(isExpanded ? null : order)}
          className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-all">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30 animate-pulse-soft" />
            <div>
              <p className="text-sm font-bold text-white font-mono">{order.serialNumber}</p>
              <p className="text-xs text-white/50 mt-0.5">{order.clientName} — {order.clientCity}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <svg className={`w-4 h-4 text-white/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {order.rejectionReason && (
          <div className="mx-5 mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="text-red-400 text-sm mt-0.5">❌</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-red-400">Plan rejeté par {order.rejectedBy || 'Administrateur'}</p>
                <p className="text-xs text-red-300/90 mt-1">{order.rejectionReason}</p>
                {order.rejectedAt && <p className="text-[10px] text-red-400/60 mt-1">{new Date(order.rejectedAt).toLocaleString('fr-FR')}</p>}
              </div>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="px-5 pb-5 border-t border-white/10 pt-4 space-y-3">
            <FileManager orderId={order.id} engineerName={session?.name || config.title} compact />
            <button onClick={() => advanceStatus(order.id, config.nextStatus, '✅ ' + config.nextLabel.replace(/^[^\s]+\s/, ''))}
              disabled={uploading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500/90 to-orange-600/90 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
              {uploading ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block mr-2" /> Envoi...</> : config.nextLabel}
            </button>
            <button onClick={() => { setSelectedOrder(order); setShowFiche(true) }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-[0.98]">
              📄 Fiche Technique
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Render: File list (read-only for Archive tab) ──────────────────────
  const renderFileList = (files: VaultFile[]) => (
    <div className="space-y-1.5">
      {files.map((f) => (
        <div key={f.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/5 hover:bg-white/[0.06] transition-all group">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-lg">{f.type?.includes('pdf') ? '📄' : (f.type?.includes('dwg') || f.type?.includes('image') ? '📐' : '📎')}</span>
            <div className="min-w-0">
              <span className="text-sm font-medium text-white truncate block">{f.fileName}</span>
              <span className="text-[10px] text-white/50">{f.size} · {f.engineer}</span>
            </div>
          </div>
          <span className="text-[10px] text-white/40 hidden sm:inline">{fmtDate(f.uploadedAt)}</span>
        </div>
      ))}
    </div>
  )

  // ═════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col">
      <PageBackground className="h-full flex flex-col">
        {renderHeader()}
        {renderTabs()}

        {feedback && (
          <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-semibold flex items-center gap-2 border-b ${
            feedback.ok ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
          }`}>
            <span>{feedback.ok ? '✅' : '⚠️'}</span> {feedback.msg}
            <button onClick={() => setFeedback(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ═══ DASHBOARD TAB ═══ */}
        {tab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-3">
              {myOrders.length === 0 ? (
                <div className="glass-card p-16 text-center">
                  <span className="text-5xl block mb-4">📭</span>
                  <h3 className="text-lg font-bold text-white">Aucune commande assignée</h3>
                  <p className="text-sm text-white/50 mt-2">
                    Les commandes au statut <span className="text-amber-400 font-semibold">{config.status.replace(/_/g, ' ')}</span> apparaîtront ici.
                  </p>
                </div>
              ) : (
                myOrders.map(renderOrderCard)
              )}
            </div>
          </div>
        )}

        {/* ═══ ARCHIVE TAB ═══ */}
        {tab === 'archive' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-extrabold text-white">📦 Archive Documentaire</h2>
                  <p className="text-sm text-white/50 mt-1">Toutes les commandes — consultable en lecture</p>
                </div>
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="🔍 Rechercher..." className="glass-input w-48 md:w-56" />
              </div>
              <div className="space-y-3">
                {filteredOrders.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <span className="text-4xl block mb-3">📭</span>
                    <p className="text-base font-bold text-white">Aucune commande trouvée</p>
                    <p className="text-sm text-white/50 mt-1">Essayez de modifier votre recherche.</p>
                  </div>
                ) : filteredOrders.map(order => {
                  const orderFiles = vaultFiles.filter(f => f.orderId === order.id)
                  const isExpanded = selectedOrder?.id === order.id
                  return (
                    <div key={order.id} className="glass-card overflow-hidden transition-all duration-200">
                      <div onClick={() => setSelectedOrder(isExpanded ? null : order)}
                        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full shadow-sm ${
                            order.status === 'LIVREE' || order.status === 'VALIDEE' ? 'bg-emerald-500 shadow-emerald-500/30' :
                            order.status === 'EN_LIVRAISON' ? 'bg-cyan-500 shadow-cyan-500/30' : 'bg-amber-500 shadow-amber-500/30'
                          }`} />
                          <div>
                            <p className="text-sm font-bold text-white font-mono">{order.serialNumber}</p>
                            <p className="text-xs text-white/50 mt-0.5">{order.clientName} — {order.clientCity}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={order.status} />
                          {orderFiles.length > 0 && (
                            <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{orderFiles.length}</span>
                          )}
                          <svg className={`w-4 h-4 text-white/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-white/10 pt-4">
                          {orderFiles.length === 0 ? (
                            <p className="text-sm text-white/50 italic py-3 text-center">Aucun document dans cette commande.</p>
                          ) : (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-3">📎 Documents ({orderFiles.length})</p>
                              {renderFileList(orderFiles)}
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

        {/* ═══ GESTION DOCUMENTS TAB ═══ */}
        {tab === 'gestion-docs' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              <div className="mb-5">
                <h2 className="text-lg font-extrabold text-white">📁 Gestion des Documents</h2>
                <p className="text-sm text-white/50 mt-1">Ajoutez ou supprimez des fichiers pour chaque commande</p>
              </div>
              <div className="space-y-3">
                {filteredOrders.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <span className="text-4xl block mb-3">📁</span>
                    <p className="text-base font-bold text-white">Aucune commande</p>
                    <p className="text-sm text-white/50 mt-1">Les commandes apparaîtront ici.</p>
                  </div>
                ) : filteredOrders.map(order => {
                  const orderFiles = vaultFiles.filter(f => f.orderId === order.id)
                  const isExpanded = selectedOrder?.id === order.id
                  return (
                    <div key={order.id} className="glass-card overflow-hidden transition-all duration-200">
                      <div onClick={() => setSelectedOrder(isExpanded ? null : order)}
                        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
                          <div>
                            <p className="text-sm font-bold text-white font-mono">{order.serialNumber}</p>
                            <p className="text-xs text-white/50 mt-0.5">{order.clientName} — {order.clientCity}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={order.status} />
                          <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{orderFiles.length}</span>
                          <svg className={`w-4 h-4 text-white/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-white/10 pt-4">
                          <FileManager orderId={order.id} orderSerial={order.serialNumber} engineerName={session?.name || config.title} onFileChange={() => loadVault()} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ ARCHIVES GLOBALES TAB ═══ */}
        {tab === 'archives' && (
          <div className="flex-1 overflow-y-auto">
            <ArchiveOrders onSelectOrder={(id) => { setShowFiche(true); apiFetch(`/orders/${id}`).then((o: any) => setSelectedOrder(o)).catch(() => {}) }} />
          </div>
        )}

        {/* ═══ PIÈCES SOLO TAB ═══ */}
        {tab === 'pieces-solo' && (
          <div className="flex-1 overflow-hidden">
            <PiecesSoloWorkspace onBack={() => setTab('dashboard')} session={session} />
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <footer className="flex-shrink-0 bg-slate-900/80 border-t border-white/10 px-6 py-2.5 flex items-center justify-between">
          <span className="text-[10px] text-white/50">RMASC — {config.title} v2.6.0</span>
          <div className="flex items-center gap-4">
            <InstallPWA variant="compact" />
            <span className="text-[10px] text-white/50">
              <span className="text-amber-400 font-bold">{orders.length}</span> commandes · <span className="text-amber-400 font-bold">{vaultFiles.length}</span> fichiers
            </span>
          </div>
        </footer>
      </PageBackground>
      {showAgent && <AgentPanel onClose={() => setShowAgent(false)} />}
      {showSmartSearch && <SmartSearch onNavigate={() => setShowSmartSearch(false)} />}
    </div>
  )
}
