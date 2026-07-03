import { useState, useEffect, useCallback } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────
interface UpdateInfo {
  version: string
  releaseDate?: string
}

interface ProgressInfo {
  percent: number
  speed: string
  transferred: string
  total: string
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props {
  electronAPI: {
      triggerUpdate?: () => Promise<any>
    updater: {
      checkNow: () => Promise<any>
      downloadUpdate: () => Promise<any>
      quitAndInstall: () => Promise<any>
      onUpdateAvailable: (cb: (info: UpdateInfo) => void) => () => void
      onUpdateNotAvailable: (cb: () => void) => () => void
      onDownloadProgress: (cb: (progress: ProgressInfo) => void) => () => void
      onUpdateDownloaded: (cb: (info: UpdateInfo) => void) => () => void
      onError: (cb: (err: { message: string }) => void) => () => void
    }
  }
}

type BannerState = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error' | 'uptodate'

// ─── Component ─────────────────────────────────────────────────────────────
export default function UpdaterBanner({ electronAPI }: Props) {
  const [state, setState] = useState<BannerState>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // ── Listen for update events from main process ──────────────────────────
  useEffect(() => {
    if (!electronAPI?.updater) return

    const cleanups: (() => void)[] = []

    cleanups.push(
      electronAPI.updater.onUpdateAvailable((info) => {
        setState('available')
        setUpdateInfo(info)
        setDismissed(false)
      })
    )

    cleanups.push(
      electronAPI.updater.onUpdateNotAvailable(() => {
        setState('uptodate')
        setTimeout(() => setState('idle'), 3000)
      })
    )

    cleanups.push(
      electronAPI.updater.onDownloadProgress((p) => {
        setState('downloading')
        setProgress(p)
      })
    )

    cleanups.push(
      electronAPI.updater.onUpdateDownloaded((info) => {
        setState('downloaded')
        setUpdateInfo(info)
      })
    )

    cleanups.push(
      electronAPI.updater.onError((err) => {
        setState('error')
        setErrorMsg(err.message)
        setTimeout(() => setState('idle'), 5000)
      })
    )

    return () => cleanups.forEach(fn => fn())
  }, [electronAPI])

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (!electronAPI?.updater) return
    setState('downloading')
    if (electronAPI.triggerUpdate) {
      await electronAPI.triggerUpdate()
      return
    }
    await electronAPI.updater.downloadUpdate()
  }, [electronAPI])

  const handleInstall = useCallback(async () => {
    if (!electronAPI?.updater) return
    if (electronAPI.triggerUpdate) {
      await electronAPI.triggerUpdate()
      return
    }
    await electronAPI.updater.quitAndInstall()
  }, [electronAPI])

  const handleCheckNow = useCallback(async () => {
    if (!electronAPI?.updater) return
    setState('idle')
    await electronAPI.updater.checkNow()
  }, [electronAPI])

  if (state === 'idle' || dismissed) return null

  // ── Up to date flash ────────────────────────────────────────────────────
  if (state === 'uptodate') {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <span>✅</span>
          <span>Application à jour</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-slide-up">
      <div className={`rounded-2xl shadow-2xl border overflow-hidden ${
        state === 'available' ? 'bg-surface-50 border-slate-200 text-slate-800' :
        state === 'downloading' ? 'bg-slate-800 border-slate-600 text-white' :
        state === 'downloaded' ? 'bg-emerald-600 border-emerald-500 text-white' :
        'bg-red-600 border-red-500 text-white'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            {state === 'available' && <span className="text-2xl">📦</span>}
            {state === 'downloading' && <span className="text-xl animate-spin">⬇️</span>}
            {state === 'downloaded' && <span className="text-2xl">✅</span>}
            {state === 'error' && <span className="text-2xl">⚠️</span>}
            <div>
              <p className="text-sm font-bold">
                {state === 'available' && `Mise à jour v${updateInfo?.version} disponible`}
                {state === 'downloading' && `Téléchargement... ${progress?.percent || 0}%`}
                {state === 'downloaded' && 'Mise à jour prête !'}
                {state === 'error' && 'Erreur de mise à jour'}
              </p>
              {state === 'downloading' && progress && (
                <p className="text-xs opacity-80">{progress.transferred} / {progress.total} · {progress.speed}</p>
              )}
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100 text-sm font-bold px-1">✕</button>
        </div>

        {/* Download progress bar */}
        {state === 'downloading' && progress && (
          <div className="px-4 pb-3">
            <div className="w-full h-2 rounded-full bg-surface-50/20 overflow-hidden">
              <div className="h-full rounded-full bg-primary-400 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="px-4 pb-3">
          {state === 'available' && (
            <button onClick={handleDownload}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-sm font-bold hover:from-cyan-400 hover:to-teal-500 transition-all shadow-sm flex items-center justify-center gap-2">
              ⬇️ Mettre à jour maintenant
            </button>
          )}
          {state === 'downloaded' && (
            <button onClick={handleInstall}
              className="w-full py-2.5 rounded-xl bg-surface-50 text-emerald-700 text-sm font-bold hover:bg-emerald-50 transition-all shadow-sm flex items-center justify-center gap-2">
              🔄 Redémarrer pour installer
            </button>
          )}
          {state === 'error' && (
            <button onClick={handleCheckNow}
              className="w-full py-2.5 rounded-xl bg-surface-50/20 text-white text-sm font-bold hover:bg-surface-50/30 transition-all shadow-sm flex items-center justify-center gap-2">
              🔄 Réessayer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
