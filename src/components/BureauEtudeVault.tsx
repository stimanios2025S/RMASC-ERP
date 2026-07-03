import { useState, useEffect } from 'react'

interface VaultFile {
  id: string
  orderId: string
  fileName: string
  engineer: string
  uploadedAt: string
  size: string
  type: string
}

interface OrderSummary {
  id: string
  serialNumber: string
  clientName: string
  status: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })

// ─── Truncate filename for display ────────────────────────────────────────
function getFileIcon(type: string): string {
  if (type === 'application/pdf') return '📄'
  if (type === 'application/dwg') return '📐'
  if (type.includes('image')) return '🖼️'
  return '📎'
}

// ─── Main Component ────────────────────────────────────────────────────────
interface Props {
  onBack: () => void
  engineerName?: string
}

export default function BureauEtudeVault({ onBack, engineerName }: Props) {
  const [files, setFiles] = useState<VaultFile[]>([])
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    try {
      const vaultRaw = JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')
      const ordersRaw = JSON.parse(localStorage.getItem('rmasc_local_orders') || '[]')
      const filtered = engineerName
        ? vaultRaw.filter((f: any) => f.engineer === engineerName)
        : vaultRaw
      setFiles(filtered)
      setOrders(ordersRaw.map((o: any) => ({ id: o.id, serialNumber: o.serialNumber, clientName: o.clientName, status: o.status })))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [engineerName])

  const getOrderInfo = (orderId: string) => orders.find(o => o.id === orderId)

  // ── Handle file download ────────────────────────────────────────────────
  const handleDownload = (file: VaultFile) => {
    try {
      // Create a simple text blob as placeholder since these are metadata entries
      const content = `RMASC FACTORY — Fichier Technique
Nom: ${file.fileName}
Ingenieur: ${file.engineer}
Date: ${fmtDate(file.uploadedAt)}
Taille: ${file.size}
Reference commande: ${getOrderInfo(file.orderId)?.serialNumber || 'N/A'}`

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setToast(`✅ Telechargement de "${file.fileName}" lance`)
    } catch {
      setToast('⚠️ Erreur lors du telechargement')
    }
    setTimeout(() => setToast(null), 3000)
  }

  const metrics = {
    total: files.length,
    pdf: files.filter(f => f.type === 'application/pdf').length,
    dwg: files.filter(f => f.type === 'application/dwg').length,
    engineers: [...new Set(files.map(f => f.engineer))].length,
  }

  // ── Preview Modal ──────────────────────────────────────────────────────
  if (previewFile) {
    const order = getOrderInfo(previewFile.orderId)
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-surface-50">
          <button onClick={() => setPreviewFile(null)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-all">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Retour au Vault
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Aperçu du fichier</span>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-primary-50/60 via-surface-50 to-surface-50 p-6 flex items-center justify-center">
          <div className="max-w-lg w-full bg-surface-50 rounded-2xl shadow-card border border-gray-50 p-8 space-y-6">
            {/* File icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-2xl bg-primary-50 flex items-center justify-center text-4xl">
                {getFileIcon(previewFile.type)}
              </div>
            </div>

            {/* File info */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">{previewFile.fileName}</h3>
              <p className="text-xs text-gray-400 mt-1">{previewFile.size} • {previewFile.type === 'application/pdf' ? 'Document PDF' : 'Plan DWG'}</p>
            </div>

            {/* Metadata */}
            <div className="bg-gray-50/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Ingenieur</span>
                <span className="font-semibold text-gray-800">{previewFile.engineer}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Ascenseur</span>
                <span className="font-semibold text-gray-800 font-mono">{order?.serialNumber || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Client</span>
                <span className="font-semibold text-gray-800">{order?.clientName || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Date d'upload</span>
                <span className="font-semibold text-gray-800">{fmtDate(previewFile.uploadedAt)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => { setPreviewFile(null); handleDownload(previewFile) }}
                className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Telecharger le fichier
              </button>
              <button onClick={() => setPreviewFile(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">
                Fermer
              </button>
            </div>
          </div>
        </div>

        {/* Toast notification */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
            {toast}
          </div>
        )}
      </div>
    )
  }

  // ── Main list view ──────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-surface-50">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-all">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Retour
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Bureau d'Etude — File Vault</span>
          {engineerName && <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-semibold">{engineerName}</span>}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-primary-50/60 via-surface-50 to-surface-50 p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Fichiers Total', value: metrics.total, icon: '📄', color: 'text-primary-600' },
              { label: 'Documents PDF', value: metrics.pdf, icon: '📑', color: 'text-accent-600' },
              { label: 'Plans DWG', value: metrics.dwg, icon: '📐', color: 'text-emerald-600' },
              { label: 'Ingenieurs', value: metrics.engineers, icon: '👥', color: 'text-slate-600' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-surface-50 rounded-2xl p-4 shadow-card border border-gray-50 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-lg">{kpi.icon}</div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{kpi.label}</p>
                  <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* File Vault Table */}
          <div className="bg-surface-50 rounded-2xl shadow-card border border-gray-50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Tableau des Fichiers Techniques</h3>
              <span className="text-xs text-gray-400">{files.length} fichier{files.length > 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-sm text-gray-400 italic">Chargement...</div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 italic">Aucun fichier trouve.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Nom du fichier</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Ascenseur Associe</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Ingenieur</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Date d'Upload</th>
                      <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Taille</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {files.map(f => {
                      const order = getOrderInfo(f.orderId)
                      return (
                        <tr key={f.id} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{getFileIcon(f.type)}</span>
                              <span className="text-sm font-semibold text-gray-800">{f.fileName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-sm font-mono text-gray-600">{order?.serialNumber || '—'}</span>
                            <p className="text-[10px] text-gray-400">{order?.clientName || ''}</p>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-xs text-gray-600">{f.engineer}</span>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-xs text-gray-400 font-mono">{fmtDate(f.uploadedAt)}</span>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-xs text-gray-500">{f.size}</span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setPreviewFile(f)}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">
                                Visualiser
                              </button>
                              <button onClick={() => handleDownload(f)}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-all flex items-center gap-1">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Telecharger
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
  )
}
