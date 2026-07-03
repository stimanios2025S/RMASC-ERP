import { useState, useEffect } from 'react'
import FileViewer from './FileViewer'
import { apiFetch } from '../config/api'
import { getUploads } from '../config/runtime-store'

interface OrderRow {
  id: string; serialNumber: string; clientName: string; clientCity: string
  typeMotorisation: string; status: string; createdAt: string
  largeurGaineMm: string; profondeurGaineMm: string; hauteurGaineMm: string
  materiauCabine: string | null; materiauPortes: string | null
  _count: { cadSubmissions: number }
}

interface Props {
  onBack?: () => void
  onFiche?: (id: string) => void
}

export default function ValidationsPage({ onBack, onFiche }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [cadOrder, setCadOrder] = useState<OrderRow | null>(null)
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

  const pending = orders.filter(o => o.status === 'ATTENTE_APPROBATION_ADMIN')
  const recent = orders.filter(o => ['ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION'].includes(o.status))

  const approvePlan = async (id: string) => {
    try {
      setSubmitting(true)
      const r = await apiFetch(`/orders/${id}/approve-plan`, { method: 'POST', body: JSON.stringify({}) })
      setActionMsg(`✅ ${r.message || 'Plan approuvé avec succès.'}`)
      setCadOrder(null)
      load()
    } catch (err: any) {
      setActionMsg(`⚠️ ${err.message}`)
    } finally { setSubmitting(false); setTimeout(() => setActionMsg(null), 4000) }
  }

  const rejectPlan = async (id: string) => {
    try {
      setSubmitting(true)
      await apiFetch(`/orders/${id}/reject-plan`, { method: 'POST', body: JSON.stringify({ reason: rejectReason || 'Non spécifié' }) })
      setActionMsg('⚠️ Plan rejeté. Retour à l\'Ingénieur 1.')
      setCadOrder(null)
      setShowReject(false)
      setRejectReason('')
      load()
    } catch (err: any) {
      setActionMsg(`⚠️ ${err.message}`)
    } finally { setSubmitting(false); setTimeout(() => setActionMsg(null), 4000) }
  }

  // ── Full-screen CAD review overlay ──
  if (cadOrder) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-primary-50/60 via-surface-50 to-surface-50">
        {/* Top bar */}
        <div className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => { setCadOrder(null); setShowReject(false) }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 font-mono">{cadOrder.serialNumber}</h2>
              <p className="text-[11px] text-slate-500">{cadOrder.clientName} — {cadOrder.clientCity} • {cadOrder.typeMotorisation}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => approvePlan(cadOrder.id)} disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-2">
              ✅ Approuver le Plan
            </button>
            <button onClick={() => setShowReject(true)} disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-2">
              ❌ Rejeter
            </button>
            {onFiche && (
              <button onClick={() => onFiche(cadOrder.id)}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">📄 Fiche</button>
            )}
          </div>
        </div>

        {/* Action feedback */}
        {actionMsg && (
          <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${actionMsg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' : 'bg-amber-50 text-amber-700 border-b border-amber-100'}`}>
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg(null)} className="ml-auto">✕</button>
          </div>
        )}

        {/* File Viewer — affiche le fichier réel uploadé par l'ingénieur */}
        <div className="flex-1 overflow-hidden p-4">
          {(() => {
            // Retrieve the uploaded file from the shared in-memory store
              let uploadData: { data: string; name: string; type: string } | null = null
            try {
              const uploads = getUploads(cadOrder.id)
              uploadData = uploads[0] || null
            } catch { /* ignore */ }
            return (
              <FileViewer
                fileData={uploadData?.data}
                fileName={uploadData?.name}
                fileType={uploadData?.type}
              />
            )
          })()}
        </div>

        {/* Rejection modal */}
        {showReject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-surface-50 rounded-2xl shadow-2xl p-6 w-[420px]">
              <h3 className="text-base font-bold text-slate-800 mb-3">Motif du rejet</h3>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Décrivez la raison du rejet..." rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"/>
              <div className="flex items-center gap-2 mt-4 justify-end">
                <button onClick={() => setShowReject(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100">Annuler</button>
                <button onClick={() => rejectPlan(cadOrder.id)} disabled={submitting}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Main list view ──
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-primary-50/60 via-surface-50 to-surface-50">
      <div className="sticky top-0 z-10 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-lg font-extrabold text-slate-800">✅ Validations</h1>
          <span className="text-xs font-mono text-slate-400">{pending.length} en attente</span>
        </div>
        {actionMsg && (
          <span className={`text-sm font-medium ${actionMsg.includes('✅') ? 'text-emerald-600' : 'text-amber-600'}`}>{actionMsg}</span>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Plans d'Installation — Approbations requises ({pending.length})
          </h2>
          {loading ? (
            <div className="text-sm text-slate-400 italic p-4">Chargement...</div>
          ) : pending.length === 0 ? (
            <div className="bg-surface-50 rounded-xl border border-slate-200 p-8 text-center">
              <span className="text-3xl">✅</span>
              <p className="text-sm text-slate-400 mt-2">Toutes les commandes sont à jour. Aucune approbation en attente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map(order => (
                <div key={order.id} className="bg-surface-50 rounded-xl border border-amber-200 p-4 flex items-center justify-between hover:shadow-sm transition-all">
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg">📐</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</p>
                      <p className="text-xs text-slate-500">{order.clientName} — {order.clientCity}</p>
                      <p className="text-[10px] text-slate-400">{order.typeMotorisation} • Gaine: {order.largeurGaineMm}×{order.profondeurGaineMm}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">En attente</span>
                    <button onClick={() => setCadOrder(order)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all">
                      👁️ Voir le CAD
                    </button>
                    {onFiche && (
                      <button onClick={() => onFiche(order.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">
                        📄
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-600 flex items-center gap-2 mb-3">
            En cours de traitement ({recent.length})
          </h2>
          <div className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucune commande en cours.</p>
            ) : (
              recent.slice(0, 5).map(order => (
                <div key={order.id} className="bg-surface-50 rounded-xl border border-slate-200 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">⚙️</span>
                    <div>
                      <p className="text-xs font-bold text-slate-700 font-mono">{order.serialNumber}</p>
                      <p className="text-[10px] text-slate-400">{order.clientName}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {order.status === 'ATTENTE_DESSIN_2D' ? 'Dessin 2D' : 'Vérification'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
