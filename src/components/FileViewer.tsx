import { useEffect, useRef, useState } from 'react'

interface Props {
  fileData?: string | null  // base64 data
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

  if (!fileData) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0a0f1a] text-slate-400 rounded-xl border border-slate-700">
        <span className="text-5xl mb-4">📄</span>
        <p className="text-sm font-medium">Aucun fichier déposé pour cette commande</p>
        <p className="text-xs mt-1 text-slate-500">Le fichier CAD apparaîtra ici après le dépôt par l'ingénieur</p>
      </div>
    )
  }

  const isImage = fileType?.startsWith('image/')
  const isPDF = fileType === 'application/pdf'

  return (
    <div
      ref={containerRef}
      className={`relative bg-[#0a0f1a] rounded-xl border border-slate-700 overflow-hidden select-none ${fullscreen ? 'fixed inset-0 z-[100] rounded-none border-0' : ''}`}
      onContextMenu={e => e.preventDefault()}
      style={{ userSelect: 'none', height: fullscreen ? '100vh' : '100%' }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#111827] border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm">{isImage ? '🖼️' : isPDF ? '📄' : '📁'}</span>
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide truncate max-w-[300px]">{fileName || 'Document'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold flex items-center justify-center transition-colors">+</button>
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold flex items-center justify-center transition-colors">−</button>
          <span className="text-[10px] text-slate-400 font-mono min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={toggleFullscreen}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center transition-colors">⛶</button>
          <span className="text-[9px] text-slate-400 font-medium ml-2 bg-slate-800 px-2 py-0.5 rounded">
            {fileType || 'inconnu'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-[#0b1120] relative" style={{ height: fullscreen ? 'calc(100vh - 42px)' : 'calc(100% - 42px)' }}>
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
              <a href={fileData} download={fileName || 'document'}
                className="mt-4 px-4 py-2 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-600 transition-all">
                ⬇️ Télécharger le fichier
              </a>
            </div>
          )}
        </div>

        {/* ── Approval Stamp Overlay ── */}
        {stampApproved && (
          <div className="absolute pointer-events-none select-none"
            style={{
              bottom: 40, right: 40,
              transform: 'rotate(-15deg)',
              opacity: 0.55,
              filter: 'drop-shadow(0 4px 12px rgba(220,38,38,0.4))',
            }}
          >
            <svg width="200" height="80" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="stampG" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="200" height="75" rx="8" fill="url(#stampG)" stroke="#7f1d1d" strokeWidth="2.5" />
              <rect x="4" y="4" width="192" height="67" rx="6" fill="none" stroke="#fca5a5" strokeWidth="0.8" strokeDasharray="3,3" />
              <text x="100" y="28" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="system-ui" letterSpacing="1.5">ACCEPTATION</text>
              <text x="100" y="48" textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="bold" fontFamily="system-ui">RMASC FACTORY</text>
              {stampDate && (
                <text x="100" y="68" textAnchor="middle" fill="#fca5a5" fontSize="7" fontWeight="bold" fontFamily="system-ui">{stampDate}</text>
              )}
            </svg>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-2 bg-[#0d1520] border-t border-slate-700 flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span>🔒</span> Visualisation sécurisée — Téléchargement désactivé
        </span>
        <span className="text-cyan-700 font-medium">RMASC FACTORY — Fichier protégé</span>
      </div>
    </div>
  )
}
