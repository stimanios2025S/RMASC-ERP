// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — FICHIERS LASER (Technical File Management & Stamping)
//  Pipeline de fichiers de découpe laser :
//    Ingénieur 2  → upload PDF lié à une commande + métadonnées (matériau,
//                   épaisseur, quantité) → En Attente
//    Production   → aperçu navigateur + "Approuver & Tamponner" (cachet
//                   incrusté en bas à droite) → Approuvé & Tamponné
//  Les deux rôles : voir / télécharger / remplacer (→ retour En Attente) /
//  supprimer (disparaît pour les deux). Temps réel via SSE.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react'
import { apiFetch } from '../config/api'
import type { PortalSession } from '../data/portalUsers'
import { useSSE } from '../hooks/useSSE'
import FileViewer from './FileViewer'

interface LaserFileRow {
  id: string
  orderId?: string | null
  orderSerial?: string | null
  orderClient?: string | null
  projectName: string
  material?: string | null
  thickness?: string | null
  quantity: number
  status: 'EN_ATTENTE' | 'APPROVED_LASER'
  fileUrl?: string | null
  stampedFileUrl?: string | null
  originalFile?: { originalname: string; size: number } | null
  stampedFile?: { originalname: string; size: number } | null
  createdBy?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  createdAt: string
}

interface OrderOption {
  _id: string
  serialNumber: string
  clientName: string
}

interface Props {
  onBack?: () => void
  session?: PortalSession
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function statusBadge(status: string) {
  return status === 'APPROVED_LASER'
    ? { label: '✅ Approuvé & Tamponné', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' }
    : { label: '⏳ En Attente', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/20' }
}

// ─── Téléchargement authentifié (blob) ───────────────────────────────────
async function downloadAuthed(url: string, fallbackName: string) {
  const token = localStorage.getItem('rmasc_token')
  try {
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) throw new Error('Download failed')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fallbackName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)
  } catch {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  VUE INGÉNIEUR 2 — Soumission + suivi (2 onglets : En Attente / Tamponnés)
// ═══════════════════════════════════════════════════════════════════════════
function IngenieurLaserView({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<'attente' | 'approuves'>('attente')
  const [orders, setOrders] = useState<OrderOption[]>([])
  const [orderId, setOrderId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [material, setMaterial] = useState('')
  const [thickness, setThickness] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [allFiles, setAllFiles] = useState<LaserFileRow[]>([])
  const [preview, setPreview] = useState<LaserFileRow | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const [replaceTarget, setReplaceTarget] = useState<LaserFileRow | null>(null)

  const loadFiles = useCallback(async () => {
    try {
      const data: LaserFileRow[] = await apiFetch('/laser-files')
      setAllFiles(data)
    } catch { /* silent */ }
  }, [])

  const loadOrders = useCallback(async () => {
    try {
      const data: any[] = await apiFetch('/orders')
      setOrders((data || []).map((o: any) => ({ _id: o.id, serialNumber: o.serialNumber, clientName: o.clientName })))
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadFiles(); loadOrders() }, [loadFiles, loadOrders])
  useEffect(() => {
    const iv = setInterval(loadFiles, 10_000)
    const onFocus = () => loadFiles()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [loadFiles])

  // ⚡ Temps réel : Production approuve → le fichier passe dans l'onglet Tamponnés
  const loadRef = useRef(loadFiles)
  loadRef.current = loadFiles
  useSSE(useCallback((event: { type: string; data: any }) => {
    if (['laser:created', 'laser:approved', 'laser:replaced', 'laser:deleted'].includes(event.type)) {
      loadRef.current()
    }
  }, []))

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      setMessage({ type: 'error', text: 'Le nom du projet / pièce est requis.' })
      return
    }
    if (!file) {
      setMessage({ type: 'error', text: 'Sélectionnez un fichier PDF.' })
      return
    }
    setSubmitting(true)
    setMessage(null)
    try {
      const formData = new FormData()
      if (orderId) {
        const o = orders.find(x => x._id === orderId)
        formData.append('orderId', orderId)
        if (o) { formData.append('orderSerial', o.serialNumber); formData.append('orderClient', o.clientName) }
      }
      formData.append('projectName', projectName.trim())
      formData.append('material', material.trim())
      formData.append('thickness', thickness.trim())
      formData.append('quantity', String(quantity))
      formData.append('pdfFile', file)

      const token = localStorage.getItem('rmasc_token')
      const res = await fetch('/api/laser-files/create', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur ${res.status}` }))
        throw new Error(err.error || `Erreur ${res.status}`)
      }
      const data = await res.json()
      setMessage({ type: 'success', text: `✅ ${data.message}` })
      setProjectName(''); setMaterial(''); setThickness(''); setQuantity(1)
      setOrderId(''); setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTab('attente')
      loadFiles()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (f: LaserFileRow) => {
    if (!window.confirm(`🗑️ Supprimer "${f.projectName}" ?\nLe fichier sera retiré pour vous ET pour la Production.`)) return
    try {
      await apiFetch(`/laser-files/${f.id}`, { method: 'DELETE' })
      setMessage({ type: 'success', text: `🗑️ ${f.projectName} supprimé.` })
      loadFiles()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  const triggerReplace = (f: LaserFileRow) => {
    setReplaceTarget(f)
    setTimeout(() => replaceRef.current?.click(), 50)
  }
  const handleReplaceFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0]
    if (!newFile || !replaceTarget) return
    try {
      const formData = new FormData()
      formData.append('projectName', replaceTarget.projectName)
      formData.append('material', replaceTarget.material || '')
      formData.append('thickness', replaceTarget.thickness || '')
      formData.append('quantity', String(replaceTarget.quantity))
      if (replaceTarget.orderId) formData.append('orderId', replaceTarget.orderId)
      if (replaceTarget.orderSerial) formData.append('orderSerial', replaceTarget.orderSerial)
      if (replaceTarget.orderClient) formData.append('orderClient', replaceTarget.orderClient)
      formData.append('pdfFile', newFile)

      const token = localStorage.getItem('rmasc_token')
      const res = await fetch(`/api/laser-files/${replaceTarget.id}/replace`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur ${res.status}` }))
        throw new Error(err.error)
      }
      const data = await res.json()
      setMessage({ type: 'success', text: `✅ ${data.message}` })
      loadFiles()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setReplaceTarget(null)
      if (e.target) e.target.value = ''
    }
  }

  const enAttente = allFiles.filter(f => f.status === 'EN_ATTENTE')
  const approuves = allFiles.filter(f => f.status === 'APPROVED_LASER')
  const visible = tab === 'attente' ? enAttente : approuves

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Hidden input for replace */}
      <input ref={replaceRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleReplaceFile} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-3 md:px-6 py-3 border-b border-white/5 bg-white/[0.03] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-all flex-shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-base font-extrabold text-white flex items-center gap-2 truncate">
            <span className="text-amber-400">🖨️</span> <span className="truncate">Fichiers Laser</span>
          </h1>
          <span className="hidden sm:inline-block text-[10px] text-white/80 font-medium bg-white/[0.06] px-2 py-0.5 rounded-full flex-shrink-0">Découpe</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-white/80 whitespace-nowrap">
            <span className="text-amber-400 font-bold">{enAttente.length}</span><span className="hidden sm:inline"> en attente</span> ·{' '}
            <span className="text-emerald-400 font-bold">{approuves.length}</span><span className="hidden sm:inline"> tamponnés</span>
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-3 md:p-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          {/* ── LEFT: Submission Form ─────────────────────────────────── */}
          <div className="w-full lg:w-96 flex-shrink-0 space-y-5">
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/5 shadow-lg p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <span className="text-amber-400 text-sm">🖨️</span>
                </div>
                <h3 className="text-sm font-bold text-white">Nouveau Fichier Laser</h3>
              </div>

              {/* Commande / Fiche technique */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1 block">Commande / Fiche Technique</label>
                <select
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-white/10 bg-slate-900 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                >
                  <option value="">— Aucune commande —</option>
                  {orders.map(o => (
                    <option key={o._id} value={o._id}>{o.serialNumber} · {o.clientName}</option>
                  ))}
                </select>
              </div>

              {/* Project name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1 block">Nom du Projet / Pièce *</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="ex: Support Cabine — Porte Coulissante"
                  className="w-full h-10 px-3.5 rounded-xl border border-white/10 bg-white/[0.06] text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all"
                />
              </div>

              {/* Material + Thickness row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1 block">Matériau</label>
                  <input
                    type="text"
                    value={material}
                    onChange={e => setMaterial(e.target.value)}
                    placeholder="Acier / Inox..."
                    className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/[0.06] text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1 block">Épaisseur</label>
                  <input
                    type="text"
                    value={thickness}
                    onChange={e => setThickness(e.target.value)}
                    placeholder="2mm / 3mm..."
                    className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/[0.06] text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1 block">Quantité</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-10 px-3.5 rounded-xl border border-white/10 bg-white/[0.06] text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                />
              </div>

              {/* File upload zone */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1 block">Fichier de Découpe (PDF) *</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                    file
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-white/10 bg-white/[0.02] hover:border-amber-500/25 hover:bg-amber-500/5'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {file ? (
                    <div className="space-y-1">
                      <span className="text-lg">📄</span>
                      <p className="text-xs font-semibold text-amber-400 truncate">{file.name}</p>
                      <p className="text-[10px] text-white/50">{(file.size / 1024).toFixed(1)} KB — Cliquez pour changer</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-2xl">📄</span>
                      <p className="text-xs font-semibold text-white/80">Fichier PDF de découpe</p>
                      <p className="text-[10px] text-white/50">PDF uniquement — Cliquez pour parcourir</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback */}
              {message && (
                <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-sm font-bold transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Envoi en cours...</>
                ) : (
                  <>⬆️ Soumettre pour Approbation</>
                )}
              </button>
            </div>
          </div>

          {/* ── RIGHT: Dashboard 2 onglets ─────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-1 mb-4">
              <button
                onClick={() => setTab('attente')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                  tab === 'attente'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white/90'
                }`}
              >
                ⏳ En Attente {enAttente.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">{enAttente.length}</span>}
              </button>
              <button
                onClick={() => setTab('approuves')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                  tab === 'approuves'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white/90'
                }`}
              >
                ✅ Approuvés & Tamponnés {approuves.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">{approuves.length}</span>}
              </button>
            </div>

            <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/5 shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  {tab === 'attente' ? '⏳ Fichiers en Attente' : '✅ Approuvés & Tamponnés'}
                </h3>
                <span className="text-[10px] text-white/80 font-medium bg-white/[0.06] px-2 py-0.5 rounded-full">{visible.length} fichier(s)</span>
              </div>

              {visible.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-4xl block mb-3">📄</span>
                  <p className="text-sm text-white/80 font-medium">
                    {tab === 'attente' ? 'Aucun fichier en attente.' : 'Aucun fichier approuvé pour le moment.'}
                  </p>
                  <p className="text-xs text-white/50 mt-1">
                    {tab === 'attente' ? 'Soumettez un fichier via le formulaire — il apparaîtra ici.' : 'Dès que la Production approuve, le fichier tamponné apparaît ici automatiquement.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Fichier</th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Commande</th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Matière</th>
                        <th className="text-center px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Qté</th>
                        <th className="text-center px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Statut</th>
                        <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {visible.map(f => {
                        const badge = statusBadge(f.status)
                        const isApproved = f.status === 'APPROVED_LASER'
                        return (
                          <tr key={f.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-5 py-3">
                              <button onClick={() => setPreview(f)} className="text-left group" title="Aperçu">
                                <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{f.projectName}</span>
                                <p className="text-[10px] text-white/50">
                                  📄 {f.stampedFile?.originalname || f.originalFile?.originalname || 'fichier.pdf'}
                                  {isApproved && f.approvedBy && <span className="text-emerald-400"> · par {f.approvedBy}</span>}
                                </p>
                                <p className="text-[10px] text-white/40">Soumis {fmtDate(f.createdAt)}{f.createdBy ? ` par ${f.createdBy}` : ''}</p>
                              </button>
                            </td>
                            <td className="px-5 py-3">
                              {f.orderSerial ? (
                                <>
                                  <span className="text-xs font-mono font-bold text-amber-400">{f.orderSerial}</span>
                                  {f.orderClient && <p className="text-[10px] text-white/50">{f.orderClient}</p>}
                                </>
                              ) : <span className="text-xs text-white/40">—</span>}
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs text-white/80">{f.material || '—'}</span>
                              {f.thickness && <p className="text-[10px] text-white/50">{f.thickness}</p>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="text-sm font-bold text-white">{f.quantity}</span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                              {isApproved && f.approvedAt && (
                                <p className="text-[9px] text-white/40 mt-1">{fmtTime(f.approvedAt)}</p>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => setPreview(f)}
                                  className="p-1.5 rounded-lg hover:bg-sky-500/20 text-white/40 hover:text-sky-400 transition-all" title="Aperçu">
                                  👁️
                                </button>
                                <button
                                  onClick={() => downloadAuthed(isApproved && f.stampedFileUrl ? f.stampedFileUrl! : f.fileUrl!, isApproved ? `TAMPONNE_${f.projectName}.pdf` : `${f.projectName}.pdf`)}
                                  className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 transition-all" title="Télécharger">
                                  ⬇️
                                </button>
                                <button
                                  onClick={() => triggerReplace(f)}
                                  className="p-1.5 rounded-lg hover:bg-amber-500/20 text-white/40 hover:text-amber-400 transition-all" title={isApproved ? 'Remplacer (invalide l\'approbation → En Attente)' : 'Remplacer le fichier'}>
                                  🔄
                                </button>
                                <button
                                  onClick={() => handleDelete(f)}
                                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all" title="Supprimer">
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview modal ── */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 md:p-8" onClick={() => setPreview(null)}>
          <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 bg-slate-800/50 border-b border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">📄</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{preview.projectName}</p>
                  <p className="text-[10px] text-white/50">
                    {preview.status === 'APPROVED_LASER' ? '✅ Version tamponnée' : '⏳ Version originale (non tamponnée)'}
                    {preview.orderSerial ? ` · ${preview.orderSerial}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setPreview(null)}
                className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-red-500 text-white text-sm flex items-center justify-center transition-colors">✕</button>
            </div>
            <div className="flex-1 bg-[#0a0f1a] overflow-hidden">
              <FileViewer
                fileUrl={(preview.status === 'APPROVED_LASER' ? preview.stampedFileUrl : preview.fileUrl) ?? undefined}
                fileName={preview.projectName + '.pdf'}
                fileType="application/pdf"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  VUE PRODUCTION — Approbation & Tamponnage (file d'attente + historique)
// ═══════════════════════════════════════════════════════════════════════════
function ProductionLaserView({ onBack }: { onBack?: () => void }) {
  const [files, setFiles] = useState<LaserFileRow[]>([])
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<LaserFileRow | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadFiles = useCallback(async () => {
    try {
      const data: LaserFileRow[] = await apiFetch('/laser-files')
      setFiles(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])
  useEffect(() => {
    const iv = setInterval(loadFiles, 8_000)
    const onFocus = () => loadFiles()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loadFiles() })
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [loadFiles])

  // ⚡ Temps réel : Ingénieur 2 soumet / remplace → rafraîchit instantanément
  const loadRef = useRef(loadFiles)
  loadRef.current = loadFiles
  useSSE(useCallback((event: { type: string; data: any }) => {
    if (['laser:created', 'laser:approved', 'laser:replaced', 'laser:deleted'].includes(event.type)) {
      loadRef.current()
    }
  }, []))

  const approve = async (f: LaserFileRow) => {
    if (!window.confirm(`🖨️ Approuver & Tamponner "${f.projectName}" ?\nLe cachet sera incrusté en bas à droite du PDF.`)) return
    setApprovingId(f.id)
    setMessage(null)
    try {
      const data = await apiFetch(`/laser-files/${f.id}/approve`, { method: 'POST' })
      setMessage({ type: 'success', text: `✅ ${data.message}` })
      loadFiles()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setApprovingId(null)
    }
  }

  const handleDelete = async (f: LaserFileRow) => {
    if (!window.confirm(`🗑️ Supprimer "${f.projectName}" ?\nLe fichier sera retiré pour vous ET pour l'Ingénieur 2.`)) return
    try {
      await apiFetch(`/laser-files/${f.id}`, { method: 'DELETE' })
      setMessage({ type: 'success', text: `🗑️ ${f.projectName} supprimé.` })
      loadFiles()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  const enAttente = files.filter(f => f.status === 'EN_ATTENTE')
  const approuves = files.filter(f => f.status === 'APPROVED_LASER')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 md:px-6 py-3 border-b border-white/5 bg-white/[0.03] gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-all flex-shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-base font-extrabold text-white flex items-center gap-2 truncate">
            <span className="text-amber-400">🖨️</span> <span className="truncate">Approbation Laser</span>
          </h1>
          <span className="hidden sm:inline-block text-[10px] text-white/80 font-medium bg-white/[0.06] px-2 py-0.5 rounded-full flex-shrink-0">Production — Tamponnage</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-white/80 whitespace-nowrap">
            <span className="text-amber-400 font-bold">{enAttente.length}</span><span className="hidden sm:inline"> en attente</span> ·{' '}
            <span className="text-emerald-400 font-bold">{approuves.length}</span><span className="hidden sm:inline"> tamponnés</span>
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-3 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {message && (
            <div className={`px-4 py-3 rounded-xl text-xs font-semibold border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          {/* ── EN ATTENTE ─────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">En Attente d'Approbation · {enAttente.length} fichier{enAttente.length > 1 ? 's' : ''}</h3>
            </div>
            {enAttente.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center">
                <span className="text-3xl block mb-2">✅</span>
                <p className="text-sm text-white/70 font-medium">Aucun fichier en attente — tout est approuvé.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enAttente.map(f => (
                  <div key={f.id} className="rounded-2xl p-5 shadow-lg border bg-amber-500/5 border-amber-500/20 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-amber-400">{f.orderSerial || 'SANS COMMANDE'}</span>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20">⏳ En Attente</span>
                    </div>
                    <p className="text-sm font-bold text-white">{f.projectName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/80 mt-1.5">
                      {f.material && <span>🧱 {f.material}</span>}
                      {f.thickness && <span>📏 {f.thickness}</span>}
                      <span className="font-bold text-white">×{f.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-white/50 mt-1">
                      <span>📄 {f.originalFile?.originalname}</span>
                      {f.originalFile?.size ? <span>· {(f.originalFile.size / 1024).toFixed(1)} KB</span> : null}
                    </div>
                    <p className="text-[10px] text-white/50 mt-0.5">Soumis par {f.createdBy || '—'} le {fmtDate(f.createdAt)}</p>

                    <div className="mt-4 space-y-2 flex-1 flex flex-col justify-end">
                      <button onClick={() => setPreview(f)}
                        className="w-full py-2 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.10] text-white/80 hover:text-white text-xs font-bold transition-all">
                        👁️ Aperçu du PDF
                      </button>
                      <button
                        onClick={() => approve(f)}
                        disabled={approvingId === f.id}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {approvingId === f.id ? (
                          <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Tamponnage en cours...</>
                        ) : (
                          <>🖨️ Approuver &amp; Tamponner</>
                        )}
                      </button>
                      <button onClick={() => handleDelete(f)}
                        className="w-full py-1.5 rounded-lg text-[10px] font-semibold bg-white/[0.03] text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── APPROUVÉS & TAMPONNÉS ─────────────────────────────────── */}
          {approuves.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Approuvés &amp; Tamponnés · {approuves.length} fichier{approuves.length > 1 ? 's' : ''}</h3>
              </div>
              <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/5 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Fichier</th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Commande</th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Matière</th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Tamponné par</th>
                        <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {approuves.map(f => (
                        <tr key={f.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="px-5 py-3">
                            <span className="text-sm font-bold text-white">{f.projectName}</span>
                            <p className="text-[10px] text-emerald-400">✅ {f.stampedFile?.originalname || 'PDF tamponné'}</p>
                          </td>
                          <td className="px-5 py-3">
                            {f.orderSerial ? (
                              <span className="text-xs font-mono font-bold text-amber-400">{f.orderSerial}</span>
                            ) : <span className="text-xs text-white/40">—</span>}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs text-white/80">{f.material || '—'}{f.thickness ? ` · ${f.thickness}` : ''}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs text-white/80">{f.approvedBy || '—'}</span>
                            {f.approvedAt && <p className="text-[10px] text-white/50">{fmtTime(f.approvedAt)}</p>}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => setPreview(f)}
                                className="p-1.5 rounded-lg hover:bg-sky-500/20 text-white/40 hover:text-sky-400 transition-all" title="Aperçu (version tamponnée)">
                                👁️
                              </button>
                              <button
                                onClick={() => downloadAuthed(f.stampedFileUrl || f.fileUrl || '', `TAMPONNE_${f.projectName}.pdf`)}
                                className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 transition-all" title="Télécharger le PDF tamponné">
                                ⬇️
                              </button>
                              <button onClick={() => handleDelete(f)}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all" title="Supprimer">
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Preview modal ── */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 md:p-8" onClick={() => setPreview(null)}>
          <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 bg-slate-800/50 border-b border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">📄</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{preview.projectName}</p>
                  <p className="text-[10px] text-white/50">
                    {preview.status === 'APPROVED_LASER' ? '✅ Version tamponnée (cachet bas-droite)' : '⏳ Version originale — à approuver'}
                    {preview.orderSerial ? ` · ${preview.orderSerial}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setPreview(null)}
                className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-red-500 text-white text-sm flex items-center justify-center transition-colors">✕</button>
            </div>
            <div className="flex-1 bg-[#0a0f1a] overflow-hidden">
              <FileViewer
                fileUrl={(preview.status === 'APPROVED_LASER' ? preview.stampedFileUrl : preview.fileUrl) ?? undefined}
                fileName={preview.projectName + '.pdf'}
                fileType="application/pdf"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — Ingénieur 2 ou Production selon le rôle
// ═══════════════════════════════════════════════════════════════════════════
export default function LaserFilesWorkspace({ onBack, session }: Props) {
  const role = session?.role || ''

  if (role === 'INGENIEUR_2') {
    return <IngenieurLaserView onBack={onBack} />
  }
  if (role === 'PRODUCTION') {
    return <ProductionLaserView onBack={onBack} />
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <span className="text-4xl block mb-3">🔒</span>
        <p className="text-sm text-white/80 font-medium">Accès réservé à l'Ingénieur 2 et à la Production.</p>
      </div>
    </div>
  )
}
