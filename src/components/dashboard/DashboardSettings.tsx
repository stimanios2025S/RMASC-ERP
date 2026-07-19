// ─── RMASC FACTORY — Dashboard Customization ────────────────────────────
// Permet à l'utilisateur de choisir quels widgets afficher.
// Les préférences sont stockées dans localStorage.

import { useState, useEffect } from 'react'

export interface DashboardWidget {
  id: string
  label: string
  icon: string
  defaultVisible: boolean
}

const ALL_WIDGETS: DashboardWidget[] = [
  { id: 'kpis', label: 'KPIs principaux', icon: '📊', defaultVisible: true },
  { id: 'predictions', label: 'Prédictions & Tendances', icon: '🔮', defaultVisible: true },
  { id: 'productivity', label: 'Score de productivité', icon: '🏆', defaultVisible: true },
  { id: 'priorities', label: 'Alertes & Priorités', icon: '🚨', defaultVisible: true },
  { id: 'analytics', label: 'Répartition par application', icon: '📈', defaultVisible: true },
  { id: 'reminders', label: 'Rappels Atelier', icon: '⏰', defaultVisible: false },
  { id: 'recent-orders', label: 'Commandes récentes', icon: '📋', defaultVisible: true },
  { id: 'team', label: 'Équipe Bureau d\'Études', icon: '👥', defaultVisible: false },
  { id: 'progress', label: 'Progression des commandes', icon: '🎯', defaultVisible: true },
  { id: 'time-tracker', label: 'Suivi de production', icon: '⏱️', defaultVisible: true },
  { id: 'notifications', label: 'Notifications approbation', icon: '🔔', defaultVisible: true },
]

const STORAGE_KEY = 'rmasc_dashboard_widgets'

// ─── Hook : charge/mémorise les préférences ──────────────────────────────
export function useWidgetPreferences() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with ALL_WIDGETS to handle new widgets added later
        return ALL_WIDGETS.map(w => ({
          ...w,
          defaultVisible: parsed.find((p: any) => p.id === w.id)?.defaultVisible ?? w.defaultVisible,
        }))
      }
    } catch {}
    return ALL_WIDGETS
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets)) } catch {}
  }, [widgets])

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, defaultVisible: !w.defaultVisible } : w))
  }

  const visibleWidgets = widgets.filter(w => w.defaultVisible)
  const hiddenWidgets = widgets.filter(w => !w.defaultVisible)

  return { widgets, visibleWidgets, hiddenWidgets, toggleWidget, setWidgets }
}

// ─── Composant UI de configuration ───────────────────────────────────────
interface Props {
  widgets: DashboardWidget[]
  onToggle: (id: string) => void
  onClose: () => void
}

export default function DashboardSettings({ widgets, onToggle, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">🛠 Personnaliser le tableau de bord</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-xs text-white/50 mb-3">Activez ou désactivez les widgets à afficher.</p>
          {widgets.map(w => (
            <div
              key={w.id}
              onClick={() => onToggle(w.id)}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                w.defaultVisible
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-white/[0.04] border border-white/10 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{w.icon}</span>
                <span className={`text-sm font-medium ${w.defaultVisible ? 'text-white' : 'text-white/50'}`}>{w.label}</span>
              </div>
              <div className={`w-10 h-6 rounded-full transition-all duration-200 flex items-center ${w.defaultVisible ? 'bg-amber-500 justify-end' : 'bg-white/20 justify-start'}`}>
                <div className="w-4 h-4 rounded-full bg-white mx-0.5 shadow-sm" />
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-400 transition-all">
            ✅ Terminé
          </button>
        </div>
      </div>
    </div>
  )
}
