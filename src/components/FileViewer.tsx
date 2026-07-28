// ─── RMASC FACTORY — File Viewer (PROFESSIONAL) ────────────────────────
// STRATÉGIE : pas de fetch/attente. Le PDF est streamé directement via
// iframe avec le token JWT en query param. Le navigateur charge et affiche
// progressivement sans attendre le téléchargement complet.
// Résultat : PDF visible en < 1 seconde quelle que soit la taille.
//
// L'image est affichée directement depuis son URL (le navigateur stream).
// Les autres fichiers → bouton de téléchargement uniquement.

import { useState } from 'react'

interface Props {
  fileData?: string | null
  fileName?: string
  fileType?: string
  stampApproved?: boolean
  stampDate?: string
  stampBy?: string
  fileUrl?: string
}

export default function FileViewer({ fileData, fileName, fileType, fileUrl }: Props) {
  const [embedError, setEmbedError] = useState(false)

  const isPDF = fileType === 'application/pdf'
  const isImage = fileType?.startsWith('image/')

  // Construire l'URL avec token pour le iframe (auth bypass via query param)
  // Utilise l'IP directe du serveur pour les fichiers PDF (évite le buffer Cloudflare)
  const token = localStorage.getItem('rmasc_token')
  const isCloudflare = window.location.hostname.includes('sarl-rmasc') || window.location.hostname.includes('cloudflare')

  // Pour les fichiers PDF via Cloudflare, on utilise l'IP directe pour éviter le buffering
  // Le token JWT est passé en query param pour l'auth
  const directServerUrl = isCloudflare && fileUrl
    ? fileUrl.replace(window.location.origin, 'http://100.73.62.52:4001')
    : fileUrl

  const directUrl = directServerUrl && token
    ? `${directServerUrl}${directServerUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
    : null

  // Source finale d'affichage : URL directe (avec token) ou base64 (legacy)
  const displaySrc = (directUrl || fileData) ?? undefined

  const handleDownload = () => {
    // Use authed URL (with token query param) for download
    if (directUrl) window.open(directUrl, '_blank')
    else if (fileData) window.open(fileData, '_blank')
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!fileUrl && !fileData) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0a0f1a] text-white rounded-xl border border-slate-700">
        <span className="text-5xl mb-4">📄</span>
        <p className="text-sm font-medium">Aucun fichier déposé pour cette commande</p>
        <p className="text-xs mt-1 text-white/60">Déposez un fichier pour le visualiser ici</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0f1a] rounded-xl border border-slate-700 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a2332] border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{isImage ? '🖼️' : isPDF ? '📄' : '📁'}</span>
          <span className="text-sm font-bold text-white truncate">{fileName || 'Document'}</span>
        </div>
        <button onClick={handleDownload}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5">
          ⬇️ Télécharger
        </button>
      </div>

      {/* Content — streamé directement, pas d'attente */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 relative">
        {isImage ? (
          <img src={displaySrc} alt={fileName} className="max-w-full rounded-lg" style={{ maxHeight: '80vh' }} />
        ) : isPDF && displaySrc && !embedError ? (
          <iframe
            src={displaySrc}
            className="w-full rounded-lg"
            style={{ minWidth: 600, height: '80vh' }}
            title={fileName || 'PDF'}
            onError={() => setEmbedError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-white">
            <span className="text-5xl mb-4">📁</span>
            <p className="text-sm mb-4">{isPDF ? 'Aperçu non disponible' : 'Type de fichier non affichable'}</p>
            <button onClick={handleDownload}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-md">
              ⬇️ Télécharger
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
