// ─── RMASC FACTORY — Professional PDF Viewer ────────────────────────────
// Dedicated PDF viewer integrated into the platform for admin use.
// Supports base64 data URLs and authenticated server URLs via fetch() → blob.

import { useState, useRef, useEffect } from 'react'

interface Props {
  data: string          // base64 data URL or server API URL
  fileName?: string
  onClose?: () => void
}

export default function PDFViewer({ data, fileName, onClose }: Props) {
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [embedError, setEmbedError] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  // ── If data is a server URL (starts with /api/), fetch with auth to get blob ──
  useEffect(() => {
    if (!data) return
    const isServerUrl = data.startsWith('/api/')
    if (!isServerUrl) {
      setBlobUrl(null) // base64 — use directly
      return
    }
    const token = localStorage.getItem('rmasc_token')
    let cancelled = false
    fetch(data, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then(blob => {
        if (!cancelled) {
          const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
          setBlobUrl(url)
        }
      })
      .catch(() => {
        if (!cancelled) setEmbedError(true)
      })
    return () => { cancelled = true; if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [data])

  // Handle fullscreen changes
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const displaySrc = blobUrl || data
  const isBase64PDF = data?.startsWith('data:application/pdf')
  const isServerUrl = data?.startsWith('/api/')

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-800/60 rounded-xl border border-slate-700/50">
        <p className="text-white/70 text-sm">Aucun PDF à afficher.</p>
      </div>
    )
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  const handleDownload = async () => {
    if (isServerUrl && !isBase64PDF) {
      const token = localStorage.getItem('rmasc_token')
      try {
        const res = await fetch(data, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Download failed')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = fileName || 'document.pdf'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 2000)
        return
      } catch { /* fallback below */ }
    }
    const a = document.createElement('a')
    a.href = displaySrc
    a.download = fileName || 'document.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleOpenInNewTab = () => {
    window.open(displaySrc, '_blank')
  }

  const isValid = isBase64PDF || data.endsWith('.pdf') || data.includes('/pdf')

  return (
    <div
      ref={containerRef}
      className={`relative bg-[#0a0f1a] rounded-xl border border-slate-700 overflow-hidden select-none flex flex-col ${
        fullscreen ? 'fixed inset-0 z-[100] rounded-none border-0' : ''
      }`}
      style={{ height: fullscreen ? '100vh' : '100%', minHeight: fullscreen ? undefined : 400 }}
    >
      {/* ─── Toolbar ─── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#1a2332] to-[#111827] border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-sm flex-shrink-0">📄</div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-white truncate max-w-[200px]">{fileName || 'Document PDF'}</p>
            <p className="text-[9px] text-white/70">PDF • {isServerUrl ? 'Serveur' : 'Base64'} {blobUrl ? '• Chargé' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold flex items-center justify-center transition-colors" title="Zoom avant">+</button>
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold flex items-center justify-center transition-colors" title="Zoom arrière">−</button>
          <span className="text-[10px] text-white/70 font-mono min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>

          <div className="w-px h-6 bg-slate-600 mx-1" />

          {/* Fullscreen */}
          <button onClick={toggleFullscreen}
            className="w-7 h-7 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center transition-colors" title="Plein écran">⛶</button>

          {/* Download */}
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm">
            ⬇️ Télécharger
          </button>

          {onClose && (
            <>
              <div className="w-px h-6 bg-slate-600 mx-1" />
              <button onClick={onClose}
                className="w-7 h-7 rounded-md bg-slate-700 hover:bg-red-600 text-white text-xs flex items-center justify-center transition-colors" title="Fermer">✕</button>
            </>
          )}
        </div>
      </div>

      {/* ─── PDF Content ─── */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-[#0b1120] relative">
        {isValid && displaySrc && !embedError ? (
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }}>
            <embed
              src={displaySrc}
              type="application/pdf"
              className="rounded-lg shadow-2xl"
              style={{ width: fullscreen ? '85vw' : '100%', minWidth: zoom > 1 ? 800 : 600, height: fullscreen ? '85vh' : '70vh' }}
              onError={() => setEmbedError(true)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-white/70">
            <span className="text-6xl mb-4">📄</span>
            <p className="text-sm font-medium text-white/80">{fileName || 'Document'}</p>
            <p className="text-xs mt-1 mb-4">Ce fichier ne peut pas être affiché directement.</p>
            <div className="flex items-center gap-3">
              <button onClick={handleDownload}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-md flex items-center gap-2">
                ⬇️ Télécharger
              </button>
              <button onClick={handleOpenInNewTab}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-md flex items-center gap-2">
                ↗️ Ouvrir dans un nouvel onglet
              </button>
            </div>
          </div>
        )}
        {embedError && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-400 flex items-center justify-between">
            <span>Impossible de charger le PDF dans l'aperçu intégré.</span>
            <button onClick={() => { setEmbedError(false); handleDownload() }}
              className="text-emerald-400 hover:text-emerald-300 font-bold underline text-xs">
              ⬇️ Télécharger
            </button>
          </div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <div className="flex-shrink-0 px-4 py-2 bg-[#0d1520] border-t border-slate-700 flex items-center justify-between text-[10px]">
        <span className="text-white/50 font-medium">📄 {fileName || 'Document PDF'}</span>
        <div className="flex items-center gap-3">
          <button onClick={handleOpenInNewTab} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            ↗️ Nouvel onglet
          </button>
          <button onClick={handleDownload} className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            ⬇️ Télécharger
          </button>
        </div>
      </div>
    </div>
  )
}
