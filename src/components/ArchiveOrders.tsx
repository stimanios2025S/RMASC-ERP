// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Multi-Portal Archive Orders View
//  Displays completed orders with ALL their files (CAD, uploaded, stock docs)
//  Fully responsive: mobile, tablet, laptop, desktop
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../config/api'

// ─── Types ─────────────────────────────────────────────────────────────────
interface ArchiveFile {
  id: string
  originalname: string
  mimetype: string
  filename: string
  size: number
  uploadedBy?: string
  uploadedAt?: string
  url: string
}

interface ArchiveCAD {
  id: string
  engineeringType: string
  engineerName: string
  status: string
  approvedAt?: string | null
  rejectionReason?: string | null
  createdAt: string
}

interface ArchiveDoc {
  id: string
  documentType: string
  documentNumber: string
  title: string
  totalTTC?: number | null
  status: string
  createdAt: string
  supplier?: { name: string } | null
}

interface ArchiveData {
  order: {
    id: string
    serialNumber: string
    clientName: string
    clientCity: string
    status: string
    typeMotorisation: string
    createdAt: string
    completedAt?: string | null
    isStamped?: boolean | null
    stampedBy?: string | null
    stampedAt?: string | null
  }
  files: ArchiveFile[]
  cadSubmissions: ArchiveCAD[]
  stockDocuments: ArchiveDoc[]
}

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
  LIVREE: 'Livrée',
  VALIDEE: 'Validée',
  ANNULEE: 'Annulée',
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

function fmtSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
}

function getFileIcon(mimetype: string): string {
  if (mimetype.includes('pdf')) return '📄'
  if (mimetype.includes('dwg') || mimetype.includes('dxf')) return '📐'
  if (mimetype.includes('image')) return '🖼️'
  if (mimetype.includes('zip') || mimetype.includes('rar')) return '📦'
  if (mimetype.includes('excel') || mimetype.includes('csv')) return '📊'
  if (mimetype.includes('word')) return '📝'
  return '📎'
}

async function downloadFile(url: string, filename: string) {
  const token = localStorage.getItem('rmasc_token')
  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Download failed')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)
  } catch {
    window.open(url, '_blank')
  }
}

// ─── Status badges ─────────────────────────────────────────────────────────
function EngineeringBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    DESSIN_TECH_1: 'bg-sky-500/20 text-sky-300',
    DESSIN_TECH_2: 'bg-sky-500/20 text-sky-300',
    MODEL_2D: 'bg-violet-500/20 text-violet-300',
    MODEL_3D: 'bg-violet-500/20 text-violet-300',
  }
  const labels: Record<string, string> = {
    DESSIN_TECH_1: 'Plan Tech 1',
    DESSIN_TECH_2: 'Plan Tech 2',
    MODEL_2D: 'Modèle 2D',
    MODEL_3D: 'Modèle 3D',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[type] || 'bg-white/10 text-white/80'}`}>
      {labels[type] || type}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ARCHIVE DETAIL PANEL — Shows order info + all files
// ═══════════════════════════════════════════════════════════════════════════
function ArchiveDetail({ data, onBack }: { data: ArchiveData; onBack: () => void }) {
  const { order, files, cadSubmissions, stockDocuments } = data

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-slate-900/80 border-b border-white/10 px-3 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button onClick={onBack}
            className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all flex-shrink-0">
            <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-extrabold text-white truncate font-mono">{order.serialNumber}</h2>
            <p className="text-[10px] md:text-[11px] text-white/60 truncate">{order.clientName} — {order.clientCity}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 md:px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[order.status] || 'bg-white/15 text-white/80'}`}>
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6">
        {/* ── Order info card ── */}
        <div className="bg-slate-800/60 rounded-xl border border-white/10 p-4 md:p-5">
          <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-3">📋 Informations commande</h3>
          <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
            <div>
              <span className="text-white/50 text-[9px] md:text-[10px] block">Motorisation</span>
              <span className="text-white font-semibold">{order.typeMotorisation}</span>
            </div>
            <div>
              <span className="text-white/50 text-[9px] md:text-[10px] block">Créée le</span>
              <span className="text-white font-semibold">{fmtDate(order.createdAt)}</span>
            </div>
            {order.completedAt && (
              <div>
                <span className="text-white/50 text-[9px] md:text-[10px] block">Terminée le</span>
                <span className="text-emerald-400 font-semibold">{fmtDate(order.completedAt)}</span>
              </div>
            )}
            {order.isStamped && (
              <div className="col-span-2">
                <span className="text-white/50 text-[9px] md:text-[10px] block">Cachet électronique</span>
                <span className="text-amber-400 font-semibold text-xs md:text-sm">✅ Apposé par {order.stampedBy} le {fmtDate(order.stampedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Files section ── */}
        <div className="bg-slate-800/60 rounded-xl border border-white/10 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60">
              📎 Fichiers ({files.length})
            </h3>
          </div>
          {files.length === 0 ? (
            <p className="text-xs md:text-sm text-white/50 italic py-4 md:py-8 text-center">Aucun fichier attaché à cette commande.</p>
          ) : (
            <div className="space-y-1.5">
              {files.map(file => (
                <div key={file.id}
                  className="flex items-center gap-2 md:gap-3 bg-white/[0.03] rounded-lg px-2 md:px-3 py-2 md:py-2.5 border border-white/5 hover:bg-white/[0.06] transition-all group">
                  <span className="text-base md:text-lg flex-shrink-0">{getFileIcon(file.mimetype)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-white truncate">{file.originalname}</p>
                    <div className="flex flex-wrap items-center gap-1 md:gap-2 text-[9px] md:text-[10px] text-white/50">
                      <span>{fmtSize(file.size)}</span>
                      {file.uploadedBy && <span className="hidden md:inline">· Par {file.uploadedBy}</span>}
                      <span className="md:hidden">· {file.uploadedBy || ''}</span>
                      <span className="hidden md:inline">· {fmtDate(file.uploadedAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => downloadFile(file.url, file.originalname)}
                    className="flex-shrink-0 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[9px] md:text-[10px] font-bold transition-all">
                    ⬇ Tél.
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CAD Submissions ── */}
        <div className="bg-slate-800/60 rounded-xl border border-white/10 p-4 md:p-5">
          <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
            📐 Soumissions CAO ({cadSubmissions.length})
          </h3>
          {cadSubmissions.length === 0 ? (
            <p className="text-xs md:text-sm text-white/50 italic py-4 text-center">Aucune soumission CAO.</p>
          ) : (
            <div className="space-y-2">
              {cadSubmissions.map(cad => (
                <div key={cad.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <EngineeringBadge type={cad.engineeringType} />
                    <span className="text-xs text-white/80">{cad.engineerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cad.status === 'APPROUVE' ? 'bg-emerald-500/20 text-emerald-400' :
                      cad.status === 'REJETE' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {cad.status === 'APPROUVE' ? '✅ Approuvé' : cad.status === 'REJETE' ? '❌ Rejeté' : '⏳ En attente'}
                    </span>
                    <span className="text-[10px] text-white/50 hidden md:inline">{fmtDate(cad.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Stock Documents ── */}
        {stockDocuments.length > 0 && (
          <div className="bg-slate-800/60 rounded-xl border border-white/10 p-4 md:p-5">
            <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
              📄 Documents Stock ({stockDocuments.length})
            </h3>
            <div className="space-y-1.5">
              {stockDocuments.map(doc => (
                <div key={doc.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-medium text-white truncate">{doc.title}</p>
                    <p className="text-[9px] md:text-[10px] text-white/50 truncate">{doc.documentNumber}{doc.supplier ? ` · ${doc.supplier.name}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {doc.totalTTC != null && <span className="text-[10px] md:text-xs font-bold text-amber-400">{doc.totalTTC.toLocaleString('fr-DZ')} DZD</span>}
                    <span className={`text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full ${
                      doc.status === 'VALIDE' ? 'bg-emerald-500/20 text-emerald-400' :
                      doc.status === 'ANNULE' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{doc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ArchiveOrders({ onSelectOrder }: { onSelectOrder?: (id: string) => void }) {
  const [orders, setOrders] = useState<ArchiveOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedArchive, setSelectedArchive] = useState<ArchiveData | null>(null)
  const [archiveLoading, setArchiveLoading] = useState(false)

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

  const loadArchiveDetail = async (orderId: string) => {
    setArchiveLoading(true)
    try {
      const data: ArchiveData = await apiFetch(`/orders/${orderId}/archive`)
      setSelectedArchive(data)
    } catch { /* silent */ }
    finally { setArchiveLoading(false) }
  }

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

  // ── Detail view ──────────────────────────────────────────────────────
  if (selectedArchive) {
    return <ArchiveDetail data={selectedArchive} onBack={() => setSelectedArchive(null)} />
  }

  // ── Loading state ────────────────────────────────────────────────────
  if (archiveLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-white/60">Chargement des archives...</p>
        </div>
      </div>
    )
  }

  // ── LIST view ────────────────────────────────────────────────────────
  return (
    <div className="p-3 md:p-6">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base md:text-lg font-extrabold text-white">📦 Archives</h2>
          <p className="text-[10px] md:text-xs text-white/60 mt-0.5">
            {orders.length} commande{orders.length !== 1 ? 's' : ''} archivée{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setLoading(true) }}
          className="h-9 px-3 rounded-xl border border-white/10 bg-slate-800/60 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-amber-500/30 w-full sm:w-auto">
          <option value="">Tous les statuts</option>
          <option value="LIVREE">Livrée</option>
          <option value="VALIDEE">Validée</option>
          <option value="ANNULEE">Annulée</option>
        </select>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, client, série ou ville..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-white/10 bg-slate-800/60 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"/>
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-sm">✕</button>}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-white/60">Chargement...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-3xl md:text-4xl block mb-3">📭</span>
          <p className="text-sm text-white/60 font-medium">
            {search ? `Aucun résultat pour "${search}"` : 'Aucune commande archivée'}
          </p>
        </div>
      ) : (
        /* Orders list */
        <div className="space-y-2">
          {filtered.map(order => (
            <div key={order.id}
              onClick={() => { onSelectOrder?.(order.id); loadArchiveDetail(order.id) }}
              className="bg-slate-800/60 rounded-xl border border-white/5 px-3 md:px-4 py-3 md:py-3.5 hover:bg-white/[0.06] transition-all cursor-pointer group">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                    <span className="text-sm font-bold font-mono text-white">{order.serialNumber}</span>
                    <span className={`text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-white/15 text-white/80'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    {order.priority === 'URGENT' && (
                      <span className="text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">🔴 Urgent</span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm font-semibold text-white/80 truncate">{order.clientName} — {order.clientCity}</p>
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-3 mt-1 text-[10px] md:text-xs text-white/60">
                    {order.projectName && <span>🏗️ {order.projectName}</span>}
                    <span>⚡ {order.typeMotorisation}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-[10px] text-white/60">Créé {fmtDate(order.createdAt)}</p>
                  {order.completedAt && <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">✅ {fmtDate(order.completedAt)}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-[10px] text-white/60 text-center mt-4">
          {search ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}` : `${orders.length} commande${orders.length > 1 ? 's' : ''}`}
        </p>
      )}
    </div>
  )
}
