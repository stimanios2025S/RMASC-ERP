import { useState, useEffect, useCallback } from 'react'
import FicheTechniqueView from './FicheTechniqueView'
import FileViewer from './FileViewer'
import type { PortalSession } from '../data/portalUsers'
import { apiFetch, apiPath } from '../config/api'
import { addUpload, getUploads } from '../config/runtime-store'

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

async function fetchJson(path: string, opts?: RequestInit) {
  return apiFetch(path, opts)
}

interface Props {
  onBack?: () => void
  forcedTab?: string
  session?: PortalSession
}

const ENGINEER_PAGES = [
  {
    id: 'ingenieur-1',
    icon: '📐',
    title: 'Ingénieur Dessinateur 1',
    subtitle: 'Plan d\'Installation Technique',
    status: 'ATTENTE_DESSIN_TECH',
    nextStatus: 'ATTENTE_APPROBATION_ADMIN',
    nextLabel: '📤 Envoyer le Plan à l\'Admin',
    fileLabel: "Plan d'Installation",
    color: 'from-sky-500 to-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
  },
  {
    id: 'ingenieur-2',
    icon: '✏️',
    title: 'Ingénieur Dessinateur 2',
    subtitle: 'Dessin 2D Cabine',
    status: 'ATTENTE_DESSIN_2D',
    nextStatus: 'ATTENTE_VERIFICATION',
    nextLabel: '✏️ Envoyer le Dessin 2D (Vérification)',
    fileLabel: 'Dessin 2D de la Cabine',
    color: 'from-violet-500 to-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
  {
    id: 'verificateur',
    icon: '🔍',
    title: 'Vérificateur en Chef',
    subtitle: 'Contrôle Final & Approbation',
    status: 'ATTENTE_VERIFICATION',
    nextStatus: 'PRET_POUR_PRODUCTION',
    nextLabel: '🏭 Soumettre à la Production',
    fileLabel: '',
    color: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
  {
    id: 'pret-prod',
    icon: '🏭',
    title: 'Atelier de Production',
    subtitle: 'Commandes prêtes pour la fabrication',
    status: 'PRET_POUR_PRODUCTION',
    nextStatus: null,
    nextLabel: null,
    fileLabel: '',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
]

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    BROUILLON: 'bg-slate-100 text-slate-600', ATTENTE_DESSIN_TECH: 'bg-sky-100 text-sky-700',
    ATTENTE_APPROBATION_ADMIN: 'bg-amber-100 text-amber-700', ATTENTE_DESSIN_2D: 'bg-violet-100 text-violet-700',
    ATTENTE_VERIFICATION: 'bg-rose-100 text-rose-700', PRET_POUR_PRODUCTION: 'bg-emerald-100 text-emerald-700',
    VALIDEE: 'bg-emerald-100 text-emerald-700', ANNULEE: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    BROUILLON: 'Brouillon', ATTENTE_DESSIN_TECH: 'Plan Installation', ATTENTE_APPROBATION_ADMIN: 'Approbation Admin',
    ATTENTE_DESSIN_2D: 'Dessin 2D', ATTENTE_VERIFICATION: 'Vérification', PRET_POUR_PRODUCTION: 'Prêt Production',
    VALIDEE: 'Validée', ANNULEE: 'Annulée',
  }
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-500'}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"/> {labels[status] || status}</span>
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short' })
}
const fmtFullDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function BureauEtudeWorkspace({ onBack, forcedTab, session }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([])
  const [activeEngineer, setActiveEngineer] = useState(forcedTab || 'dashboard')
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [fileDropped, setFileDropped] = useState<Record<string, { name: string; size: number }>>({})
  const [showFiche, setShowFiche] = useState(false)
  const [showFile, setShowFile] = useState(false)
  const [fileIndex, setFileIndex] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<{ msg: string; time: string; orderId: string; serial: string }[]>([])

  const currentPage = ENGINEER_PAGES.find(p => p.id === activeEngineer)

  // ── Build notifications from order activity ─────────────────────────────
  const buildNotifications = useCallback((orders: OrderRow[], files: VaultFile[]) => {
    const notifs: { msg: string; time: string; orderId: string; serial: string }[] = []
    for (const o of orders) {
      const orderFiles = files.filter(f => f.orderId === o.id)
      if (orderFiles.length > 0) {
        notifs.push({
          msg: `📄 ${orderFiles.length} fichier(s) uploadé(s) pour ${o.serialNumber}`,
          time: orderFiles.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0].uploadedAt,
          orderId: o.id,
          serial: o.serialNumber,
        })
      }
      if (o.status === 'ATTENTE_APPROBATION_ADMIN') {
        notifs.push({
          msg: `📐 Plan d'Installation soumis pour ${o.serialNumber} — ${o.clientName}`,
          time: o.createdAt,
          orderId: o.id,
          serial: o.serialNumber,
        })
      }
      if (o.status === 'PRET_POUR_PRODUCTION') {
        notifs.push({
          msg: `🏭 Commande ${o.serialNumber} prête pour la production`,
          time: o.createdAt,
          orderId: o.id,
          serial: o.serialNumber,
        })
      }
      if (o.status === 'VALIDEE') {
        notifs.push({
          msg: `✅ Commande ${o.serialNumber} livrée et archivée`,
          time: o.createdAt,
          orderId: o.id,
          serial: o.serialNumber,
        })
      }
    }
    setNotifications(notifs.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 20))
  }, [])

  const handleFileDrop = useCallback(async (orderId: string, file: File) => {
    setFileDropped(prev => ({ ...prev, [orderId]: { name: file.name, size: file.size } }))
    const reader = new FileReader()
    reader.onload = () => {
      addUpload(orderId, {
        data: reader.result as string,
        name: file.name,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        label: '',
      })
      // Also add to vault files
      try {
        const vaultRaw = JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')
        vaultRaw.push({
          id: 'f_' + Date.now(),
          orderId,
          fileName: file.name,
          engineer: session?.name || 'Ingénieur',
          uploadedAt: new Date().toISOString(),
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: file.type,
        })
        localStorage.setItem('rmasc_vault_files', JSON.stringify(vaultRaw))
        setVaultFiles(vaultRaw)
      } catch {}
    }
    reader.readAsDataURL(file)
  }, [session])

  const loadOrders = useCallback(async () => {
    try {
      const data: OrderRow[] = await apiFetch('/orders')
      setOrders(data)
      if (selectedOrder) {
        const fresh = data.find(o => o.id === selectedOrder.id)
        if (fresh) setSelectedOrder(fresh)
      }
    } catch { console.error('[PLM] load failed') }
  }, [selectedOrder])

  // ── Load vault files ────────────────────────────────────────────────────
  const loadVault = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')
      setVaultFiles(raw)
    } catch {}
  }, [])

  useEffect(() => { loadOrders(); loadVault() }, [])
  useEffect(() => { if (orders.length || vaultFiles.length) buildNotifications(orders, vaultFiles) }, [orders, vaultFiles])

  // ── Auto-refresh ─────────────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => { loadOrders(); loadVault() }, 8_000)
    const onFocus = () => { loadOrders(); loadVault() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadOrders(); loadVault() } })
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [loadOrders, loadVault])

  const advanceStatus = async (orderId: string, status: string, msg: string) => {
    try {
      setUploading(true)
      await apiFetch(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setFeedback({ ok: true, msg })
      loadOrders()
    } catch (err: any) { setFeedback({ ok: false, msg: err.message }) }
    finally { setUploading(false); setTimeout(() => setFeedback(null), 4000) }
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = {
    total: orders.length,
    planInstallation: orders.filter(o => o.status === 'ATTENTE_DESSIN_TECH').length,
    dessin2D: orders.filter(o => o.status === 'ATTENTE_DESSIN_2D').length,
    verification: orders.filter(o => o.status === 'ATTENTE_VERIFICATION').length,
    approbation: orders.filter(o => o.status === 'ATTENTE_APPROBATION_ADMIN').length,
    pretProd: orders.filter(o => o.status === 'PRET_POUR_PRODUCTION').length,
    validees: orders.filter(o => o.status === 'VALIDEE').length,
    fichiers: vaultFiles.length,
    ingenieurs: [...new Set(vaultFiles.map(f => f.engineer))].length,
  }

  // ── Per-engineer stats ──────────────────────────────────────────────────
  const engineerStats = [
    { id: 'ingenieur-1', label: 'Ing. Dessinateur 1', icon: '📐', count: kpis.planInstallation, color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'ingenieur-2', label: 'Ing. Dessinateur 2', icon: '✏️', count: kpis.dessin2D, color: 'text-violet-600', bg: 'bg-violet-50' },
    { id: 'verificateur', label: 'Vérificateur', icon: '🔍', count: kpis.verification, color: 'text-rose-600', bg: 'bg-rose-50' },
  ]

  const myOrders = currentPage ? orders.filter(o => o.status === currentPage.status) : []

  const fileDropZone = (orderId: string) => (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileDrop(orderId, f) }}
      onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '*/*'; i.onchange = (ev: any) => { const f = ev.target?.files?.[0]; if (f) handleFileDrop(orderId, f) }; i.click() }}
      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
        fileDropped[orderId] ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-surface-50 hover:border-slate-400 hover:bg-slate-100'
      }`}>
      {fileDropped[orderId] ? (
        <p className="text-sm text-emerald-600 font-semibold">✅ {fileDropped[orderId].name}</p>
      ) : (
        <><p className="text-sm font-semibold text-slate-600 mb-1">📂 Déposer le fichier ici</p><p className="text-xs text-slate-400">Tous les formats acceptés</p></>
      )}
    </div>
  )

  // Fiche overlay
  if (showFiche && selectedOrder) {
    return <div className="fixed inset-0 z-50 bg-surface-50 overflow-y-auto"><FicheTechniqueView orderId={selectedOrder.id} onBack={() => setShowFiche(false)} /></div>
  }

  return (
    <div className="h-full flex flex-col bg-surface-50">
      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md"><span className="text-white text-lg">📐</span></div>
            <div><h1 className="text-lg font-extrabold text-slate-800">Bureau d'Études</h1>
            <p className="text-[11px] text-slate-400 font-medium">PLM — Portails Ingénieurs & Suivi</p></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Notifications bell */}
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 relative">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center ring-2 ring-white">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
            {/* Notifications panel */}
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-96 bg-surface-50 rounded-2xl shadow-2xl border border-slate-200 max-h-96 overflow-y-auto">
                  <div className="sticky top-0 bg-surface-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
                    <h3 className="text-xs font-bold text-slate-700">Notifications</h3>
                    <span className="text-[10px] text-slate-400">{notifications.length} alerte{notifications.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-2 space-y-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-3 text-center">Aucune notification</p>
                    ) : (
                      notifications.map((n, i) => (
                        <div key={i} className="px-3 py-2 rounded-xl hover:bg-slate-50 transition-all">
                          <p className="text-xs font-medium text-slate-700">{n.msg}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{fmtFullDate(n.time)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          {session && !forcedTab && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-slate-600">{session.name}</span>
            </div>
          )}
          <button onClick={() => { loadOrders(); loadVault() }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <span className="text-xs text-slate-400 font-medium">{orders.length} commandes</span>
        </div>
      </header>

      {/* ── Engineer Tabs ── */}
      {!forcedTab ? (
        <div className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 py-0 flex gap-0">
          <button onClick={() => { setActiveEngineer('dashboard'); setSelectedOrder(null) }}
            className={`flex items-center gap-2.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeEngineer === 'dashboard' ? 'border-slate-800 text-slate-800 bg-surface-50' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <span>📊</span>
            <span>Tableau de Bord</span>
          </button>
          {ENGINEER_PAGES.map(page => {
            const count = orders.filter(o => o.status === page.status).length
            const isActive = activeEngineer === page.id
            return (
              <button key={page.id} onClick={() => { setActiveEngineer(page.id); setSelectedOrder(null) }}
                className={`flex items-center gap-2.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                  isActive ? 'border-slate-800 text-slate-800 bg-surface-50' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                <span>{page.icon}</span>
                <span>{page.title}</span>
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 py-2.5">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${currentPage!.color} flex items-center justify-center text-white shadow-sm`}>
              <span className="text-sm">{currentPage!.icon}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{session?.name || currentPage!.title}</p>
              <p className="text-xs text-slate-400">{currentPage!.subtitle}</p>
            </div>
            {session && (
              <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-slate-600">{session.userId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Feedback toast ── */}
      {feedback && (
        <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${feedback.ok ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' : 'bg-amber-50 text-amber-700 border-b border-amber-100'}`}>
          <span>{feedback.ok ? '✅' : '⚠️'}</span> {feedback.msg}
          <button onClick={() => setFeedback(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          COMPREHENSIVE DASHBOARD — Tables, History & Documents
          ══════════════════════════════════════════════════════════════════════ */}
      {activeEngineer === 'dashboard' && !forcedTab ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* KPI Row */}
            <div className="grid grid-cols-6 gap-4">
              {[
                { label: 'Total Commandes', value: kpis.total, icon: '📋', color: 'text-slate-800' },
                { label: 'Plan Installation', value: kpis.planInstallation, icon: '📐', color: 'text-sky-600' },
                { label: 'Dessin 2D', value: kpis.dessin2D, icon: '✏️', color: 'text-violet-600' },
                { label: 'Vérification', value: kpis.verification, icon: '🔍', color: 'text-rose-600' },
                { label: 'Prêt Production', value: kpis.pretProd, icon: '🏭', color: 'text-emerald-600' },
                { label: 'Fichiers', value: kpis.fichiers, icon: '📁', color: 'text-primary-600' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-surface-50 rounded-xl p-4 shadow-card border border-gray-50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-lg">{kpi.icon}</div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Master Orders Table with Documents */}
            <div className="bg-surface-50 rounded-2xl shadow-card border border-gray-50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">📋 Historique Complet des Commandes</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">{kpis.total} commandes</span>
                  <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-semibold">{kpis.fichiers} fichiers</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">N° Série</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Client</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Motorisation</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Statut Actuel</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Documents</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Dernière Activité</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-sm text-gray-400 italic">Aucune commande.</td>
                      </tr>
                    ) : (
                      orders.map(order => {
                        const orderFiles = vaultFiles.filter(f => f.orderId === order.id)
                        const lastFile = orderFiles.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0]
                        const lastActivity = lastFile?.uploadedAt || order.createdAt
                        return (
                          <tr key={order.id} className="hover:bg-primary-50/30 transition-colors">
                            <td className="px-6 py-3">
                              <span className="text-sm font-bold font-mono text-gray-800">{order.serialNumber}</span>
                            </td>
                            <td className="px-6 py-3">
                              <p className="text-sm font-semibold text-gray-700">{order.clientName}</p>
                              <p className="text-[10px] text-gray-400">{order.clientCity}</p>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-xs font-medium text-gray-600">{order.typeMotorisation}</span>
                            </td>
                            <td className="px-6 py-3">
                              <StatusBadge status={order.status} />
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{orderFiles.length > 0 ? '📄' : '—'}</span>
                                <span className="text-xs font-semibold text-gray-600">
                                  {orderFiles.length > 0 ? `${orderFiles.length} fichier${orderFiles.length > 1 ? 's' : ''}` : 'Aucun'}
                                </span>
                              </div>
                              {orderFiles.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {orderFiles.slice(0, 3).map(f => (
                                    <span key={f.id} className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{f.fileName.length > 15 ? f.fileName.slice(0, 12) + '…' : f.fileName}</span>
                                  ))}
                                  {orderFiles.length > 3 && <span className="text-[8px] text-gray-400">+{orderFiles.length - 3} autres</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${lastActivity ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                                <span className="text-xs text-gray-400 font-mono">{fmtFullDate(lastActivity)}</span>
                              </div>
                              {lastFile && <p className="text-[9px] text-gray-400 mt-0.5">{lastFile.fileName}</p>}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => { setSelectedOrder(order); setShowFiche(true) }}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">📄 Fiche</button>
                                <button onClick={() => { setSelectedOrder(order); setFileIndex(0); setShowFile(true) }}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-all">Fichiers</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Document History Table — All Files */}
            <div className="bg-surface-50 rounded-2xl shadow-card border border-gray-50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">📁 Tous les Fichiers & Documents — Historique</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">{kpis.fichiers} documents</span>
                  <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-semibold">{kpis.ingenieurs} ingénieurs</span>
                </div>
              </div>
              {vaultFiles.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400 italic">Aucun document uploadé.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Fichier</th>
                        <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Ingénieur</th>
                        <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Commande</th>
                        <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Client</th>
                        <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Date Upload</th>
                        <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Taille</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {vaultFiles.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).map(f => {
                        const o = orders.find(o => o.id === f.orderId)
                        return (
                          <tr key={f.id} className="hover:bg-primary-50/30 transition-colors">
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="text-base">{f.type === 'application/pdf' ? '📄' : '📐'}</span>
                                <span className="text-sm font-semibold text-gray-800">{f.fileName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-[9px] font-bold text-primary-600">
                                  {f.engineer.split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <span className="text-xs text-gray-600">{f.engineer}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-xs font-mono font-semibold text-gray-700">{o?.serialNumber || '—'}</span>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-xs text-gray-500">{o?.clientName || '—'}</span>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-xs text-gray-400 font-mono">{fmtFullDate(f.uploadedAt)}</span>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <span className="text-xs text-gray-500 font-mono">{f.size}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notifications Activity Feed */}
            <div className="bg-surface-50 rounded-2xl p-5 shadow-card border border-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-800">🔔 Fil d'Activité Général</h3>
                <span className="text-[10px] text-gray-400">{notifications.length} événement{notifications.length > 1 ? 's' : ''}</span>
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucune activité récente.</p>
              ) : (
                <div className="space-y-1">
                  {notifications.map((n, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-sm flex-shrink-0">
                        {n.msg.includes('📄') ? '📄' : n.msg.includes('📐') ? '📐' : n.msg.includes('🏭') ? '🏭' : '✅'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700">{n.msg}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-gray-400">{fmtFullDate(n.time)}</span>
                          <span className="text-[9px] text-gray-300">•</span>
                          <span className="text-[9px] font-mono text-gray-400">{n.serial}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : currentPage ? (
        /* ══════════════════════════════════════════════════════════════════
           ENGINEER PAGE VIEW
           ══════════════════════════════════════════════════════════════════ */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">{currentPage.icon} {currentPage.title}</h2>
              <p className="text-sm text-slate-400">{currentPage.subtitle} • {myOrders.length} commande{myOrders.length !== 1 ? 's' : ''} assignée{myOrders.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {myOrders.length === 0 ? (
            <div className="bg-surface-50 rounded-2xl border border-slate-200 p-12 text-center">
              <span className="text-4xl block mb-3">📭</span>
              <p className="text-sm font-semibold text-slate-500">Aucune commande assignée</p>
              <p className="text-xs text-slate-400 mt-1">Les commandes apparaîtront ici automatiquement.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {myOrders.map(order => (
                <div key={order.id} onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                  className={`bg-surface-50 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedOrder?.id === order.id ? 'border-slate-800 shadow-lg' : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'
                  }`}>
                  <div className={`px-4 py-3 border-b ${selectedOrder?.id === order.id ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold font-mono text-slate-800">{order.serialNumber}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{order.clientName} — {order.clientCity}</p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <span className="text-slate-400">Gaine:</span>
                      <span className="text-slate-700 font-semibold text-right">{order.largeurGaineMm}×{order.profondeurGaineMm} mm</span>
                      <span className="text-slate-400">Motorisation:</span>
                      <span className="text-slate-700 font-semibold text-right">{order.typeMotorisation}</span>
                    </div>
                    {selectedOrder?.id === order.id && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                        {currentPage.fileLabel && fileDropZone(order.id)}
                        {currentPage.nextLabel && currentPage.nextStatus && (
                          <button onClick={() => advanceStatus(order.id, currentPage.nextStatus!, currentPage.nextLabel!.replace(/^[^\s]+\s/, ''))}
                            disabled={uploading}
                            className="w-full py-2.5 rounded-lg text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md disabled:opacity-50 transition-all">
                            {currentPage.nextLabel}
                          </button>
                        )}
                        <button onClick={() => { setFileIndex(0); setShowFile(true) }}
                          className="w-full py-1.5 rounded-lg text-xs font-semibold bg-surface-50 text-slate-600 hover:bg-slate-100 transition-all">
                          👁️ Voir les fichiers uploadés
                        </button>
                        <button onClick={() => { setSelectedOrder(order); setShowFiche(true) }}
                          className="w-full py-1.5 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">
                          📄 Fiche Technique
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ── File Viewer Modal ── */}
      {showFile && selectedOrder && (() => {
        const allUploads: { data: string; name: string; type: string }[] = getUploads(selectedOrder.id)
        const currentFile = allUploads[fileIndex] || null
        const isStamped = ['ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION', 'PRET_POUR_PRODUCTION'].includes(selectedOrder.status)
        return (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
            <div className="bg-[#0a0f1a] rounded-2xl border border-slate-700 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-3 bg-[#111827] border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">{selectedOrder.serialNumber}</span>
                  {isStamped && <span className="text-xs font-bold text-red-400 bg-red-950/50 px-2 py-0.5 rounded">✅ Approuvé</span>}
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs text-slate-300">{allUploads.length} fichier{allUploads.length > 1 ? 's' : ''}</span>
                </div>
                <button onClick={() => setShowFile(false)} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-all">✕ Fermer</button>
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
                {currentFile ? (
                  <FileViewer fileData={currentFile.data} fileName={currentFile.name} fileType={currentFile.type} stampApproved={isStamped} stampDate={new Date().toLocaleDateString('fr-FR')} stampBy="Admin RMASC" />
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

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 bg-surface-50 border-t border-slate-200 px-6 py-2 flex items-center justify-between text-[10px] text-slate-400">
        <span>RMASC Factory — Bureau d'Études PLM v2.5.2</span>
        <span>{orders.filter(o => o.status === 'PRET_POUR_PRODUCTION').length} prêtes pour la production • {vaultFiles.length} fichiers</span>
      </footer>
    </div>
  )
}
