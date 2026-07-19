// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Universal File Manager (Server-Disk Storage)
//  Files are stored on the server disk, NOT in localStorage.
//  All roles (Admin, Ingénieur, Production, Stock) can view/download files.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../config/api'
import FileViewer from './FileViewer'

interface ServerFile {
  _id: string
  id?: string
  originalname: string
  mimetype: string
  size: number
  uploadedBy: string
  uploadedAt: string
  filename: string
}

interface Props {
  orderId: string
  orderSerial?: string
  engineerName?: string
  compact?: boolean
  onFileChange?: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fileIcon(mimetype: string): string {
  if (mimetype?.includes('pdf')) return '📄'
  if (mimetype?.includes('image') || mimetype?.includes('dwg')) return '📐'
  if (mimetype?.includes('zip') || mimetype?.includes('rar')) return '📦'
  return '📎'
}

export default function FileManager({ orderId, orderSerial, engineerName, compact, onFileChange }: Props) {
  const [files, setFiles] = useState<ServerFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [previewFile, setPreviewFile] = useState<ServerFile | null>(null)

  const showFeedback = (ok: boolean, msg: string) => {
    setFeedback({ ok, msg })
    setTimeout(() => setFeedback(null), 3500)
  }

  const loadFiles = useCallback(async () => {
    try {
      const data = await apiFetch(`/orders/${orderId}/files`)
      setFiles(data.files || [])
    } catch { /* order may not exist yet */ }
    finally { setLoading(false) }
  }, [orderId])

  useEffect(() => { loadFiles() }, [loadFiles])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('rmasc_token')
      const res = await fetch(`/api/orders/${orderId}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload échoué' }))
        throw new Error(err.error || 'Upload échoué')
      }

      showFeedback(true, `✅ "${file.name}" uploadé sur le serveur`)
      loadFiles()
      onFileChange?.()
    } catch (err: any) {
      showFeedback(false, err.message || '⚠️ Erreur upload')
    } finally { setUploading(false) }
  }

  const handleDelete = async (fileId: string, fileName: string) => {
    try {
      await apiFetch(`/orders/${orderId}/files/${fileId}`, { method: 'DELETE' })
      showFeedback(true, `🗑️ "${fileName}" supprimé`)
      setFiles(f => f.filter(x => (x._id || x.id) !== fileId))
      onFileChange?.()
    } catch (err: any) {
      showFeedback(false, err.message || '⚠️ Erreur suppression')
    }
  }

  const handleDownload = async (fileId: string, fileName: string) => {
    const token = localStorage.getItem('rmasc_token')
    const url = `/api/orders/${orderId}/files/${fileId}`
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Téléchargement échoué')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch { /* silent */ }
  }

  const getFileUrl = (fileId: string) => `/api/orders/${orderId}/files/${fileId}`

  const openFilePicker = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '*/*'
    input.multiple = true
    input.onchange = (ev: any) => {
      const selected = ev.target?.files
      if (selected) {
        for (let i = 0; i < selected.length; i++) {
          handleUpload(selected[i])
        }
      }
    }
    input.click()
  }

  // ── Build the main content (compact or full) ──────────────────────
  const mainContent = compact ? (
    <div className="space-y-2">
      {feedback && (
        <div className={`text-xs font-medium px-3 py-1.5 rounded-lg ${feedback.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {feedback.msg}
        </div>
      )}

      {loading ? (
        <p className="text-[10px] text-white/50 italic">Chargement...</p>
      ) : files.length > 0 ? (
        <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1.5">
            📎 Documents ({files.length})
          </p>
          <div className="space-y-1">
            {files.map(f => {
              const fid = f._id || f.id || ''
              return (
                <div key={fid} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-2.5 py-1.5 border border-white/5 hover:bg-white/[0.06] transition-all group">
                  <button onClick={() => handleDownload(fid, f.originalname)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                    <span className="text-sm">{fileIcon(f.mimetype)}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{f.originalname}</p>
                      <p className="text-[9px] text-white/50">{formatSize(f.size)} — {f.uploadedBy}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPreviewFile(f)}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-semibold transition-all flex-shrink-0"
                      title="Voir">👁️</button>
                    <button onClick={() => handleDelete(fid, f.originalname)}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-semibold transition-all flex-shrink-0 ml-1"
                      title="Supprimer">🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div onClick={openFilePicker}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach(f => handleUpload(f)) }}
        className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${uploading ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 bg-white/[0.02] hover:border-amber-500/30 hover:bg-amber-500/5'}`}>
        {uploading ? (
          <p className="text-sm text-amber-400 font-semibold">⏳ Upload en cours...</p>
        ) : (
          <><p className="text-sm font-semibold text-white/70 mb-0.5">📂 Ajouter un fichier</p><p className="text-xs text-white/50">Cliquez ou glissez-déposez</p></>
        )}
      </div>
    </div>
  ) : (
    <div className="bg-white/[0.03] rounded-2xl border border-white/5 shadow-sm">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📁</span>
          <div>
            <h3 className="text-sm font-bold text-white">Gestion des Fichiers</h3>
            {orderSerial && <p className="text-[10px] text-white/50 font-mono">{orderSerial}</p>}
          </div>
        </div>
        <span className="text-xs text-white/50 bg-white/[0.04] px-2 py-0.5 rounded font-mono">{files.length} fichier{files.length !== 1 ? 's' : ''}</span>
      </div>

      {feedback && (
        <div className={`mx-5 mt-3 text-xs font-medium px-3 py-2 rounded-lg ${feedback.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="p-5 space-y-4">
        <div onClick={openFilePicker}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach(f => handleUpload(f)) }}
          className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all bg-white/[0.02] border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5">
          <span className="text-2xl block mb-2">📤</span>
          <p className="text-sm font-semibold text-white/70">Cliquez pour ajouter un fichier</p>
          <p className="text-xs text-white/50 mt-0.5">ou glissez-déposez ici — PDF, DWG, images, tout format • stockage serveur illimité</p>
          {uploading && <p className="text-xs text-amber-400 font-semibold mt-2">⏳ Upload en cours...</p>}
        </div>

        {loading ? (
          <div className="text-center py-4"><p className="text-xs text-white/50 italic">Chargement des fichiers...</p></div>
        ) : files.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-white/70 mb-2">📋 Fichiers ({files.length})</p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {files.map(f => {
                const fid = f._id || f.id || ''
                return (
                  <div key={fid} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3.5 py-2.5 border border-white/5 hover:border-amber-500/20 group transition-all">
                    <button onClick={() => handleDownload(fid, f.originalname)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                      <span className="text-lg">{fileIcon(f.mimetype)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{f.originalname}</p>
                        <p className="text-[10px] text-white/50">{f.uploadedBy} • {formatSize(f.size)} • {new Date(f.uploadedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPreviewFile(f)}
                        className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold transition-all flex items-center gap-1 flex-shrink-0">
                        👁️ Voir
                      </button>
                      <button onClick={() => handleDelete(fid, f.originalname)}
                        className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all flex items-center gap-1 flex-shrink-0">
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.02] rounded-xl px-4 py-5 text-center">
            <p className="text-xs text-white/50 italic">Aucun fichier pour cette commande. Ajoutez-en un ci-dessus.</p>
          </div>
        )}
      </div>
    </div>
  )

  // ── Wrap everything with the preview modal ─────────────────────────
  return (
    <>
      {mainContent}
      {previewFile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setPreviewFile(null)}>
          <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 bg-slate-800/50 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <span className="text-lg">{fileIcon(previewFile.mimetype)}</span>
                <div>
                  <p className="text-sm font-bold text-white truncate max-w-md">{previewFile.originalname}</p>
                  <p className="text-[10px] text-white/70">{previewFile.uploadedBy} • {formatSize(previewFile.size)}</p>
                </div>
              </div>
              <button onClick={() => setPreviewFile(null)}
                className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-red-500 text-white text-sm flex items-center justify-center transition-colors">
                ✕
              </button>
            </div>
            <div className="flex-1 bg-[#0a0f1a] overflow-hidden">
              <FileViewer
                fileUrl={getFileUrl((previewFile._id || previewFile.id) as string)}
                fileName={previewFile.originalname}
                fileType={previewFile.mimetype}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
