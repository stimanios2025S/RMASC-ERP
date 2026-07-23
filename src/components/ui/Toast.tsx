// ─── RMASC FACTORY — Toast Notification System ──────────────────────────────
// Global toast queue for async action feedback (success/error/info).
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import type { ReactNode } from 'react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

interface ToastContextValue {
  toast: (type: Toast['type'], message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let toastId = 0
let globalAddToast: ((t: Toast) => void) | null = null

// Imperative API — can be called from anywhere without context
export function showToast(type: Toast['type'], message: string, duration = 4000) {
  if (globalAddToast) {
    globalAddToast({ id: `t_${++toastId}`, type, message, duration })
  }
}

const ICONS: Record<Toast['type'], string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
}

const COLORS: Record<Toast['type'], string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
}

const TEXT_COLORS: Record<Toast['type'], string> = {
  success: 'text-emerald-300',
  error: 'text-red-300',
  info: 'text-blue-300',
  warning: 'text-amber-300',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Toast) => {
    setToasts(prev => [...prev.slice(-4), t])
    const dur = t.duration ?? 4000
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id))
    }, dur)
  }, [])

  useEffect(() => {
    globalAddToast = addToast
    return () => { globalAddToast = null }
  }, [addToast])

  const toast = useCallback((type: Toast['type'], message: string, duration?: number) => {
    addToast({ id: `t_${++toastId}`, type, message, duration })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl animate-slide-up min-w-[280px] max-w-[420px] ${COLORS[t.type]}`}
          >
            <span className="text-lg flex-shrink-0">{ICONS[t.type]}</span>
            <p className={`text-sm font-medium flex-1 ${TEXT_COLORS[t.type]}`}>{t.message}</p>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white/60 hover:text-white transition-all"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
