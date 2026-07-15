// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Agent Image Inspector
//  L'utilisateur peut uploader une image (photo de cabine, plan technique, etc.)
//  et Salim analyse l'image et donne des informations contextuelles.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useRef } from 'react'

interface ImageInspectorProps {
  onClose: () => void
  onAnalyze: (imageData: string, fileName: string) => Promise<string>
}

export default function ImageInspector({ onClose, onAnalyze }: ImageInspectorProps) {
  const [image, setImage] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file) return
    setFileName(file.name)
    setFileSize((file.size / 1024).toFixed(1) + ' KB')
    setAnalysis(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImage(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  const handleAnalyze = async () => {
    if (!image || loading) return
    setLoading(true)
    try {
      const result = await onAnalyze(image, fileName)
      setAnalysis(result)
    } catch (err: any) {
      setAnalysis(`❌ Erreur d'analyse : ${err.message}`)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">👁️</div>
            <div>
              <h3 className="text-sm font-bold text-white">Inspecteur d'Image</h3>
              <p className="text-[10px] text-slate-400">Salim analyse vos photos et plans techniques</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs">✕</button>
        </div>

        <div className="p-5">
          {/* Drop zone */}
          {!image && (
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-slate-600 rounded-2xl p-10 text-center cursor-pointer hover:border-amber-500/50 hover:bg-slate-800/50 transition-all group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📸</div>
              <p className="text-sm font-semibold text-white mb-1">Cliquez pour uploader une image</p>
              <p className="text-xs text-slate-400">Photo de cabine, plan technique, schéma, document scanné...</p>
              <p className="text-[10px] text-slate-500 mt-2">ou glissez-déposez ici • PNG, JPG, JPEG, WEBP</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
            </div>
          )}

          {/* Preview */}
          {image && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 max-h-[400px] flex items-center justify-center">
                <img src={image} alt={fileName} className="max-w-full max-h-[400px] object-contain" />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{fileName}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{fileSize}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setImage(null); setAnalysis(null) }}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all text-xs font-medium"
                  >
                    🔄 Changer
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:from-amber-400 hover:to-orange-500 transition-all text-xs disabled:opacity-50 shadow-lg"
                  >
                    {loading ? '⏳ Analyse...' : '🔍 Analyser avec Salim'}
                  </button>
                </div>
              </div>

              {/* Analysis result */}
              {analysis && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <span>🤖</span>
                    <span className="text-xs font-bold text-amber-400">Salim — Analyse</span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{analysis}</p>
                </div>
              )}

              {!loading && !analysis && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <p className="text-xs text-slate-400 text-center">
                    👆 Cliquez sur <strong className="text-amber-400">"Analyser avec Salim"</strong> pour que j'inspecte cette image.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between text-[9px] text-slate-500">
          <span>📸 Formats supportés : PNG, JPG, JPEG, WEBP</span>
          <span>Protection : Images non partagées</span>
        </div>
      </div>
    </div>
  )
}
