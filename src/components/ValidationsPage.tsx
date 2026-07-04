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

  const pending = orders.filter(o => o.status === 'ATTENTE_APPROBATION_ADMIN')
  const pendingDelivery = orders.filter(o => o.status === 'EN_LIVRAISON')
  const delivered = orders.filter(o => o.status === 'LIVREE')
  const recent = orders.filter(o => ['ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION'].includes(o.status))

  const approvePlan = async (id: string) => {
    try {
      setSubmitting(true)
      const r = await apiFetch(`/orders/${id}/approve-plan`, { method: 'POST', body: JSON.stringify({}) })
      setActionMsg(`✅ ${r.message || 'Plan approuvé.'}`)
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
    <PageBackground className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-lg font-extrabold text-slate-800">✅ Validations</h1>
          <span className="text-xs font-mono text-slate-400">{pending.length + pendingDelivery.length} en attente</span>
        </div>
        {actionMsg && <span className={`text-sm font-medium ${actionMsg.includes('✅') ? 'text-emerald-600' : 'text-amber-600'}`}>{actionMsg}</span>}
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-10 bg-surface-50 border-b border-slate-200 px-6 flex gap-0">
        {TABS.map(t => {
          const isActive = tab === t.key
          const count = t.key === 'plans' ? pending.length : pendingDelivery.length
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
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
              <div className="text-sm text-slate-400 italic p-4 text-center">Chargement...</div>
            ) : pending.length === 0 ? (
              <div className="bg-surface-50 rounded-2xl border border-slate-200 p-12 text-center">
                <span className="text-5xl block mb-4">✅</span>
                <h3 className="text-base font-bold text-slate-700">Tous les plans sont approuvés</h3>
                <p className="text-sm text-slate-400 mt-1">Aucune approbation de plan en attente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map(order => (
                  <div key={order.id} className="bg-surface-50 rounded-xl border border-amber-200 p-5 flex items-center justify-between hover:shadow-md hover:border-amber-300 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">📐</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</p>
                        <p className="text-xs text-slate-500">{order.clientName} <span className="text-slate-300">—</span> {order.clientCity}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span>{order.typeMotorisation}</span>
                          <span>•</span>
                          <span>Gaine: {order.largeurGaineMm}×{order.profondeurGaineMm}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">Approbation requise</span>
                      <button onClick={() => setCadOrder(order)}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm">
                        👁️ Voir & Approuver
                      </button>
                      {onFiche && (
                        <button onClick={() => onFiche(order.id)}
                          className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">📄</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent orders */}
            {recent.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-600 mb-3">⚙️ En cours de traitement ({recent.length})</h3>
                <div className="space-y-2">
                  {recent.slice(0, 5).map(order => (
                    <div key={order.id} className="bg-surface-50 rounded-xl border border-slate-200 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">⚙️</span>
                        <div>
                          <p className="text-xs font-bold text-slate-700 font-mono">{order.serialNumber}</p>
                          <p className="text-[10px] text-slate-400">{order.clientName}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
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
              <h2 className="text-sm font-bold text-cyan-700 flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                En attente de confirmation ({pendingDelivery.length})
              </h2>

              {loading ? (
                <div className="text-sm text-slate-400 italic p-4 text-center">Chargement...</div>
              ) : pendingDelivery.length === 0 ? (
                <div className="bg-surface-50 rounded-2xl border border-slate-200 p-12 text-center">
                  <span className="text-5xl block mb-4">🚚</span>
                  <h3 className="text-base font-bold text-slate-700">Aucune livraison en attente</h3>
                  <p className="text-sm text-slate-400 mt-1">Les livraisons prêtes apparaîtront ici pour validation.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDelivery.map(order => (
                    <div key={order.id} className="bg-surface-50 rounded-xl border border-cyan-200 p-5 flex items-center justify-between hover:shadow-md hover:border-cyan-300 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-xl flex-shrink-0">🚛</div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</p>
                          <p className="text-xs text-slate-500">{order.clientName} <span className="text-slate-300">—</span> {order.clientCity}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                            <span>{order.typeMotorisation}</span>
                            <span>•</span>
                            <span>Gaine: {order.largeurGaineMm}×{order.profondeurGaineMm}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-lg">Prêt pour livraison</span>
                        <button onClick={() => setDeliveryOrder(order)}
                          className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-1.5">
                          ✅ Confirmer la livraison
                        </button>
                        {onFiche && (
                          <button onClick={() => onFiche(order.id)}
                            className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">📄</button>
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
                <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2 mb-3">
                  ✅ Livraisons terminées ({delivered.length})
                </h3>
                <div className="space-y-2">
                  {delivered.slice(0, 5).map(order => (
                    <div key={order.id} className="bg-surface-50 rounded-xl border border-emerald-100 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm">✅</span>
                        <div>
                          <p className="text-xs font-bold text-slate-700 font-mono">{order.serialNumber}</p>
                          <p className="text-[10px] text-slate-400">{order.clientName} — {order.clientCity}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">Livrée</span>
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
//  CAD REVIEW OVERLAY
// ═══════════════════════════════════════════════════════════════════════════

function CadReview({ order, onBack, onApprove, onReject, rejectReason, setRejectReason, showReject, setShowReject, submitting, actionMsg, setActionMsg, onFiche }: {
  order: OrderRow; onBack: () => void; onApprove: (id: string) => void; onReject: (id: string) => void
  rejectReason: string; setRejectReason: (v: string) => void; showReject: boolean; setShowReject: (v: boolean) => void
  submitting: boolean; actionMsg: string | null; setActionMsg: (v: string | null) => void; onFiche?: (id: string) => void
}) {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary-50/60 via-surface-50 to-surface-50">
      <div className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 font-mono">{order.serialNumber}</h2>
            <p className="text-[11px] text-slate-500">{order.clientName} — {order.clientCity} • {order.typeMotorisation}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onApprove(order.id)} disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50 flex items-center gap-2">
            ✅ Approuver le Plan
          </button>
          <button onClick={() => setShowReject(true)} disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-md disabled:opacity-50 flex items-center gap-2">
            ❌ Rejeter
          </button>
          {onFiche && <button onClick={() => onFiche(order.id)} className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100">📄 Fiche</button>}
        </div>
      </div>

      {actionMsg && (
        <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${actionMsg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' : 'bg-amber-50 text-amber-700 border-b border-amber-100'}`}>
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="ml-auto">✕</button>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-4">
        {(() => {
          let uploadData: { data: string; name: string; type: string } | null = null
          try { const uploads = getUploads(order.id); uploadData = uploads[0] || null } catch {}
          return <FileViewer fileData={uploadData?.data} fileName={uploadData?.name} fileType={uploadData?.type} />
        })()}
      </div>

      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface-50 rounded-2xl shadow-2xl p-6 w-[420px]">
            <h3 className="text-base font-bold text-slate-800 mb-3">Motif du rejet</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Décrivez la raison du rejet..." rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"/>
            <div className="flex items-center gap-2 mt-4 justify-end">
              <button onClick={() => setShowReject(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100">Annuler</button>
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary-50/60 via-surface-50 to-surface-50">
      {/* Top bar */}
      <div className="flex-shrink-0 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 font-mono">{order.serialNumber}</h2>
            <p className="text-[11px] text-slate-500">{order.clientName} — {order.clientCity}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onFiche && <button onClick={() => onFiche(order.id)} className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100">📄 Fiche Technique</button>}
          <button onClick={onBack} className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50">Retour</button>
        </div>
      </div>

      {actionMsg && (
        <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${actionMsg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100' : 'bg-amber-50 text-amber-700 border-b border-amber-100'}`}>
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {confirmed ? (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Livraison confirmée !</h2>
            <p className="text-sm text-slate-400">La commande {order.serialNumber} est marquée comme livrée.</p>
            <p className="text-sm text-slate-400 mt-1">Le cycle de vie de cette commande est terminé.</p>
            <button onClick={onBack}
              className="mt-6 px-6 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-all">
              ← Retour aux validations
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Delivery summary card */}
            <div className="bg-surface-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-2xl">🚛</div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Confirmation de Livraison</h3>
                  <p className="text-xs text-slate-400">Veuillez vérifier et confirmer la livraison de cette commande.</p>
                </div>
              </div>

              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Commande</span>
                  <span className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Client</span>
                  <span className="text-sm font-semibold text-slate-700">{order.clientName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Ville</span>
                  <span className="text-sm font-semibold text-slate-700">{order.clientCity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Motorisation</span>
                  <span className="text-sm font-semibold text-slate-700">{order.typeMotorisation}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Date de création</span>
                  <span className="text-sm font-semibold text-slate-700">{createdAt}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs text-amber-700 flex items-center gap-2">
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
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">
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
