// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — PIÈCES SOLO (Standalone Parts Module)
//  High-speed direct pipeline: Ingénieur 2 submits 2D CAD → Production cuts.
//  Strictly hidden from Admin and Stock dashboards.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../config/api'
import type { PortalSession } from '../data/portalUsers'

interface StandalonePart {
  _id: string
  partNumber: string
  projectName: string
  material?: string | null
  thickness?: string | null
  quantity: number
  cadFileUrl?: string | null
  status: 'EN_ATTENTE' | 'EN_PRODUCTION' | 'TERMINE'
  createdAt: string
  createdBy?: string | null
}

interface Props {
  onBack?: () => void
  session?: PortalSession
}

const API_BASE = '' // relative URLs; Cloudflare Tunnel auto-routes

function statusBadge(status: string) {
  switch (status) {
    case 'EN_ATTENTE':    return { label: 'En Attente',   cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/20' }
    case 'EN_PRODUCTION': return { label: 'Découpe — En Cours', cls: 'bg-sky-500/20 text-sky-400 border border-sky-500/20' }
    case 'TERMINE':       return { label: 'Terminé',      cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' }
    default:              return { label: status,          cls: 'bg-white/10 text-white/80' }
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── SVG Icons ────────────────────────────────────────────────────────────
function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const p = { className, strokeWidth: 1.5, fill: 'none' as const, stroke: 'currentColor' as const }
  switch (name) {
    case 'Upload': return (
      <svg {...p} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    )
    case 'Download': return (
      <svg {...p} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    )
    case 'File': return (
      <svg {...p} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    )
    case 'CheckCircle': return (
      <svg {...p} viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    )
    case 'Play': return (
      <svg {...p} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    )
    case 'Package': return (
      <svg {...p} viewBox="0 0 24 24"><path d="M16.5 9.4 7.55 4.24a1 1 0 0 0-1.1 0L3 6.5"/><polyline points="21 16 12 21 3 16 3 8 12 3 21 8 21 12"/><line x1="12" y1="21" x2="12" y2="11.5"/><line x1="9" y1="6.5" x2="15" y2="10"/></svg>
    )
    case 'Wrench': return (
      <svg {...p} viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    )
    case 'AlertCircle': return (
      <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    )
    default: return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  INGÉNIEUR VIEW — Atelier Pièces Solo (submit + history)
// ═══════════════════════════════════════════════════════════════════════════
function IngenieurView({ onBack }: { onBack?: () => void }) {
  const [projectName, setProjectName] = useState('')
  const [material, setMaterial] = useState('')
  const [thickness, setThickness] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [allParts, setAllParts] = useState<StandalonePart[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadParts = useCallback(async () => {
    try {
      const data: StandalonePart[] = await apiFetch('/standalone-parts/all')
      setAllParts(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadParts() }, [loadParts])
  useEffect(() => {
    const iv = setInterval(loadParts, 10_000)
    return () => clearInterval(iv)
  }, [loadParts])

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      setMessage({ type: 'error', text: 'Le nom du projet est requis.' })
      return
    }
    setSubmitting(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('projectName', projectName.trim())
      formData.append('material', material.trim())
      formData.append('thickness', thickness.trim())
      formData.append('quantity', String(quantity))
      if (file) formData.append('cadFile', file)

      const token = localStorage.getItem('rmasc_token')
      const res = await fetch('/api/standalone-parts/create', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur ${res.status}` }))
        throw new Error(err.error || `Erreur ${res.status}`)
      }

      const data = await res.json()
      setMessage({ type: 'success', text: `✅ Pièce créée: ${data.part.partNumber}` })
      setProjectName('')
      setMaterial('')
      setThickness('')
      setQuantity(1)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadParts()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.03]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-base font-extrabold text-white flex items-center gap-2">
            <Icon name="Wrench" className="w-5 h-5 text-amber-400" />
            Atelier Pièces Solo
          </h1>
          <span className="text-[10px] text-white/80 font-medium bg-white/[0.06] px-2 py-0.5 rounded-full">Ingénieur CAD</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
          {/* ── LEFT: Submission Form ─────────────────────────────────── */}
          <div className="w-full lg:w-96 flex-shrink-0 space-y-5">
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/5 shadow-lg p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Icon name="Wrench" className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-sm font-bold text-white">Nouvelle Pièce Solo</h3>
              </div>

              {/* Project Name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1 block">Nom du Projet *</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="ex: Support Moteur Custom"
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1 block">Plan 2D (DXF/DWG/PDF)</label>
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
                    accept=".dxf,.dwg,.pdf,.png,.jpg,.jpeg"
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
                      <span className="text-2xl">📂</span>
                      <p className="text-xs font-semibold text-white/80">Glissez-déposez votre fichier</p>
                      <p className="text-[10px] text-white/50">DXF, DWG, PDF — Cliquez pour parcourir</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback message */}
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
                  <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Création en cours...</>
                ) : (
                  <><Icon name="Upload" className="w-4 h-4" /> Soumettre la Pièce</>
                )}
              </button>
            </div>
          </div>

          {/* ── RIGHT: History Table ────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/5 shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Icon name="Package" className="w-4 h-4 text-amber-400" />
                  Historique des Pièces Solo
                </h3>
                <span className="text-[10px] text-white/80 font-medium bg-white/[0.06] px-2 py-0.5 rounded-full">{allParts.length} pièce(s)</span>
              </div>

              {allParts.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-4xl block mb-3">📦</span>
                  <p className="text-sm text-white/80 font-medium">Aucune pièce solo créée.</p>
                  <p className="text-xs text-white/50 mt-1">Soumettez votre première pièce via le formulaire.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">N° Pièce</th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Projet</th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Matériau</th>
                        <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Épaisseur</th>
                        <th className="text-center px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Qté</th>
                        <th className="text-center px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Statut</th>
                        <th className="text-right px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-white/80">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {allParts.map(part => {
                        const badge = statusBadge(part.status)
                        return (
                          <tr key={part._id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="px-5 py-3">
                              <span className="text-sm font-mono font-bold text-amber-400">{part.partNumber}</span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-sm font-medium text-white">{part.projectName}</span>
                              {part.createdBy && (
                                <p className="text-[10px] text-white/50">{part.createdBy}</p>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs text-white/80">{part.material || '—'}</span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs text-white/80">{part.thickness || '—'}</span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="text-sm font-bold text-white">{part.quantity}</span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-xs text-white/80 font-mono">{fmtDate(part.createdAt)}</span>
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
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PRODUCTION VIEW — Commandes Pièces Solo (shop-floor tracking)
// ═══════════════════════════════════════════════════════════════════════════
function ProductionView({ onBack }: { onBack?: () => void }) {
  const [parts, setParts] = useState<StandalonePart[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadParts = useCallback(async () => {
    try {
      const data: StandalonePart[] = await apiFetch('/standalone-parts/active')
      setParts(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadParts() }, [loadParts])
  useEffect(() => {
    const iv = setInterval(loadParts, 8_000)
    const onFocus = () => loadParts()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) loadParts() })
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [loadParts])

  const updateStatus = async (id: string, newStatus: 'EN_PRODUCTION' | 'TERMINE') => {
    setUpdatingId(id)
    try {
      const token = localStorage.getItem('rmasc_token')
      const res = await fetch(`/api/standalone-parts/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Erreur ${res.status}` }))
        throw new Error(err.error)
      }
      loadParts()
    } catch (e: any) {
      console.error('Status update failed:', e)
    } finally {
      setUpdatingId(null)
    }
  }

  const enAttente = parts.filter(p => p.status === 'EN_ATTENTE')
  const enProduction = parts.filter(p => p.status === 'EN_PRODUCTION')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/[0.03]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-base font-extrabold text-white flex items-center gap-2">
            <Icon name="Play" className="w-4 h-4 text-amber-400" />
            Commandes Pièces Solo
          </h1>
          <span className="text-[10px] text-white/80 font-medium bg-white/[0.06] px-2 py-0.5 rounded-full">Atelier — Production</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/80">
            <span className="text-amber-400 font-bold">{enAttente.length}</span> en attente ·{' '}
            <span className="text-sky-400 font-bold">{enProduction.length}</span> en cours
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── EN ATTENTE ─────────────────────────────────────────────── */}
          {enAttente.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">En Attente · {enAttente.length} pièce{enAttente.length > 1 ? 's' : ''}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enAttente.map(part => (
                  <PartCard
                    key={part._id}
                    part={part}
                    updating={updatingId === part._id}
                    onStart={() => updateStatus(part._id, 'EN_PRODUCTION')}
                    onComplete={() => updateStatus(part._id, 'TERMINE')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── EN PRODUCTION ──────────────────────────────────────────── */}
          {enProduction.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">En Cours de Découpe · {enProduction.length} pièce{enProduction.length > 1 ? 's' : ''}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enProduction.map(part => (
                  <PartCard
                    key={part._id}
                    part={part}
                    updating={updatingId === part._id}
                    onStart={() => updateStatus(part._id, 'EN_PRODUCTION')}
                    onComplete={() => updateStatus(part._id, 'TERMINE')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Empty state ────────────────────────────────────────────── */}
          {parts.length === 0 && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <span className="text-5xl block mb-4">🏭</span>
                <p className="text-lg font-bold text-white/80">Aucune pièce en attente</p>
                <p className="text-sm text-white/50 mt-1">L'atelier est vide. En attente de nouvelles soumissions de l'ingénieur.</p>
              </div>
            </div>
          )}

          {/* ── RÉCEMMENT TERMINÉES ────────────────────────────────────── */}
          {enAttente.length === 0 && enProduction.length === 0 && parts.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                  ✅ Toutes les pièces terminées · {parts.length} pièce{parts.length > 1 ? 's' : ''}
                </h3>
              </div>
              <p className="text-xs text-white/60 ml-4">
                Ces pièces ont été archivées. Elles ne sont plus visibles dans les files actives. L'Ingénieur 2 peut les consulter dans son historique.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Part Card (Production View) ─────────────────────────────────────────
function PartCard({ part, updating, onStart, onComplete }: {
  part: StandalonePart
  updating: boolean
  onStart: () => void
  onComplete: () => void
}) {
  const isPending = part.status === 'EN_ATTENTE'
  const isActive = part.status === 'EN_PRODUCTION'
  const isDone = part.status === 'TERMINE'
  const [downloading, setDownloading] = useState(false)

  const badge = statusBadge(part.status)

  // ── Authenticated download for /uploads/... paths ──
  const handleDownloadPlan = async () => {
    if (!part.cadFileUrl) return
    setDownloading(true)
    try {
      const token = localStorage.getItem('rmasc_token')
      const res = await fetch(part.cadFileUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Extract filename from path: /uploads/123456-file.pdf → file.pdf
      const fileName = part.cadFileUrl.split('/').pop() || part.projectName
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      // Fallback: open in new tab (browser may prompt login)
      window.open(part.cadFileUrl, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className={`rounded-2xl p-5 shadow-lg transition-all border ${
      isPending
        ? 'bg-amber-500/5 border-amber-500/20'
        : isActive
          ? 'bg-sky-500/5 border-sky-500/20'
          : 'bg-white/[0.04] border-white/5'
    }`}>
      {/* Part header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-mono font-bold text-amber-400">{part.partNumber}</span>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-4">
        <p className="text-sm font-bold text-white">{part.projectName}</p>
        <div className="flex items-center gap-3 text-xs text-white/80">
          {part.material && <span>🧱 {part.material}</span>}
          {part.thickness && <span>📏 {part.thickness}</span>}
          <span className="font-bold text-white">×{part.quantity}</span>
        </div>
        {part.createdBy && (
          <p className="text-[10px] text-white/50">Par: {part.createdBy}</p>
        )}
      </div>

      {/* Download CAD button — authenticated fetch */}
      {part.cadFileUrl && (
        <button
          onClick={handleDownloadPlan}
          disabled={downloading}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.10] hover:border-amber-500/30 text-white/80 hover:text-amber-400 text-xs font-bold transition-all mb-3 disabled:opacity-50"
        >
          {downloading ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Icon name="Download" className="w-3.5 h-3.5" />
          )}
          Télécharger Plan 2D
        </button>
      )}

      {/* Status toggles */}
      <div className="flex gap-2">
        {isPending && (
          <button
            onClick={onStart}
            disabled={updating}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {updating ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Icon name="Play" className="w-3 h-3" />
            )}
            Lancer la Découpe
          </button>
        )}
        {isActive && (
          <button
            onClick={onComplete}
            disabled={updating}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {updating ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Icon name="CheckCircle" className="w-3 h-3" />
            )}
            Terminé
          </button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — Renders Ingenieur or Production view based on user role
// ═══════════════════════════════════════════════════════════════════════════
export default function PiecesSoloWorkspace({ onBack, session }: Props) {
  const role = session?.role || ''

  if (role === 'INGENIEUR_2') {
    return <IngenieurView onBack={onBack} />
  }

  if (role === 'PRODUCTION') {
    return <ProductionView onBack={onBack} />
  }

  // Fallback: should never render due to role guard in Dashboard
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <span className="text-4xl block mb-3">🔒</span>
        <p className="text-sm text-white/80 font-medium">Accès réservé à l'Ingénieur 2 et à la Production.</p>
      </div>
    </div>
  )
}
