import { useState, useEffect, useCallback } from 'react'
import FicheTechniqueView from './FicheTechniqueView'
import FileViewer from './FileViewer'
import type { PortalSession } from '../data/portalUsers'
import { apiFetch } from '../config/api'
import { addUpload, getUploads } from '../config/runtime-store'
import { PageBackground } from './PageBackground'

interface OrderRow {
  id: string; serialNumber: string; clientName: string; clientCity: string
  typeMotorisation: string; status: string; createdAt: string
  largeurGaineMm: string; profondeurGaineMm: string; hauteurGaineMm: string
  materiauCabine: string | null; materiauPortes: string | null
  _count: { cadSubmissions: number }
}

interface VaultFile {
  id: string; orderId: string; fileName: string; engineer: string; uploadedAt: string; size: string; type: string
}

interface Props { onBack?: () => void; forcedTab?: string; session?: PortalSession }

type TabId = 'dashboard' | 'ingenieur-1' | 'ingenieur-2' | 'verificateur' | 'pret-prod' | 'archive' | 'gestion-docs'

interface EngineerPage {
  id: TabId; icon: string; title: string; subtitle?: string
  status?: string; nextStatus?: string | null; nextLabel?: string | null; fileLabel?: string
  color?: string
}

const ENGINEER_PAGES: EngineerPage[] = [
  { id: 'ingenieur-1', icon: '📐', title: 'Ingénieur Dessinateur 1', subtitle: "Plan d'Installation Technique", status: 'ATTENTE_DESSIN_TECH', nextStatus: 'ATTENTE_APPROBATION_ADMIN', nextLabel: "📤 Envoyer le Plan à l'Admin", fileLabel: "Plan d'Installation", color: 'from-sky-500 to-sky-600' },
  { id: 'ingenieur-2', icon: '✏️', title: 'Ingénieur Dessinateur 2', subtitle: 'Dessin 2D Cabine', status: 'ATTENTE_DESSIN_2D', nextStatus: 'ATTENTE_VERIFICATION', nextLabel: '✏️ Envoyer le Dessin 2D (Vérification)', fileLabel: 'Dessin 2D de la Cabine', color: 'from-violet-500 to-violet-600' },
  { id: 'verificateur', icon: '🔍', title: 'Vérificateur en Chef', subtitle: 'Contrôle Final & Approbation', status: 'ATTENTE_VERIFICATION', nextStatus: 'PRET_POUR_PRODUCTION', nextLabel: '🏭 Soumettre à la Production', fileLabel: '', color: 'from-rose-500 to-rose-600' },
  { id: 'pret-prod', icon: '🏭', title: 'Atelier de Production', subtitle: 'Commandes prêtes pour la fabrication', status: 'PRET_POUR_PRODUCTION', nextStatus: null, nextLabel: null, fileLabel: '', color: 'from-emerald-500 to-emerald-600' },
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

function FileDropZone({ onDrop, uploaded }: { onDrop: (f: File) => void; uploaded?: { name: string } }) {
  return (
    <div onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onDrop(f) }}
      onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '*/*'; i.onchange = (ev: any) => { const f = ev.target?.files?.[0]; if (f) onDrop(f) }; i.click() }}
      className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${uploaded ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-surface-50 hover:border-slate-400 hover:bg-slate-100'}`}>
      {uploaded ? <p className="text-sm text-emerald-600 font-semibold">✅ {uploaded.name}</p>
        : <><p className="text-sm font-semibold text-slate-600 mb-1">📂 Déposer le fichier</p><p className="text-xs text-slate-400">Cliquez ou glissez-déposez</p></>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function BureauEtudeWorkspace({ onBack, forcedTab, session }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([])
  const [activeTab, setActiveTab] = useState<TabId>(forcedTab as TabId || 'dashboard')
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [fileDropped, setFileDropped] = useState<Record<string, { name: string; size: number }>>({})
  const [showFiche, setShowFiche] = useState(false)
  const [showFile, setShowFile] = useState(false)
  const [fileIndex, setFileIndex] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<{ msg: string; time: string; orderId: string; serial: string }[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [archiveData, setArchiveData] = useState<Record<string, { data: ArchiveData | null; loading: boolean }>>({})

  const currentPage = ENGINEER_PAGES.find(p => p.id === activeTab)

  const showFeedback = (ok: boolean, msg: string) => {
    setFeedback({ ok, msg })
    setTimeout(() => setFeedback(null), 4000)
  }

  const loadOrders = useCallback(async () => {
    try { setOrders(await apiFetch('/orders')) } catch {}
  }, [])

  const loadVault = useCallback(() => {
    try { setVaultFiles(JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')) } catch {}
  }, [])

  const buildNotifications = useCallback((orders: OrderRow[], files: VaultFile[]) => {
    const n: { msg: string; time: string; orderId: string; serial: string }[] = []
    for (const o of orders) {
      const of = files.filter(f => f.orderId === o.id)
      if (of.length) n.push({ msg: `📄 ${of.length} fichier(s) pour ${o.serialNumber}`, time: of.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0].uploadedAt, orderId: o.id, serial: o.serialNumber })
      if (o.status === 'ATTENTE_APPROBATION_ADMIN') n.push({ msg: `📐 Plan soumis: ${o.serialNumber}`, time: o.createdAt, orderId: o.id, serial: o.serialNumber })
      if (o.status === 'PRET_POUR_PRODUCTION') n.push({ msg: `🏭 ${o.serialNumber} prête pour production`, time: o.createdAt, orderId: o.id, serial: o.serialNumber })
      if (o.status === 'LIVREE') n.push({ msg: `✅ ${o.serialNumber} livrée et archivée`, time: o.createdAt, orderId: o.id, serial: o.serialNumber })
    }
    setNotifications(n.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 20))
  }, [])

  const handleFileDrop = useCallback(async (orderId: string, file: File) => {
    setFileDropped(prev => ({ ...prev, [orderId]: { name: file.name, size: file.size } }))
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = reader.result as string
      addUpload(orderId, { data: b64, name: file.name, type: file.type, uploadedAt: new Date().toISOString() })
      try {
        const raw = JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')
        const existing = raw.findIndex((x: any) => x.fileName === file.name && x.orderId === orderId)
        if (existing === -1) {
          raw.push({ id: 'f_' + Date.now(), orderId, fileName: file.name, engineer: session?.name || 'Ingénieur', uploadedAt: new Date().toISOString(), size: (file.size / 1024).toFixed(1) + ' KB', type: file.type })
          localStorage.setItem('rmasc_vault_files', JSON.stringify(raw))
        }
        setVaultFiles(raw)
        showFeedback(true, `✅ Fichier "${file.name}" enregistré`)
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
    } catch { showFeedback(false, '⚠️ Erreur lors de la suppression') }
  }, [])

  useEffect(() => { loadOrders(); loadVault() }, [])
  useEffect(() => { if (orders.length || vaultFiles.length) buildNotifications(orders, vaultFiles) }, [orders, vaultFiles])
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

  const loadArchive = async (orderId: string) => {
    setArchiveData(prev => ({ ...prev, [orderId]: { data: null, loading: true } }))
    try {
      const data = await apiFetch(`/orders/${orderId}/archive`)
      setArchiveData(prev => ({ ...prev, [orderId]: { data, loading: false } }))
    } catch {
      setArchiveData(prev => ({ ...prev, [orderId]: { data: null, loading: false } }))
    }
  }

  const kpis = {
    total: orders.length,
    planInstallation: orders.filter(o => o.status === 'ATTENTE_DESSIN_TECH').length,
    dessin2D: orders.filter(o => o.status === 'ATTENTE_DESSIN_2D').length,
    verification: orders.filter(o => o.status === 'ATTENTE_VERIFICATION').length,
    approbation: orders.filter(o => o.status === 'ATTENTE_APPROBATION_ADMIN').length,
    pretProd: orders.filter(o => o.status === 'PRET_POUR_PRODUCTION').length,
    enLivraison: orders.filter(o => o.status === 'EN_LIVRAISON').length,
    livrees: orders.filter(o => o.status === 'LIVREE').length,
    fichiers: vaultFiles.length,
    ingenieurs: [...new Set(vaultFiles.map(f => f.engineer))].length,
  }

  const myOrders = currentPage && currentPage.status ? orders.filter(o => o.status === currentPage.status) : []
  const filteredOrders = orders.filter(o => !searchTerm || o.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) || o.clientName.toLowerCase().includes(searchTerm.toLowerCase()))

  if (showFiche && selectedOrder) {
    return <div className="fixed inset-0 z-50 bg-surface-50 overflow-y-auto"><FicheTechniqueView orderId={selectedOrder.id} onBack={() => setShowFiche(false)} /></div>
  }

  const engineerTabs: { id: TabId; icon: string; label: string; badge?: number }[] = [
    { id: 'dashboard', icon: '📊', label: 'Tableau de Bord' },
    ...ENGINEER_PAGES.map(p => ({ id: p.id as TabId, icon: p.icon, label: p.title, badge: orders.filter(o => o.status === p.status).length })),
    { id: 'archive', icon: '📦', label: 'Archive', badge: kpis.livrees },
    { id: 'gestion-docs', icon: '📁', label: 'Gestion Documents', badge: kpis.fichiers },
  ]

  return (
    <PageBackground className="h-full flex flex-col">
      {/* ═══ HEADER ═══ */}
      <header className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md"><span className="text-white text-lg">📐</span></div>
            <div><h1 className="text-lg font-extrabold text-slate-800">Bureau d'Études</h1><p className="text-[11px] text-slate-400 font-medium">PLM — Portails Ingénieurs & Suivi</p></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 relative">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center ring-2 ring-white">{notifications.length > 9 ? '9+' : notifications.length}</span>}
            </button>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-96 bg-surface-50 rounded-2xl shadow-2xl border border-slate-200 max-h-96 overflow-y-auto">
                  <div className="sticky top-0 bg-surface-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
                    <h3 className="text-xs font-bold text-slate-700">Notifications</h3>
                    <span className="text-[10px] text-slate-400">{notifications.length} alerte{notifications.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-2 space-y-1">
                    {notifications.length === 0 ? <p className="text-xs text-slate-400 italic p-3 text-center">Aucune notification</p>
                    : notifications.map((n, i) => (
                      <div key={i} className="px-3 py-2 rounded-xl hover:bg-slate-50 transition-all">
                        <p className="text-xs font-medium text-slate-700">{n.msg}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{fmtFull(n.time)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          {session && <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[10px] font-semibold text-slate-600">{session.name}</span></div>}
          <span className="text-xs text-slate-400 font-medium">{orders.length} commandes</span>
        </div>
      </header>

      {/* ═══ TABS ═══ */}
      <div className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 flex gap-0 overflow-x-auto">
        {engineerTabs.map(t => {
          const isActive = activeTab === t.id
          return (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setSelectedOrder(null) }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${isActive ? 'border-slate-800 text-slate-800 bg-surface-50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <span>{t.icon}</span>
              <span className="hidden md:inline">{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{t.badge}</span>}
            </button>
          )
        })}
      </div>

      {/* ═══ FEEDBACK ═══ */}
      {feedback && (
        <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${feedback.ok ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' : 'bg-amber-50 text-amber-700 border-b border-amber-100'}`}>
          <span>{feedback.ok ? '✅' : '⚠️'}</span> {feedback.msg}
          <button onClick={() => setFeedback(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: DASHBOARD */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && !forcedTab && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              {[
                { label: 'Total', value: kpis.total, icon: '📋' },
                { label: 'Plan Installation', value: kpis.planInstallation, icon: '📐' },
                { label: 'Dessin 2D', value: kpis.dessin2D, icon: '✏️' },
                { label: 'Vérification', value: kpis.verification, icon: '🔍' },
                { label: 'Prêt Production', value: kpis.pretProd, icon: '🏭' },
                { label: 'En Livraison', value: kpis.enLivraison, icon: '🚛' },
                { label: 'Fichiers', value: kpis.fichiers, icon: '📁' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-surface-50 rounded-xl p-3 border border-slate-200 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-base">{kpi.icon}</div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-lg font-bold text-slate-800">{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Orders Table */}
            <div className="bg-surface-50 rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">📋 Historique des Commandes</h3>
                <span className="text-xs text-slate-400">{orders.length} commandes</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">N° Série</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Client</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Statut</th>
                      <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Documents</th>
                      <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-12 text-sm text-slate-400 italic">Aucune commande.</td></tr>
                    ) : orders.map(order => {
                      const orderFiles = vaultFiles.filter(f => f.orderId === order.id)
                      return (
                        <tr key={order.id} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-5 py-3"><span className="text-sm font-bold font-mono text-slate-800">{order.serialNumber}</span></td>
                          <td className="px-5 py-3"><p className="text-sm font-semibold text-slate-700">{order.clientName}</p><p className="text-[10px] text-slate-400">{order.clientCity}</p></td>
                          <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                          <td className="px-5 py-3"><span className="text-xs font-semibold">{orderFiles.length > 0 ? `📄 ${orderFiles.length}` : '—'}</span></td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => { setSelectedOrder(order); setShowFiche(true) }} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100">📄 Fiche</button>
                              <button onClick={() => { setSelectedOrder(order); setFileIndex(0); setShowFile(true) }} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-white hover:bg-slate-700">Fichiers</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: ENGINEER PAGE */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {currentPage && (activeTab === 'ingenieur-1' || activeTab === 'ingenieur-2' || activeTab === 'verificateur' || activeTab === 'pret-prod') && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">{currentPage.icon} {currentPage.title}</h2>
              <p className="text-sm text-slate-400">{currentPage.subtitle} • {myOrders.length} commande{myOrders.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {myOrders.length === 0 ? (
            <div className="bg-surface-50 rounded-2xl border border-slate-200 p-12 text-center">
              <span className="text-4xl block mb-3">📭</span><p className="text-sm font-semibold text-slate-500">Aucune commande assignée</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {myOrders.map(order => (
                <div key={order.id} onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                  className={`bg-surface-50 rounded-xl border-2 transition-all cursor-pointer ${selectedOrder?.id === order.id ? 'border-slate-800 shadow-lg' : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'}`}>
                  <div className={`px-4 py-3 border-b ${selectedOrder?.id === order.id ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold font-mono text-slate-800">{order.serialNumber}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{order.clientName} — {order.clientCity}</p>
                  </div>
                  {selectedOrder?.id === order.id && (
                    <div className="px-4 py-3 space-y-2">
                      {currentPage.fileLabel && <FileDropZone onDrop={f => handleFileDrop(order.id, f)} uploaded={fileDropped[order.id]} />}
                      {currentPage.nextLabel && currentPage.nextStatus && (
                        <button onClick={() => advanceStatus(order.id, currentPage.nextStatus!, '✅ ' + currentPage.nextLabel!.replace(/^[^\s]+\s/, ''))}
                          disabled={uploading} className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md disabled:opacity-50">{currentPage.nextLabel}</button>
                      )}
                      <button onClick={() => { setFileIndex(0); setShowFile(true) }} className="w-full py-1.5 rounded-lg text-xs font-semibold bg-surface-50 text-slate-600 hover:bg-slate-100">👁️ Voir les fichiers</button>
                      <button onClick={() => { setSelectedOrder(order); setShowFiche(true) }} className="w-full py-1.5 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100">📄 Fiche Technique</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: ARCHIVE — All orders with documents */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'archive' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">📦 Archive Documentaire</h2>
                <p className="text-sm text-slate-400 mt-0.5">Toutes les commandes — consultable par les ingénieurs</p>
              </div>
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="🔍 Rechercher par série ou client..." className="w-56 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">Aucune commande trouvée.</div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => {
                  const orderFiles = vaultFiles.filter(f => f.orderId === order.id)
                  const isExpanded = selectedOrder?.id === order.id
                  const arch = archiveData[order.id]

                  return (
                    <div key={order.id} className="bg-surface-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div onClick={() => { setSelectedOrder(isExpanded ? null : order); if (!isExpanded && !arch) loadArchive(order.id) }}
                        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${order.status === 'LIVREE' || order.status === 'VALIDEE' ? 'bg-emerald-500' : order.status === 'PRET_POUR_PRODUCTION' ? 'bg-emerald-400' : order.status === 'EN_LIVRAISON' ? 'bg-cyan-500' : 'bg-amber-500'}`} />
                          <div>
                            <p className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</p>
                            <p className="text-xs text-slate-500">{order.clientName} — {order.clientCity}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={order.status} />
                          {orderFiles.length > 0 && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">{orderFiles.length} fichier{orderFiles.length > 1 ? 's' : ''}</span>}
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                          {/* Files from local vault */}
                          {orderFiles.length > 0 && (
                            <div className="mb-4">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">📎 Fichiers attachés ({orderFiles.length})</p>
                              <div className="space-y-1.5">
                                {orderFiles.map(f => (
                                  <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span>{f.type.includes('pdf') ? '📄' : '📐'}</span>
                                      <span className="text-sm font-medium text-slate-700 truncate">{f.fileName}</span>
                                      <span className="text-[10px] text-slate-400">• {f.size}</span>
                                      <span className="text-[10px] text-slate-400">• {f.engineer}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">{fmtDate(f.uploadedAt)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* CAD Submissions from backend */}
                          {arch?.loading ? (
                            <div className="text-sm text-slate-400 italic py-2">Chargement des documents...</div>
                          ) : arch?.data?.cadSubmissions && arch.data.cadSubmissions.length > 0 ? (
                            <div className="mb-4">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">📐 Plans techniques ({arch.data.cadSubmissions.length})</p>
                              <div className="space-y-1.5">
                                {arch.data.cadSubmissions.map((cad: any) => (
                                  <div key={cad.id} className="flex items-center justify-between bg-sky-50 rounded-lg px-3 py-2 border border-sky-100">
                                    <div className="flex items-center gap-2">
                                      <span>📐</span>
                                      <span className="text-sm text-slate-700">{cad.engineeringType === 'DESSIN_TECH_1' ? "Plan d'Installation" : 'Dessin 2D Cabine'}</span>
                                      <span className="text-[10px] text-slate-400">• {cad.engineerName}</span>
                                    </div>
                                    <span className={`text-[10px] font-semibold ${cad.status === 'APPROUVE' ? 'text-emerald-600' : cad.status === 'REJETE' ? 'text-red-600' : 'text-amber-600'}`}>
                                      {cad.status === 'APPROUVE' ? '✅ Approuvé' : cad.status === 'REJETE' ? '❌ Rejeté' : '⏳ En attente'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : !arch?.loading ? (
                            <p className="text-xs text-slate-400 italic mb-4">Aucun document backend trouvé.</p>
                          ) : null}

                          {/* Quick actions */}
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                            <button onClick={() => loadArchive(order.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">🔄 Recharger</button>
                            <button onClick={() => { setSelectedOrder(order); setShowFiche(true) }} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100">📄 Fiche Technique</button>
                          </div>
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: GESTION DOCUMENTS — Upload/Delete per order */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'gestion-docs' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">📁 Gestion des Documents</h2>
              <p className="text-sm text-slate-400 mt-0.5">Ajoutez ou supprimez des fichiers pour chaque commande</p>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">Aucune commande trouvée.</div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => {
                  const orderFiles = vaultFiles.filter(f => f.orderId === order.id)
                  const isExpanded = selectedOrder?.id === order.id

                  return (
                    <div key={order.id} className="bg-surface-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div onClick={() => setSelectedOrder(isExpanded ? null : order)}
                        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <div>
                            <p className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</p>
                            <p className="text-xs text-slate-500">{order.clientName} — {order.clientCity}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={order.status} />
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">{orderFiles.length} fichier{orderFiles.length > 1 ? 's' : ''}</span>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                          {/* Upload zone */}
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-600 mb-2">📤 Ajouter un fichier</p>
                            <FileDropZone onDrop={f => handleFileDrop(order.id, f)} />
                          </div>

                          {/* Existing files with delete */}
                          {orderFiles.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-2">📋 Fichiers existants ({orderFiles.length})</p>
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
                                      className="opacity-0 group-hover:opacity-100 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-all flex items-center gap-1">
                                      🗑️ Supprimer
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
                              <p className="text-xs text-slate-400 italic">Aucun fichier pour cette commande. Utilisez la zone ci-dessus pour ajouter un document.</p>
                            </div>
                          )}
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

      {/* ═══ FILE VIEWER MODAL ═══ */}
      {showFile && selectedOrder && (() => {
        const allUploads = getUploads(selectedOrder.id)
        const currentFile = allUploads[fileIndex] || null
        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
            <div className="bg-[#0a0f1a] rounded-2xl border border-slate-700 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-3 bg-[#111827] border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">{selectedOrder.serialNumber}</span>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-300">{allUploads.length} fichier{allUploads.length > 1 ? 's' : ''}</span>
                </div>
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
                : <div className="h-full flex flex-col items-center justify-center text-slate-400"><span className="text-5xl mb-4">📁</span><p className="text-sm font-medium">Aucun fichier disponible</p></div>}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ FOOTER ═══ */}
      <footer className="flex-shrink-0 bg-surface-50 border-t border-slate-200 px-6 py-2 flex items-center justify-between text-[10px] text-slate-400">
        <span>RMASC Factory — Bureau d'Études PLM v2.5.3</span>
        <span>{kpis.pretProd} prêtes prod • {kpis.fichiers} fichiers • {kpis.ingenieurs} ingénieurs</span>
      </footer>
    </PageBackground>
  )
}
