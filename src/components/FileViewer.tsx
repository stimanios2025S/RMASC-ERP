// ─── RMASC FACTORY — Professional File Viewer ──────────────────────────
// Supports both base64 (legacy) and server URLs (new backend-stored files).
// Used by Admin, Ingénieurs, Production, Stock — all roles can view/download.

import { useEffect, useRef, useState } from 'react'

interface Props {
  fileData?: string | null      // base64 data URL (legacy) or server API path
  fileName?: string
  fileType?: string
  stampApproved?: boolean
  stampDate?: string
  stampBy?: string
  fileUrl?: string             // server file URL: /api/orders/:id/files/:fileId
}

export default function FileViewer({ fileData, fileName, fileType, stampApproved, stampDate, stampBy, fileUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)

  // Resolve display source: server URL takes precedence over base64
  const displaySrc = fileUrl || fileData

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const h = (e: MouseEvent) => { e.preventDefault(); return false }
    el.addEventListener('contextmenu', h)
    return () => el.removeEventListener('contextmenu', h)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
      setFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setFullscreen(false)
    }
  }

  const handleDownload = () => {
    if (!fileName) return
    if (fileUrl) {
      // Server-stored file — direct download via API
      const a = document.createElement('a')
      a.href = fileUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return
    }
    if (!fileData) return
    // Legacy base64 download
    try {
      let blob: Blob
      if (fileData.startsWith('data:')) {
        const parts = fileData.split(',')
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream'
        const raw = atob(parts[1])
        const bytes = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
        blob = new Blob([bytes], { type: mime })
      } else {
        blob = new Blob([fileData], { type: 'application/octet-stream' })
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      const a = document.createElement('a')
      a.href = fileData
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  if (!displaySrc) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0a0f1a] text-slate-400 rounded-xl border border-slate-700">
        <span className="text-5xl mb-4">📄</span>
        <p className="text-sm font-medium">Aucun fichier déposé pour cette commande</p>
        <p className="text-xs mt-1 text-slate-500">Déposez un fichier pour le visualiser ici</p>
      </div>
    )
  }

  const isImage = fileType?.startsWith('image/')
  const isPDF = fileType === 'application/pdf'

  return (
    <div
      ref={containerRef}
      className={`relative bg-[#0a0f1a] rounded-xl border border-slate-700 overflow-hidden select-none flex flex-col ${fullscreen ? 'fixed inset-0 z-[100] rounded-none border-0' : ''}`}
      onContextMenu={e => e.preventDefault()}
      style={{ height: fullscreen ? '100vh' : '100%' }}
    >
      {/* ─── Professional Toolbar ─── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#1a2332] to-[#111827] border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-sm flex-shrink-0">
            {isImage ? '🖼️' : isPDF ? '📄' : '📁'}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-white truncate max-w-[280px]">{fileName || 'Document'}</p>
            <p className="text-[9px] text-slate-400">{fileType || 'inconnu'} {fileUrl ? '• Serveur' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold flex items-center justify-center transition-colors" title="Zoom avant">+</button>
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold flex items-center justify-center transition-colors" title="Zoom arrière">−</button>
          <span className="text-[10px] text-slate-400 font-mono min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
          <div className="w-px h-6 bg-slate-600 mx-1" />
          <button onClick={toggleFullscreen}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center transition-colors" title="Plein écran">⛶</button>
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm" title="Télécharger le fichier">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span className="hidden sm:inline">Télécharger</span>
          </button>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-[#0b1120] relative" style={{ height: fullscreen ? 'calc(100vh - 46px)' : 'calc(100% - 46px)' }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }}>
          {isImage ? (
            <img src={displaySrc} alt={fileName || 'Upload'} className="max-w-full rounded-lg shadow-2xl" style={{ maxHeight: '80vh' }} />
          ) : isPDF ? (
            <embed src={displaySrc} type="application/pdf" className="w-full rounded-lg shadow-2xl" style={{ minWidth: 600, height: '80vh' }} />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <span className="text-6xl mb-4">📁</span>
              <p className="text-sm font-medium text-slate-300">{fileName || 'Fichier'}</p>
              <p className="text-xs mt-1">Type de fichier non affichable directement</p>
              <button onClick={handleDownload}
                className="mt-4 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-md flex items-center gap-2">
                ⬇️ Télécharger le fichier
              </button>
            </div>
          )}
        </div>

        {stampApproved && (
          <div className="absolute pointer-events-none select-none"
            style={{ bottom: 30, right: 30, transform: 'rotate(-12deg)', opacity: 0.45, filter: 'drop-shadow(0 3px 8px rgba(220,38,38,0.3))' }}>
            <svg width="170" height="72" viewBox="0 0 170 72">
              <defs><linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#dc2626" /><stop offset="100%" stopColor="#991b1b" /></linearGradient></defs>
              <rect x="0" y="0" width="170" height="68" rx="6" fill="url(#sg2)" stroke="#7f1d1d" strokeWidth="2" />
              <rect x="3" y="3" width="164" height="62" rx="4" fill="none" stroke="#fca5a5" strokeWidth="0.6" strokeDasharray="3,3" />
              <text x="85" y="22" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="system-ui" letterSpacing="1">APPROUVÉ</text>
              <text x="85" y="40" textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="bold" fontFamily="system-ui">{stampBy || 'RMASC'}</text>
              {stampDate && <text x="85" y="58" textAnchor="middle" fill="#fca5a5" fontSize="6" fontWeight="bold" fontFamily="system-ui">{stampDate}</text>}
            </svg>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-4 py-2 bg-[#0d1520] border-t border-slate-700 flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span>🔒</span> {fileName || 'Document'}
        </span>
        <button onClick={handleDownload} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
          ⬇️ Télécharger
        </button>
      </div>
    </div>
  )
}
