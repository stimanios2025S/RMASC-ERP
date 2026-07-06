// ─── RMASC FACTORY — Install PWA (Add to Desktop) ─────────────────────
// Shows a professional install button when the browser supports PWA.

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWA({ variant = 'default' }: { variant?: 'default' | 'sidebar' | 'compact' }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Listen for the beforeinstallprompt event (Chrome/Edge)
    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)

    // Track successful installation
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setDeferredPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  // Already installed or no prompt available → hide
  if (installed || !deferredPrompt) return null

  // ── Sidebar variant (compact, for Dashboard sidebar) ──
  if (variant === 'sidebar') {
    return (
      <div className="px-4 mb-4">
        <button
          onClick={handleInstall}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all group"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <div className="text-left">
            <p className="text-xs font-bold">Installer l'application</p>
            <p className="text-[9px] text-amber-500">Ajouter au bureau</p>
          </div>
        </button>
      </div>
    )
  }

  // ── Compact variant (inline bar for engineer portals) ──
  if (variant === 'compact') {
    return (
      <div className="flex-shrink-0 px-6 py-2 bg-amber-50 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <span>📲</span>
            <span>Installer RMASC FACTORY sur votre appareil</span>
          </div>
          <button onClick={handleInstall}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm">
            Installer
          </button>
        </div>
      </div>
    )
  }

  // ── Default variant (bottom banner) ──
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl shadow-2xl border border-amber-400/30 overflow-hidden max-w-sm">
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Installer RMASC FACTORY</p>
              <p className="text-[11px] text-amber-100 mt-0.5">Ajoutez l'application à votre bureau pour un accès rapide.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={handleInstall}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white text-amber-700 text-sm font-bold hover:bg-amber-50 transition-all shadow-sm">
              📲 Installer
            </button>
            <button onClick={() => setDeferredPrompt(null)}
              className="px-3 py-2.5 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-all">
              Plus tard
            </button>
          </div>
        </div>
        <div className="bg-black/10 px-5 py-2 flex items-center gap-1.5 text-[10px] text-amber-200/70">
          <span>🔒</span>
          <span>Installation sécurisée — Aucune donnée partagée</span>
        </div>
      </div>
    </div>
  )
}
