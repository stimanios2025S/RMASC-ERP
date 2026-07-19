import React from 'react'
import Icon from '../ui/Icon'

interface KpiCardProps {
  title: string
  value: string
  subtext: string
  icon: string
}

const GRADIENTS = [
  'from-amber-500/20 to-orange-600/5 border-amber-500/20',
  'from-emerald-500/20 to-teal-600/5 border-emerald-500/20',
  'from-blue-500/20 to-indigo-600/5 border-blue-500/20',
  'from-violet-500/20 to-purple-600/5 border-violet-500/20',
]
const ICON_BG = [
  'bg-amber-500/20 text-amber-400 ring-amber-500/20',
  'bg-emerald-500/20 text-emerald-400 ring-emerald-500/20',
  'bg-blue-500/20 text-blue-400 ring-blue-500/20',
  'bg-violet-500/20 text-violet-400 ring-violet-500/20',
]
const ACCENT_BORDERS = [
  'hover:border-amber-500/30',
  'hover:border-emerald-500/30',
  'hover:border-blue-500/30',
  'hover:border-violet-500/30',
]

const KpiCard = React.memo(function KpiCard({ title, value, subtext, icon }: KpiCardProps) {
  const idx = title.length % 4
  return (
    <div className={`glass-card p-5 relative overflow-hidden group ${ACCENT_BORDERS[idx]}`}>
      {/* Subtle corner gradient */}
      <div className={`absolute -top-8 -right-8 w-20 h-20 rounded-full bg-gradient-to-br ${GRADIENTS[idx]} blur-xl opacity-50 group-hover:opacity-80 transition-opacity`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">{title}</span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ICON_BG[idx]} ring-1 ring-inset transition-all group-hover:scale-110 duration-200`}>
            <Icon name={icon} className="w-[18px] h-[18px]" />
          </div>
        </div>
        <p className="text-3xl font-bold text-white mb-0.5 tracking-tight">{value}</p>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-y-1 group-hover:translate-y-0">
          <Icon name="ArrowUp" className="w-3 h-3 text-amber-400" />
          <span className="text-[11px] font-medium text-white/70">{subtext}</span>
        </div>
      </div>
    </div>
  )
})

export default KpiCard
