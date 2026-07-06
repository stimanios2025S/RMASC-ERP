// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Universal File Manager
//  Drop-in component for any order detail view across ALL portals.
//  Features: upload, delete, list files with download, order selector.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { getUploads, addUpload } from '../config/runtime-store'

interface Props {
  orderId: string
  orderSerial?: string
  engineerName?: string
  compact?: boolean
  onFileChange?: () => void
}

export default function FileManager({ orderId, orderSerial, engineerName, compact, onFileChange }: Props) {
  const [files, setFiles] = useState<Array<{ id: string; fileName: string; engineer: string; uploadedAt: string; size: string; type: string }>>([])
  const [uploadedFile, setUploadedFile] = useState<{ name: string } | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const loadVault = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')
      setFiles(raw.filter((f: any) => f.orderId === orderId))
    } catch {}
  }, [orderId])

  useEffect(() => { loadVault() }, [loadVault])

  const showFeedback = (ok: boolean, msg: string) => {
    setFeedback({ ok, msg })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleFileDrop = (file: File) => {
    setUploadedFile({ name: file.name })
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = reader.result as string
      addUpload(orderId, { data: b64, name: file.name, type: file.type, uploadedAt: new Date().toISOString() })
      try {
        const raw = JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')
        raw.push({ id: 'f_' + Date.now(), orderId, fileName: file.name, engineer: engineerName || 'Administrateur', uploadedAt: new Date().toISOString(), size: (file.size / 1024).toFixed(1) + ' KB', type: file.type })
        localStorage.setItem('rmasc_vault_files', JSON.stringify(raw))
        setFiles(raw.filter((f: any) => f.orderId === orderId))
        showFeedback(true, `✅ "${file.name}" ajouté`)
        onFileChange?.()
      } catch { showFeedback(false, '⚠️ Erreur de sauvegarde') }
    }
    reader.readAsDataURL(file)
  }

  const deleteFile = (fileId: string, fileName: string) => {
    try {
      const raw = JSON.parse(localStorage.getItem('rmasc_vault_files') || '[]')
      const updated = raw.filter((f: any) => f.id !== fileId)
      localStorage.setItem('rmasc_vault_files', JSON.stringify(updated))
      setFiles(updated.filter((f: any) => f.orderId === orderId))
      showFeedback(true, `🗑️ "${fileName}" supprimé`)
      onFileChange?.()
    } catch { showFeedback(false, '⚠️ Erreur de suppression') }
  }

  const handleUploadClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '*/*'
    input.onchange = (ev: any) => { const f = ev.target?.files?.[0]; if (f) handleFileDrop(f) }
    input.click()
  }

  // ── Compact variant (inline for expanded order cards) ──
  if (compact) {
    return (
      <div className="space-y-2">
        {feedback && (
          <div className={`text-xs font-medium px-3 py-1.5 rounded-lg ${feedback.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {feedback.msg}
          </div>
        )}

        {/* File list */}
        {files.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              📎 Documents ({files.length})
            </p>
            <div className="space-y-1">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-slate-100 hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm">{f.type.includes('pdf') ? '📄' : (f.type.includes('dwg') || f.type.includes('image') ? '📐' : '📎')}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{f.fileName}</p>
                      <p className="text-[9px] text-slate-400">{f.size} — {f.engineer}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteFile(f.id, f.fileName)}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-500 text-[10px] font-semibold transition-all flex-shrink-0 ml-2"
                    title="Supprimer">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload zone */}
        <div onClick={handleUploadClick}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileDrop(f) }}
          className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${uploadedFile ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-surface-50 hover:border-slate-400 hover:bg-slate-100'}`}>
          {uploadedFile ? (
            <p className="text-sm text-emerald-600 font-semibold">✅ {uploadedFile.name}</p>
          ) : (
            <><p className="text-sm font-semibold text-slate-600 mb-0.5">📂 Ajouter un fichier</p><p className="text-xs text-slate-400">Cliquez ou glissez-déposez</p></>
          )}
        </div>
      </div>
    )
  }

  // ── Full variant (professional card) ──
  return (
    <div className="bg-surface-50 rounded-2xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📁</span>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Gestion des Fichiers</h3>
            {orderSerial && <p className="text-[10px] text-slate-400 font-mono">{orderSerial}</p>}
          </div>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">{files.length} fichier{files.length > 1 ? 's' : ''}</span>
      </div>

      {feedback && (
        <div className={`mx-5 mt-3 text-xs font-medium px-3 py-2 rounded-lg ${feedback.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Upload drop zone */}
        <div onClick={handleUploadClick}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileDrop(f) }}
          className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all bg-surface-50 border-slate-300 hover:border-amber-400 hover:bg-amber-50/20">
          <span className="text-2xl block mb-2">📤</span>
          <p className="text-sm font-semibold text-slate-600">Cliquez pour ajouter un fichier</p>
          <p className="text-xs text-slate-400 mt-0.5">ou glissez-déposez ici — PDF, DWG, images, tout format</p>
          {uploadedFile && <p className="text-xs text-emerald-600 font-semibold mt-2">✅ {uploadedFile.name} prêt</p>}
        </div>

        {/* File list */}
        {files.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">📋 Fichiers ({files.length})</p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {files.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-surface-50 rounded-xl px-3.5 py-2.5 border border-slate-200 hover:border-amber-200 group transition-all">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg">{f.type.includes('pdf') ? '📄' : (f.type.includes('dwg') || f.type.includes('image') ? '📐' : '📎')}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{f.fileName}</p>
                      <p className="text-[10px] text-slate-400">{f.engineer} • {f.size} • {new Date(f.uploadedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteFile(f.id, f.fileName)}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold transition-all flex items-center gap-1 flex-shrink-0">
                    🗑️ Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl px-4 py-5 text-center">
            <p className="text-xs text-slate-400 italic">Aucun fichier pour cette commande. Ajoutez-en un ci-dessus.</p>
          </div>
        )}
      </div>
    </div>
  )
}
