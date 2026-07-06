import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../config/api'
import { addNotice, getNotices, addUpload, getUploads } from '../config/runtime-store'
import AddElevator from './AddElevator'

// ─── Types ────────────────────────────────────────────────────────────────
interface OrderRow {
  id: string
  serialNumber: string
  clientName: string
  clientEmail: string | null
  clientPhone: string
  clientCity: string
  typeMotorisation: string
  sousTypeElectrique: string | null
  vitesseMs: string | null
  nombreEtages: string | null
  status: string
  createdAt: string
  largeurGaineMm: string
  profondeurGaineMm: string
  hauteurGaineMm: string
  materiauCabine: string | null
  materiauPortes: string | null
  materiauParois: string | null
  materiauSol: string | null
  optPanoramique: boolean
  optSecours: boolean
  optAnnoncesVocales: boolean
  optCctv: boolean
  optPortesCoupeFeu: boolean
  optPanneauTactile: boolean
  _count: { cadSubmissions: number }
}

interface ArchiveData {
  order: {
    id: string
    serialNumber: string
    clientName: string
    clientCity: string
    status: string
    createdAt: string
    completedAt?: string
  }
  cadSubmissions: ArchiveCAD[]
  stockDocuments: ArchiveDoc[]
}

interface ArchiveCAD {
  id: string
  engineeringType: string
  engineerName: string
  status: string
  createdAt: string
  approvedAt?: string
  fileMimeType: string
  fileSizeBytes: number
  rejectionReason?: string
}

interface ArchiveDoc {
  id: string
  documentType: string
  documentNumber: string
  title: string
  status: string
  createdAt: string
  supplier?: { name: string }
  lines?: Array<{ item: { name: string; reference: string }; quantity: number; unitPrice: number; totalPrice: number }>
}

// ─── Status helpers ───────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  BROUILLON:               { label: 'Brouillon', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  ATTENTE_DESSIN_TECH:     { label: 'Attente Plan', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  ATTENTE_APPROBATION_ADMIN: { label: 'Approbation Admin', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ATTENTE_DESSIN_2D:       { label: 'Attente Dessin 2D', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  ATTENTE_VERIFICATION:    { label: 'Vérification', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  PRET_POUR_PRODUCTION:    { label: 'Prêt Production', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  EN_LIVRAISON:            { label: 'En Livraison', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  LIVREE:                  { label: 'Livrée', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  VALIDEE:                 { label: 'Validée', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ANNULEE:                 { label: 'Annulée', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDA(amount: number) {
  return new Intl.NumberFormat('fr-DZ', { style: 'decimal' }).format(amount) + ' DA'
}

// ─── Main Component ──────────────────────────────────────────────────────
interface Props { onBack?: () => void; onFiche?: (id: string) => void }

export default function MesCommandesPage({ onBack, onFiche }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortField, setSortField] = useState<'createdAt' | 'serialNumber'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      const data: OrderRow[] = await apiFetch('/orders')
      setOrders(data)
    } catch (err: any) {
      console.error('Failed to load orders:', err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOrders() }, [loadOrders])

  const filtered = orders
    .filter(o => filterStatus === 'all' || o.status === filterStatus)
    .filter(o => !search || o.serialNumber.toLowerCase().includes(search.toLowerCase()) || o.clientName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'createdAt') return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
      return a.serialNumber.localeCompare(b.serialNumber) * dir
    })

  const stats = {
    total: orders.length,
    actives: orders.filter(o => !['LIVREE', 'VALIDEE', 'ANNULEE'].includes(o.status)).length,
    pret: orders.filter(o => o.status === 'PRET_POUR_PRODUCTION' || o.status === 'EN_LIVRAISON').length,
    validees: orders.filter(o => o.status === 'LIVREE' || o.status === 'VALIDEE').length,
  }

  const uniqueStatuses = [...new Set(orders.map(o => o.status))]

  if (selectedOrder) {
    return (
      <OrderDetailView
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onFiche={onFiche ? () => onFiche(selectedOrder.id) : undefined}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/60 via-surface-50 to-surface-50">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-primary-50 to-surface-50 border-b border-surface-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <div>
            <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">📋 Mes Commandes</h1>
            <p className="text-[11px] text-slate-400 font-medium">{stats.total} commandes au total</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par série ou client..."
              className="w-56 px-3.5 py-2 rounded-xl bg-surface-50 border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-200" />
          </div>
        </div>
      </header>

      <div className="px-6 py-4 grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-800', bg: 'bg-surface-50 border border-slate-200' },
          { label: 'En cours', value: stats.actives, color: 'text-primary-700', bg: 'bg-primary-50 border border-primary-100' },
          { label: 'Prêts Livraison', value: stats.pret, color: 'text-cyan-700', bg: 'bg-cyan-50 border border-cyan-100' },
          { label: 'Terminées', value: stats.validees, color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-100' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl px-4 py-3 flex items-center justify-between ${kpi.bg}`}>
            <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
            <span className={`text-xl font-extrabold ${kpi.color}`}>{kpi.value}</span>
          </div>
        ))}
      </div>

      <div className="px-6 pb-3 flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'all' ? 'bg-slate-800 text-white' : 'bg-surface-50 border border-slate-200 text-slate-500 hover:bg-surface-50'}`}>
          Tous
        </button>
        {uniqueStatuses.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === s ? 'bg-slate-800 text-white' : 'bg-surface-50 border border-slate-200 text-slate-500 hover:bg-surface-50'}`}>
            {STATUS_MAP[s]?.label || s}
          </button>
        ))}
      </div>

      <div className="px-6 pb-8">
        <div className="bg-primary-50/80 rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-surface-50/50">
                {[
                  { key: 'serialNumber', label: 'N° Série' },
                  { key: 'clientName', label: 'Client' },
                  { key: 'typeMotorisation', label: 'Motorisation' },
                  { key: 'status', label: 'Statut' },
                  { key: 'createdAt', label: 'Date' },
                ].map(col => (
                  <th key={col.key}
                    onClick={() => {
                      if (col.key === 'serialNumber' || col.key === 'createdAt') {
                        if (sortField === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                        else { setSortField(col.key); setSortDir('desc') }
                      }
                    }}
                    className={`px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left ${col.key === 'serialNumber' || col.key === 'createdAt' ? 'cursor-pointer hover:text-slate-800 select-none' : ''}`}>
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortField === col.key && <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-slate-400">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-sm text-slate-400">Aucune commande trouvée.</td></tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)}
                    className={`hover:bg-primary-50/30 transition-all cursor-pointer ${order.status === 'LIVREE' ? 'bg-emerald-50/30' : order.status === 'ANNULEE' ? 'bg-red-50/20' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-700">{order.clientName}</p>
                      <p className="text-[11px] text-slate-400">{order.clientCity}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{order.typeMotorisation}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400 font-mono">{formatDate(order.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order) }}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">
                          Détails
                        </button>
                        {onFiche && (
                          <button onClick={(e) => { e.stopPropagation(); onFiche(order.id) }}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">📄</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Helper components ──────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-700">{value || '—'}</span>
    </div>
  )
}

function RowBool({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${value ? 'text-emerald-600' : 'text-slate-300'}`}>{value ? '✓' : '✗'}</span>
    </div>
  )
}

// ─── Document Archive Icon Helper ─────────────────────────────────────────
function getDocIcon(docType: string): string {
  const icons: Record<string, string> = {
    BON_COMMANDE: '📝', BON_LIVRAISON: '📦', FACTURE: '🧾',
    BON_SORTIE: '📤', INVENTAIRE: '📋',
  }
  return icons[docType] || '📄'
}

function getCadIcon(type: string): string {
  const icons: Record<string, string> = {
    DESSIN_TECH_1: '📐', DESSIN_TECH_2: '✏️', MODEL_2D: '📐', MODEL_3D: '📦',
  }
  return icons[type] || '📎'
}

function getStatusColor(status: string): string {
  if (status === 'APPROUVE' || status === 'VALIDE' || status === 'LIVREE') return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (status === 'REJETE' || status === 'ANNULE') return 'text-red-600 bg-red-50 border-red-200'
  return 'text-amber-600 bg-amber-50 border-amber-200'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    APPROUVE: 'Approuvé', EN_ATTENTE: 'En attente', REJETE: 'Rejeté',
    VALIDE: 'Validé', BROUILLON: 'Brouillon', ANNULE: 'Annulé',
  }
  return labels[status] || status
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ═════════════════════════════════════════════════════════════════════════════
//  ORDER DETAIL VIEW — with Archive Tab
// ═════════════════════════════════════════════════════════════════════════════

function OrderDetailView({ order, onBack, onFiche }: {
  order: OrderRow; onBack: () => void; onFiche?: () => void
}) {
  const [tab, setTab] = useState<'info' | 'edit' | 'production' | 'archive'>('info')
  const [noteText, setNoteText] = useState('')
  const [notices, setNotices] = useState(getNotices(order.id))
  const [noteSent, setNoteSent] = useState(false)
  const [editName, setEditName] = useState(order.clientName)
  const [editCity, setEditCity] = useState(order.clientCity)
  const [editSaving, setEditSaving] = useState(false)
  const [showFullEdit, setShowFullEdit] = useState(false)
  const [fullEditOrder, setFullEditOrder] = useState<any>(null)

  // Archive state
  const [archive, setArchive] = useState<ArchiveData | null>(null)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const loadArchive = useCallback(async () => {
    setArchiveLoading(true)
    setArchiveError(null)
    try {
      const data: ArchiveData = await apiFetch(`/orders/${order.id}/archive`)
      setArchive(data)
    } catch (err: any) {
      setArchiveError(err.message || 'Erreur de chargement de l\'archive')
    } finally {
      setArchiveLoading(false)
    }
  }, [order.id])

  useEffect(() => {
    if (tab === 'archive') loadArchive()
  }, [tab, loadArchive])

  const handleSendNote = () => {
    if (!noteText.trim()) return
    addNotice(order.id, 'Administration RMASC', noteText.trim())
    setNotices(getNotices(order.id))
    setNoteText('')
    setNoteSent(true)
    setTimeout(() => setNoteSent(false), 3000)
  }

  const handleUploadFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '*/*'
    input.onchange = (ev: any) => {
      const file = ev.target?.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          addUpload(order.id, { data: reader.result as string, name: file.name, type: file.type, uploadedAt: new Date().toISOString() })
          setNoteSent(true)
          setTimeout(() => setNoteSent(false), 3000)
        } catch { /* quota */ }
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleSaveEdit = async () => {
    setEditSaving(true)
    try {
      await apiFetch(`/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ clientName: editName, clientCity: editCity }),
      })
      setNoteSent(true)
      setTimeout(() => setNoteSent(false), 3000)
    } catch (err: any) {
      console.error('Save failed:', err.message)
    } finally { setEditSaving(false) }
  }

  // ── Uploaded files from runtime-store ──
  const uploadedFiles = getUploads(order.id)

  const docCount = (archive?.cadSubmissions?.length || 0) + (archive?.stockDocuments?.length || 0) + uploadedFiles.length

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <h2 className="text-base font-extrabold text-slate-800 font-mono">{order.serialNumber}</h2>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex items-center gap-2">
          {onFiche && (
            <button onClick={onFiche} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">
              📄 Fiche Technique
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-6 flex gap-0 overflow-x-auto">
        {[
          { key: 'info' as const, label: '📋 Informations' },
          { key: 'edit' as const, label: '✏️ Modifier & Fichiers' },
          { key: 'production' as const, label: '🏭 Production & Notifications' },
          { key: 'archive' as const, label: `📦 Archive (${docCount})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              tab === t.key ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Toast feedback */}
      {noteSent && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2 text-sm text-emerald-700 font-medium flex items-center gap-2">
          <span>✅</span> Action enregistrée
          <button onClick={() => setNoteSent(false)} className="ml-auto">✕</button>
        </div>
      )}

      {/* ═══ TAB 1: Info ═══ */}
      {tab === 'info' && (
        <div className="max-w-4xl mx-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client</p>
              <p className="text-sm font-bold text-slate-800">{order.clientName}</p>
              <p className="text-xs text-slate-500">{order.clientCity}</p>
              {order.clientEmail && <p className="text-xs text-slate-400">{order.clientEmail}</p>}
              <p className="text-xs text-slate-400">{order.clientPhone}</p>
            </div>
            <div className="bg-surface-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Motorisation</p>
              <p className="text-sm font-bold text-slate-800">{order.typeMotorisation}</p>
              <p className="text-xs text-slate-500">{order.sousTypeElectrique || '—'}</p>
              <p className="text-xs text-slate-400">{order.vitesseMs ? `${order.vitesseMs} m/s` : '—'}</p>
              <p className="text-xs text-slate-400">{order.nombreEtages ? `${order.nombreEtages} étages` : '—'}</p>
            </div>
          </div>
          <div className="bg-surface-50 rounded-xl p-4 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dimensions Gaine (mm)</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-50 rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400">Largeur</p>
                <p className="text-base font-extrabold text-slate-800">{order.largeurGaineMm}</p>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400">Profondeur</p>
                <p className="text-base font-extrabold text-slate-800">{order.profondeurGaineMm}</p>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xs text-slate-400">Hauteur</p>
                <p className="text-base font-extrabold text-slate-800">{order.hauteurGaineMm}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Matériaux</p>
              <div className="space-y-1">
                <Row label="Cabine" value={order.materiauCabine} />
                <Row label="Portes" value={order.materiauPortes} />
                <Row label="Parois" value={order.materiauParois} />
                <Row label="Sol" value={order.materiauSol} />
              </div>
            </div>
            <div className="bg-surface-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Options</p>
              <div className="space-y-1">
                <RowBool label="Panoramique" value={order.optPanoramique} />
                <RowBool label="Secours" value={order.optSecours} />
                <RowBool label="Annonces vocales" value={order.optAnnoncesVocales} />
                <RowBool label="CCTV" value={order.optCctv} />
                <RowBool label="Portes coupe-feu" value={order.optPortesCoupeFeu} />
                <RowBool label="Panneau tactile" value={order.optPanneauTactile} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: Edit ═══ */}
      {tab === 'edit' && showFullEdit && fullEditOrder ? (
        <AddElevator onBack={() => { setShowFullEdit(false); setFullEditOrder(null) }} editOrder={fullEditOrder} />
      ) : tab === 'edit' ? (
        <div className="max-w-3xl mx-auto p-6 space-y-5">
          {/* Bouton Modifier la commande complète */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg">✏️</div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Modification complète</h3>
                  <p className="text-xs text-slate-500">Modifiez toutes les informations de la commande en utilisant l'assistant complet.</p>
                </div>
              </div>
              <button onClick={async () => {
                try { const d = await apiFetch(`/orders/${order.id}`); setFullEditOrder(d); setShowFullEdit(true) }
                catch { setNoteSent(true); setTimeout(() => setNoteSent(false), 3000) }
              }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all shadow-sm flex items-center gap-2">
                ✏️ Modifier la commande
              </button>
            </div>
          </div>

          <div className="bg-surface-50 rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">✏️ Modifier les informations client</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Nom du client</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Ville</label>
                <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200" />
              </div>
            </div>
            <button onClick={handleSaveEdit} disabled={editSaving}
              className="mt-3 px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 transition-all">
              {editSaving ? '⏳ Enregistrement...' : '💾 Enregistrer les modifications'}
            </button>
          </div>

          <div className="bg-surface-50 rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">📎 Ajouter des fichiers</h3>
            <p className="text-xs text-slate-400 mb-3">Ces fichiers seront archivés avec la commande.</p>
            <button onClick={handleUploadFile}
              className="px-4 py-2.5 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 transition-all">
              📂 Choisir un fichier
            </button>
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fichiers attachés ({uploadedFiles.length})</p>
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 group hover:bg-slate-100 transition-all">
                    <span>📄</span>
                    <span className="font-medium truncate flex-1">{f.name}</span>
                    <span className="text-slate-400">{new Date(f.uploadedAt).toLocaleDateString('fr-FR')}</span>
                    <button onClick={() => { const a = document.createElement('a'); a.href = f.data; a.download = f.name; a.click() }}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] font-semibold transition-all">⬇️</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-50 rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">📢 Envoyer une notification</h3>
            <p className="text-xs text-slate-400 mb-2">Cette notification sera visible par tous les ingénieurs du Bureau d'Études.</p>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Écrivez votre message ici..." rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none" />
            <button onClick={handleSendNote} disabled={!noteText.trim()}
              className="mt-2 px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-all">
              📨 Envoyer la notification
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB 3: Production & Notifications ═══ */}
      {tab === 'production' && (
        <div className="max-w-3xl mx-auto p-6 space-y-5">
          <div className="bg-surface-50 rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">🏭 Statut Production</h3>
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={order.status} />
              {order.status === 'LIVREE' && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">✅ Livrée et terminée</span>
              )}
              {order.status === 'EN_LIVRAISON' && (
                <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-3 py-1 rounded-lg">🚛 En cours de livraison</span>
              )}
            </div>
            <div className="bg-surface-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Date de création</span>
                <span className="font-semibold text-slate-700">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-500">Motorisation</span>
                <span className="font-semibold text-slate-700">{order.typeMotorisation}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-500">Dimensions gaine</span>
                <span className="font-semibold text-slate-700">{order.largeurGaineMm}×{order.profondeurGaineMm}×{order.hauteurGaineMm} mm</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-50 rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">📋 Historique des notifications</h3>
            {notices.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucune notification envoyée pour cette commande.</p>
            ) : (
              <div className="space-y-3">
                {[...notices].reverse().map((n, i) => (
                  <div key={i} className="bg-surface-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700">{n.from}</span>
                      <span className="text-[10px] text-slate-400">{new Date(n.date).toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-slate-600">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface-50 rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">📎 Fichiers attachés</h3>
            {uploadedFiles.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucun fichier attaché.</p>
            ) : (
              uploadedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 py-2">
                  <span className="text-sm">📄</span>
                  <span className="text-sm text-slate-700">{f.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: ARCHIVE — ISO Compliant Document Repository */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {tab === 'archive' && (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">📦 Archive Documentaire</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Registre numérique complet de la commande {order.serialNumber} — conforme ISO 9001
              </p>
            </div>
            <button onClick={loadArchive} disabled={archiveLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center gap-1.5">
              🔄 Actualiser
            </button>
          </div>

          {archiveLoading ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 rounded-full border-3 border-slate-200 border-t-amber-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Chargement de l'archive...</p>
            </div>
          ) : archiveError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <span className="text-3xl mb-2 block">⚠️</span>
              <p className="text-sm text-red-700 font-medium">{archiveError}</p>
              <button onClick={loadArchive} className="mt-3 text-xs text-red-600 underline">Réessayer</button>
            </div>
          ) : !archive ? (
            <div className="text-center py-16">
              <span className="text-5xl mb-4 block">📦</span>
              <p className="text-sm text-slate-400">Cliquez sur l'onglet Archive pour charger les documents.</p>
            </div>
          ) : (
            <>
              {/* ── SECTION: Metadata header ── */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Commandes / Archive</p>
                    <h3 className="text-xl font-extrabold font-mono">{archive.order.serialNumber}</h3>
                    <p className="text-sm text-slate-300 mt-1">{archive.order.clientName} — {archive.order.clientCity}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={archive.order.status} />
                    <p className="text-[10px] text-slate-400 mt-2">Créée le {formatDate(archive.order.createdAt)}</p>
                    {archive.order.completedAt && (
                      <p className="text-[10px] text-emerald-400">Terminée le {formatDate(archive.order.completedAt)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── SECTION: Plans Techniques (CAD) ── */}
              <div className="bg-surface-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📐</span>
                    <h3 className="text-sm font-bold text-slate-800">Plans Techniques & Soumissions CAD</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{archive.cadSubmissions.length} document{archive.cadSubmissions.length > 1 ? 's' : ''}</span>
                </div>
                {archive.cadSubmissions.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-slate-400 italic">Aucune soumission CAD dans cette commande.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {archive.cadSubmissions.map(cad => (
                      <div key={cad.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-base flex-shrink-0">
                            {getCadIcon(cad.engineeringType)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {cad.engineeringType === 'DESSIN_TECH_1' ? "Plan d'Installation Technique" :
                               cad.engineeringType === 'DESSIN_TECH_2' ? 'Dessin 2D Cabine' :
                               cad.engineeringType === 'MODEL_2D' ? 'Modélisation 2D' : 'Modélisation 3D'}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>👤 {cad.engineerName}</span>
                              <span>•</span>
                              <span>📄 {cad.fileMimeType}</span>
                              <span>•</span>
                              <span>{formatBytes(cad.fileSizeBytes)}</span>
                              <span>•</span>
                              <span>{formatDate(cad.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getStatusColor(cad.status)}`}>
                          {getStatusLabel(cad.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── SECTION: Documents Stock ── */}
              {archive.stockDocuments.length > 0 && (
                <div className="bg-surface-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📄</span>
                      <h3 className="text-sm font-bold text-slate-800">Documents d'Approvisionnement</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{archive.stockDocuments.length} document{archive.stockDocuments.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {archive.stockDocuments.map(doc => (
                      <div key={doc.id} className="px-5 py-3.5 hover:bg-slate-50/50 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center text-base flex-shrink-0">
                              {getDocIcon(doc.documentType)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{doc.title}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="font-mono">{doc.documentNumber}</span>
                                <span>•</span>
                                <span>{doc.documentType.replace(/_/g, ' ')}</span>
                                <span>•</span>
                                <span>{formatDate(doc.createdAt)}</span>
                                {doc.supplier && <><span>•</span><span>{doc.supplier.name}</span></>}
                              </div>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getStatusColor(doc.status)}`}>
                            {getStatusLabel(doc.status)}
                          </span>
                        </div>
                        {doc.lines && doc.lines.length > 0 && (
                          <div className="mt-2 ml-12 pl-3 border-l-2 border-slate-200 space-y-1">
                            {doc.lines.map((line, i) => (
                              <p key={i} className="text-[10px] text-slate-500">
                                {line.item?.name || 'Article'} × {line.quantity} — {formatDA(line.totalPrice || 0)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SECTION: Fichiers attachés localement ── */}
              {uploadedFiles.length > 0 && (
                <div className="bg-surface-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📎</span>
                      <h3 className="text-sm font-bold text-slate-800">Fichiers Attachés</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{uploadedFiles.length} fichier{uploadedFiles.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="px-5 py-3 flex items-center gap-3">
                        <span className="text-base">📄</span>
                        <span className="text-sm font-medium text-slate-700">{f.name}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{new Date(f.uploadedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SECTION: Summary / ISO Compliance ── */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xl">📋</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">Registre de Conformité</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cette archive constitue le dossier numérique complet de la commande <strong>{archive.order.serialNumber}</strong>.
                      Elle regroupe l'ensemble des documents techniques, administratifs et commerciaux
                      générés tout au long du cycle de vie de l'ascenseur.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      {[
                        { label: 'Plans techniques', count: archive.cadSubmissions.length, icon: '📐' },
                        { label: 'Documents stock', count: archive.stockDocuments.length, icon: '📄' },
                        { label: 'Fichiers attachés', count: uploadedFiles.length, icon: '📎' },
                        { label: 'Total documents', count: docCount, icon: '📦' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-surface-50 rounded-xl px-3 py-2.5 text-center border border-amber-100/50">
                          <span className="text-lg block">{stat.icon}</span>
                          <p className="text-lg font-extrabold text-slate-800">{stat.count}</p>
                          <p className="text-[10px] text-slate-400">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
