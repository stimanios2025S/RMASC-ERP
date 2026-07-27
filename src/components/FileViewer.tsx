// ─── RMASC FACTORY — File Viewer (SIMPLIFIED) ───────────────────────────
// Fetches server files with auth headers → creates blob URL → renders via iframe.
// If fetch fails → shows download button only.

import { useEffect, useRef, useState } from 'react'

interface Props {
  fileData?: string | null
  fileName?: string
  fileType?: string
  stampApproved?: boolean
  stampDate?: string
  stampBy?: string
  fileUrl?: string
}

export default function FileViewer({ fileData, fileName, fileType, stampApproved, stampDate, stampBy, fileUrl }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPDF = fileType === 'application/pdf'
  const isImage = fileType?.startsWith('image/')

  // Fetch server PDF with auth → create blob URL
  useEffect(() => {
    if (!fileUrl || !isPDF) return
    setLoading(true)
    setError(null)
    let cancelled = false
    const token = localStorage.getItem('rmasc_token')
    fetch(fileUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => { if (!r.ok) throw new Error('Erreur ' + r.status); return r.blob() })
      .then(blob => { if (!cancelled) { setBlobUrl(URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [fileUrl, isPDF])

  const handleDownload = () => {
    if (fileUrl) window.open(fileUrl, '_blank')
    else if (fileData) window.open(fileData, '_blank')
  }

  // Empty state
  if (!fileUrl && !fileData) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0a0f1a] text-white rounded-xl border border-slate-700">
        <span className="text-5xl mb-4">📄</span>
        <p className="text-sm font-medium">Aucun fichier déposé pour cette commande</p>
        <p className="text-xs mt-1 text-white/60">Déposez un fichier pour le visualiser ici</p>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0a0f1a] text-white rounded-xl border border-slate-700">
        <div className="w-10 h-10 rounded-full border-3 border-amber-500/30 border-t-amber-500 animate-spin mb-4" />
        <p className="text-sm font-medium">Chargement du document...</p>
        <button onClick={handleDownload} className="mt-4 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
          ⬇️ Télécharger
        </button>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0a0f1a] text-white rounded-xl border border-slate-700">
        <span className="text-5xl mb-4">⚠️</span>
        <p className="text-sm font-medium text-red-400">Erreur de chargement</p>
        <p className="text-xs mt-1 text-white/50">{error}</p>
        <button onClick={handleDownload} className="mt-4 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
          ⬇️ Télécharger le fichier
        </button>
      </div>
    )
  }

  // Ready: display file
  const displaySrc = blobUrl || fileData

  return (
    <div className="h-full flex flex-col bg-[#0a0f1a] rounded-xl border border-slate-700 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a2332] border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{isImage ? '🖼️' : isPDF ? '📄' : '📁'}</span>
          <span className="text-sm font-bold text-white truncate">{fileName || 'Document'}</span>
        </div>
        <button onClick={handleDownload} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
          ⬇️ Télécharger
        </button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 relative">
        {isImage ? (
          <img src={displaySrc} alt={fileName} className="max-w-full rounded-lg" style={{ maxHeight: '80vh' }} />
        ) : isPDF && displaySrc ? (
          <iframe src={displaySrc} className="w-full rounded-lg" style={{ minWidth: 600, height: '80vh' }} title={fileName} />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-white">
            <span className="text-5xl mb-4">📁</span>
            <p className="text-sm mb-4">Type de fichier non affichable</p>
            <button onClick={handleDownload} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
              ⬇️ Télécharger
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
