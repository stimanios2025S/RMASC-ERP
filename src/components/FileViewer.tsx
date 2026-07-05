// ─── RMASC FACTORY — Professional File Viewer with Download ────────────
// Used by Admin, Ingénieurs, Production, Stock — all roles can download files.

import { useEffect, useRef, useState } from 'react'

interface Props {
  fileData?: string | null
  fileName?: string
  fileType?: string
  stampApproved?: boolean
  stampDate?: string
  stampBy?: string
}

export default function FileViewer({ fileData, fileName, fileType, stampApproved, stampDate, stampBy }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)

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
    if (!fileData || !fileName) return
    const a = document.createElement('a')
    a.href = fileData
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (!fileData) {
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
            <p className="text-[9px] text-slate-400">{fileType || 'inconnu'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold flex items-center justify-center transition-colors" title="Zoom avant">+</button>
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold flex items-center justify-center transition-colors" title="Zoom arrière">−</button>
          <span className="text-[10px] text-slate-400 font-mono min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>

          <div className="w-px h-6 bg-slate-600 mx-1" />

          {/* Fullscreen */}
          <button onClick={toggleFullscreen}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center transition-colors" title="Plein écran">⛶</button>

          {/* ⬇️ DOWNLOAD BUTTON — for ALL roles */}
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
            <img src={fileData} alt={fileName || 'Upload'} className="max-w-full rounded-lg shadow-2xl" style={{ maxHeight: '80vh' }} />
          ) : isPDF ? (
            <embed src={fileData} type="application/pdf" className="w-full rounded-lg shadow-2xl" style={{ minWidth: 600, height: '80vh' }} />
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
            style={{ bottom: 40, right: 40, transform: 'rotate(-15deg)', opacity: 0.55, filter: 'drop-shadow(0 4px 12px rgba(220,38,38,0.4))' }}>
            <svg width="200" height="80" viewBox="0 0 200 80">
              <defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#dc2626" /><stop offset="100%" stopColor="#991b1b" /></linearGradient></defs>
              <rect x="0" y="0" width="200" height="75" rx="8" fill="url(#sg)" stroke="#7f1d1d" strokeWidth="2.5" />
              <rect x="4" y="4" width="192" height="67" rx="6" fill="none" stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="3,3" />
              <text x="100" y="28" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="system-ui" letterSpacing="1.5">ACCEPTATION</text>
              <text x="100" y="48" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="bold" fontFamily="system-ui">RMASC FACTORY</text>
              {stampDate && <text x="100" y="68" textAnchor="middle" fill="#fca5a5" fontSize="7" fontWeight="bold" fontFamily="system-ui">{stampDate}</text>}
            </svg>
          </div>
        )}
      </div>

      {/* ─── Footer with download reminder ─── */}
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
