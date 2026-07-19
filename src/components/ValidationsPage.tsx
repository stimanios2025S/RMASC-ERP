import { useState, useEffect } from 'react'
import FileViewer from './FileViewer'
import { apiFetch } from '../config/api'
import { getUploads } from '../config/runtime-store'
import { PageBackground } from './PageBackground'

interface OrderRow {
  id: string; serialNumber: string; clientName: string; clientCity: string
  typeMotorisation: string; status: string; createdAt: string
  largeurGaineMm: string; profondeurGaineMm: string; hauteurGaineMm: string
  materiauCabine: string | null; materiauPortes: string | null
  _count: { cadSubmissions: number }
}

interface ServerFile {
  _id: string
  originalname: string
  mimetype: string
  size: number
  uploadedBy: string
  uploadedAt: string
  filename: string
}

interface Props {
  onBack?: () => void
  onFiche?: (id: string) => void
}

type ValidationTab = 'plans' | 'livraison'

const TABS: { key: ValidationTab; icon: string; label: string; color: string }[] = [
  { key: 'plans',     icon: '📐', label: "Plans d'Installation", color: 'amber' },
  { key: 'livraison', icon: '🚚', label: 'Confirmations de Livraison', color: 'cyan' },
]

export default function ValidationsPage({ onBack, onFiche }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ValidationTab>('plans')
  const [cadOrder, setCadOrder] = useState<OrderRow | null>(null)
  const [deliveryOrder, setDeliveryOrder] = useState<OrderRow | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    try {
      const data: OrderRow[] = await apiFetch('/orders')
      setOrders(data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Auto-refresh every 6 seconds (like engineer portal) so admin sees new submissions
  useEffect(() => {
    const iv = setInterval(load, 6000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) load() })
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [])

  const pending = orders.filter(o => o.status === 'ATTENTE_APPROBATION_ADMIN')
  const pendingDelivery = orders.filter(o => o.status === 'EN_LIVRAISON')
  const delivered = orders.filter(o => o.status === 'LIVREE')
  const recent = orders.filter(o => ['ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION'].includes(o.status))

  const approvePlan = async (id: string) => {
    try {
      setSubmitting(true)
      const r = await apiFetch(`/orders/${id}/approve-plan`, { method: 'POST', body: JSON.stringify({}) })
      const stampMsg = r.stamp?.isStamped
        ? ` · 🏷️ ${r.stamp.filesStamped}/${r.stamp.filesTotal} PDF scellé(s)`
        : ''
      setActionMsg(`✅ ${r.message || 'Plan approuvé.'}${stampMsg}`)
      setCadOrder(null); load()
    } catch (err: any) { setActionMsg(`⚠️ ${err.message}`) }
    finally { setSubmitting(false); setTimeout(() => setActionMsg(null), 4000) }
  }

  const rejectPlan = async (id: string) => {
    try {
      setSubmitting(true)
      await apiFetch(`/orders/${id}/reject-plan`, { method: 'POST', body: JSON.stringify({ reason: rejectReason || 'Non spécifié' }) })
      setActionMsg('⚠️ Plan rejeté.')
      setCadOrder(null); setShowReject(false); setRejectReason(''); load()
    } catch (err: any) { setActionMsg(`⚠️ ${err.message}`) }
    finally { setSubmitting(false); setTimeout(() => setActionMsg(null), 4000) }
  }

  const confirmDelivery = async (id: string) => {
    try {
      setSubmitting(true)
      const r = await apiFetch(`/orders/${id}/confirm-delivery`, { method: 'POST', body: JSON.stringify({}) })
      setActionMsg(`✅ ${r.message || 'Livraison confirmée.'}`)
      setDeliveryOrder(null); load()
    } catch (err: any) { setActionMsg(`⚠️ ${err.message}`) }
    finally { setSubmitting(false); setTimeout(() => setActionMsg(null), 4000) }
  }

  // ── Full-screen CAD review ──
  if (cadOrder) return <CadReview order={cadOrder} onBack={() => setCadOrder(null)} onApprove={approvePlan} onReject={rejectPlan} rejectReason={rejectReason} setRejectReason={setRejectReason} showReject={showReject} setShowReject={setShowReject} submitting={submitting} actionMsg={actionMsg} setActionMsg={setActionMsg} onFiche={onFiche} />

  // ── Delivery detail view ──
  if (deliveryOrder) return <DeliveryDetail order={deliveryOrder} onBack={() => setDeliveryOrder(null)} onConfirm={confirmDelivery} submitting={submitting} actionMsg={actionMsg} setActionMsg={setActionMsg} onFiche={onFiche} />

  return (
    <PageBackground className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-800/70 border-b border-white/5 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-lg font-extrabold text-white">✅ Validations</h1>
          <span className="text-xs font-mono text-white/80 font-semibold">{pending.length + pendingDelivery.length} en attente</span>
        </div>
        {actionMsg && <span className={`text-sm font-medium ${actionMsg.includes('✅') ? 'text-emerald-400' : 'text-amber-400'}`}>{actionMsg}</span>}
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-10 bg-slate-800/70 border-b border-white/5 px-6 flex gap-0">
        {TABS.map(t => {
          const isActive = tab === t.key
          const count = t.key === 'plans' ? pending.length : pendingDelivery.length
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-base font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive ? 'border-amber-400 text-white' : 'border-transparent text-white/60 hover:text-white'
              }`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/70'
                }`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="p-6">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: PLANS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {tab === 'plans' && (
          <div>
            {loading ? (
              <div className="text-sm text-white/80 italic p-4 text-center">Chargement...</div>
            ) : pending.length === 0 ? (
              <div className="bg-slate-800/70 rounded-2xl border border-white/5 p-12 text-center">
                <span className="text-5xl block mb-4">✅</span>
                <h3 className="text-base font-bold text-white">Tous les plans sont approuvés</h3>
                <p className="text-sm text-white/80 mt-1">Aucune approbation de plan en attente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(order => (
                  <div key={order.id} className="bg-slate-800/70 rounded-xl border border-amber-500/20 p-5 flex items-center justify-between hover:shadow-md hover:border-amber-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl flex-shrink-0">📐</div>
                      <div>
                        <p className="text-sm font-bold text-white font-mono">{order.serialNumber}</p>
                        <p className="text-xs text-white">{order.clientName} <span className="text-white">—</span> {order.clientCity}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-white/80">
                          <span>{order.typeMotorisation}</span>
                          <span>•</span>
                          <span>Gaine: {order.largeurGaineMm}×{order.profondeurGaineMm}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-lg">Approbation requise</span>
                      <button onClick={() => setCadOrder(order)}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm">
                        👁️ Voir & Approuver
                      </button>
                      {onFiche && (
                        <button onClick={() => onFiche(order.id)}
                          className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] text-white hover:bg-white/[0.1] transition-all">📄</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent orders */}
            {recent.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-white mb-3">⚙️ En cours de traitement ({recent.length})</h3>
                <div className="space-y-2">
                  {recent.slice(0, 5).map(order => (
                    <div key={order.id} className="bg-slate-800/70 rounded-xl border border-white/5 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">⚙️</span>
                        <div>
                          <p className="text-xs font-bold text-white/80 font-mono">{order.serialNumber}</p>
                          <p className="text-[10px] text-white/80">{order.clientName}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-white/80 bg-white/10 px-2.5 py-1 rounded">
                        {order.status === 'ATTENTE_DESSIN_2D' ? 'Dessin 2D' : 'Vérification'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: LIVRAISON */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {tab === 'livraison' && (
          <div className="space-y-6">
            {/* EN ATTENTE DE CONFIRMATION */}
            <div>
              <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                En attente de confirmation ({pendingDelivery.length})
              </h2>

              {loading ? (
                <div className="text-sm text-white/80 italic p-4 text-center">Chargement...</div>
              ) : pendingDelivery.length === 0 ? (
                <div className="bg-slate-800/70 rounded-2xl border border-white/5 p-12 text-center">
                  <span className="text-5xl block mb-4">🚚</span>
                  <h3 className="text-base font-bold text-white">Aucune livraison en attente</h3>
                  <p className="text-sm text-white/80 mt-1">Les livraisons prêtes apparaîtront ici pour validation.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDelivery.map(order => (
                    <div key={order.id} className="bg-slate-800/70 rounded-xl border border-cyan-500/20 p-5 flex items-center justify-between hover:shadow-md hover:border-cyan-500/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-xl flex-shrink-0">🚛</div>
                        <div>
                          <p className="text-sm font-bold text-white font-mono">{order.serialNumber}</p>
                          <p className="text-xs text-white">{order.clientName} <span className="text-white">—</span> {order.clientCity}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-white/80">
                            <span>{order.typeMotorisation}</span>
                            <span>•</span>
                            <span>Gaine: {order.largeurGaineMm}×{order.profondeurGaineMm}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 rounded-lg">Prêt pour livraison</span>
                        <button onClick={() => setDeliveryOrder(order)}
                          className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-1.5">
                          ✅ Confirmer la livraison
                        </button>
                        {onFiche && (
                          <button onClick={() => onFiche(order.id)}
                            className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] text-white hover:bg-white/[0.1] transition-all">📄</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTORIQUE DES LIVRAISONS */}
            {delivered.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-3">
                  ✅ Livraisons terminées ({delivered.length})
                </h3>
                <div className="space-y-2">
                  {delivered.slice(0, 5).map(order => (
                    <div key={order.id} className="bg-slate-800/70 rounded-xl border border-emerald-500/20 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm">✅</span>
                        <div>
                          <p className="text-xs font-bold text-white/80 font-mono">{order.serialNumber}</p>
                          <p className="text-[10px] text-white/80">{order.clientName} — {order.clientCity}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded">Livrée</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageBackground>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAD REVIEW OVERLAY — Server-backed file viewer
// ═══════════════════════════════════════════════════════════════════════════

function CadReview({ order, onBack, onApprove, onReject, rejectReason, setRejectReason, showReject, setShowReject, submitting, actionMsg, setActionMsg, onFiche }: {
  order: OrderRow; onBack: () => void; onApprove: (id: string) => void; onReject: (id: string) => void
  rejectReason: string; setRejectReason: (v: string) => void; showReject: boolean; setShowReject: (v: boolean) => void
  submitting: boolean; actionMsg: string | null; setActionMsg: (v: string | null) => void; onFiche?: (id: string) => void
}) {
  const [files, setFiles] = useState<ServerFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<ServerFile | null>(null)
  const [listView, setListView] = useState(true)
  // Blob URL for the selected file (auth-fetched via API)
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null)

  // Fetch files list from server on mount
  useEffect(() => {
    (async () => {
      try {
        const data: { files: ServerFile[] } = await apiFetch(`/orders/${order.id}/files`)
        setFiles(data.files || [])
        // Auto-select first PDF if available
        const firstPdf = (data.files || []).find(f => f.mimetype === 'application/pdf')
        if (firstPdf) { setSelectedFile(firstPdf); setListView(false) }
      } catch {}
      finally { setFilesLoading(false) }
    })()
  }, [order.id])

  // When selected file changes, fetch its binary (with auth) and create blob URL
  useEffect(() => {
    if (!selectedFile) { setFileBlobUrl(null); return }
    let cancelled = false
    let currentBlobUrl: string | null = null
    const token = localStorage.getItem('rmasc_token')
    ;(async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}/files/${selectedFile._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const blob = await res.blob()
        if (!cancelled) {
          currentBlobUrl = URL.createObjectURL(blob)
          setFileBlobUrl(currentBlobUrl)
        }
      } catch {}
    })()
    return () => {
      cancelled = true
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl)
    }
  }, [selectedFile?._id])

  // Also check legacy local uploads
  const localUploads = (() => { try { return getUploads(order.id) } catch { return [] } })()

  const formatSize = (bytes: number) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / 1048576).toFixed(1)} Mo`
  }

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return d }
  }

  const downloadFile = async (f: ServerFile) => {
    try {
      const token = localStorage.getItem('rmasc_token')
      const res = await fetch(`/api/orders/${order.id}/files/${f._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = f.originalname
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {}
  }

  const getFileIcon = (mime: string) => {
    if (mime === 'application/pdf') return '📄'
    if (mime?.startsWith('image/')) return '🖼️'
    if (mime?.includes('dwg') || mime?.includes('dxf')) return '📐'
    if (mime?.includes('zip') || mime?.includes('rar')) return '🗜️'
    return '📁'
  }

  return (
    <div className="h-screen flex flex-col">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 bg-slate-800/70 border-b border-white/5 px-6 py-3.5 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h2 className="text-sm font-extrabold text-white font-mono">{order.serialNumber}</h2>
            <p className="text-[11px] text-white/80">{order.clientName} — {order.clientCity} • {order.typeMotorisation}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Toggle: file list / viewer */}
          {selectedFile && (
            <button onClick={() => { setListView(!listView); if (listView) setFileBlobUrl(null) }}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] text-white hover:bg-white/[0.12] transition-all">
              {listView ? '👁️ Voir le document' : '📋 Liste des fichiers'}
            </button>
          )}
          <button onClick={() => onApprove(order.id)} disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50 flex items-center gap-2">
            ✅ Approuver le Plan
          </button>
          <button onClick={() => setShowReject(true)} disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-md disabled:opacity-50 flex items-center gap-2">
            ❌ Rejeter
          </button>
          {onFiche && <button onClick={() => onFiche(order.id)} className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] text-white hover:bg-white/[0.1]">📄 Fiche</button>}
        </div>
      </div>

      {actionMsg && (
        <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${actionMsg.includes('✅') ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-b border-amber-500/20'}`}>
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 overflow-hidden">
        {filesLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-white/60">Chargement des fichiers...</div>
          </div>
        ) : listView || !selectedFile ? (
          /* ── FILE LIST VIEW ── */
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              {/* Section: Server files */}
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                📂 Fichiers du dossier
                <span className="text-xs font-normal text-white/60">({files.length} fichier{files.length > 1 ? 's' : ''})</span>
              </h3>

              {files.length === 0 && localUploads.length === 0 ? (
                <div className="bg-slate-800/70 rounded-2xl border border-white/5 p-12 text-center">
                  <span className="text-5xl block mb-4">📄</span>
                  <h3 className="text-base font-bold text-white">Aucun fichier trouvé</h3>
                  <p className="text-sm text-white/80 mt-1">L'ingénieur n'a pas encore déposé de fichier pour cette commande.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map(f => (
                    <div key={f._id}
                      className={`bg-slate-800/70 rounded-xl border transition-all p-4 flex items-center justify-between cursor-pointer hover:shadow-md ${
                        selectedFile?._id === f._id ? 'border-amber-500/50 bg-slate-700/70' : 'border-white/5 hover:border-white/10'
                      }`}
                      onClick={() => { setSelectedFile(f); setListView(false) }}>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-lg flex-shrink-0">
                          {getFileIcon(f.mimetype)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate max-w-[400px]">{f.originalname}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-white/60">
                            <span>📤 {f.uploadedBy || 'Ingénieur'}</span>
                            <span>📅 {formatDate(f.uploadedAt)}</span>
                            <span>📦 {formatSize(f.size)}</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px]">{f.mimetype}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedFile(f); setListView(false) }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all">
                          👁️ Voir
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); downloadFile(f) }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-all flex items-center gap-1">
                          ⬇️ Télécharger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Legacy local uploads (same-browser) */}
              {localUploads.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-2">
                    🖥️ Fichiers locaux (ce navigateur uniquement)
                    <span className="text-[10px] text-white/40">({localUploads.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {localUploads.map((u, i) => (
                      <div key={i} className="bg-slate-800/50 rounded-lg border border-white/5 p-3 flex items-center justify-between">
                        <span className="text-xs text-white/70 truncate max-w-[300px]">{u.name}</span>
                        <span className="text-[10px] text-white/40">{u.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── FILE VIEWER ── */
          <div className="h-full p-4">
            <FileViewer
              fileUrl={fileBlobUrl || undefined}
              fileName={selectedFile?.originalname}
              fileType={selectedFile?.mimetype}
            />
          </div>
        )}
      </div>

      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-[420px] border border-white/10">
            <h3 className="text-base font-bold text-white mb-3">Motif du rejet</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Décrivez la raison du rejet..." rows={3}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/80 focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"/>
            <div className="flex items-center gap-2 mt-4 justify-end">
              <button onClick={() => setShowReject(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-white/[0.06]">Annuler</button>
              <button onClick={() => onReject(order.id)} disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Confirmer le rejet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  DELIVERY DETAIL OVERLAY
// ═══════════════════════════════════════════════════════════════════════════

function DeliveryDetail({ order, onBack, onConfirm, submitting, actionMsg, setActionMsg, onFiche }: {
  order: OrderRow; onBack: () => void; onConfirm: (id: string) => void
  submitting: boolean; actionMsg: string | null; setActionMsg: (v: string | null) => void; onFiche?: (id: string) => void
}) {
  const createdAt = new Date(order.createdAt).toLocaleDateString('fr-FR')
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = async () => {
    await onConfirm(order.id)
    setConfirmed(true)
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 bg-slate-800/70 border-b border-white/5 px-6 py-3.5 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h2 className="text-sm font-extrabold text-white font-mono">{order.serialNumber}</h2>
            <p className="text-[11px] text-white/80">{order.clientName} — {order.clientCity}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onFiche && <button onClick={() => onFiche(order.id)} className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] text-white hover:bg-white/[0.1]">📄 Fiche Technique</button>}
          <button onClick={onBack} className="px-3 py-2 rounded-lg text-xs font-semibold border border-white/10 text-white hover:bg-white/[0.06]">Retour</button>
        </div>
      </div>

      {actionMsg && (
        <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${actionMsg.includes('✅') ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-b border-amber-500/20'}`}>
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {confirmed ? (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Livraison confirmée !</h2>
            <p className="text-sm text-white/80">La commande {order.serialNumber} est marquée comme livrée.</p>
            <p className="text-sm text-white/80 mt-1">Le cycle de vie de cette commande est terminé.</p>
            <button onClick={onBack}
              className="mt-6 px-6 py-2.5 rounded-xl bg-white/[0.08] text-white text-sm font-bold hover:bg-white/[0.12] transition-all">
              ← Retour aux validations
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Delivery summary card */}
            <div className="bg-slate-800/70 rounded-2xl border border-white/5 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-2xl">🚛</div>
                <div>
                  <h3 className="text-base font-bold text-white">Confirmation de Livraison</h3>
                  <p className="text-xs text-white/80">Veuillez vérifier et confirmer la livraison de cette commande.</p>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-white/10 rounded-xl p-4 space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/80">Commande</span>
                  <span className="text-sm font-bold text-white font-mono">{order.serialNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/80">Client</span>
                  <span className="text-sm font-semibold text-white">{order.clientName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/80">Ville</span>
                  <span className="text-sm font-semibold text-white">{order.clientCity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/80">Motorisation</span>
                  <span className="text-sm font-semibold text-white">{order.typeMotorisation}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/80">Date de création</span>
                  <span className="text-sm font-semibold text-white">{createdAt}</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs text-amber-400 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>En confirmant cette livraison, la commande sera marquée comme <strong>terminée</strong> dans le système et passera en cycle "Livré". Cette action est irréversible.</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleConfirm} disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-2">
                  {submitting ? '⏳ Confirmation...' : '✅ Confirmer la livraison'}
                </button>
                <button onClick={onBack}
                  className="px-6 py-3 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.06] transition-all">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
