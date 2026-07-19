// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Admin Dashboard
//  Design robuste : fond dark SÛR, textes blancs avec opacité,
//  cartes glass avec fond fixe, jamais de blanc sur blanc.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react'
import AddElevator from './AddElevator'
import BureauEtudeWorkspace from './BureauEtudeWorkspace'
import BureauEtudeVault from './BureauEtudeVault'
import FicheTechniqueView from './FicheTechniqueView'
import MesCommandesPage from './MesCommandesPage'
import InvoicingPage from './InvoicingPage'
import ValidationsPage from './ValidationsPage'
import SettingsPage from './SettingsPage'
import RoadmapPage from './RoadmapPage'
import LifecyclePipeline from './LifecyclePipeline'
import HelpPage from './HelpPage'
import InstallPWA from './InstallPWA'
import AgentPanel from './agent/AgentPanel'
import SmartSearch from './smart/SmartSearch'
import SmartTips from './smart/SmartTips'
import SmartNotificationCenter from './smart/SmartNotificationCenter'
import ArchiveOrders from './ArchiveOrders'
import PiecesSoloWorkspace from './PiecesSoloWorkspace'
import { apiFetch } from '../config/api'
import { triggerAlert, requestNotificationPermission } from '../config/notifications'
import type { PortalSession } from '../data/portalUsers'
import Icon from './ui/Icon'
import KpiCard from './dashboard/KpiCard'
import AuditLogPage from './AuditLogPage'

interface OrderSummary {
  id: string; serialNumber: string; clientName: string; clientCity: string
  typeMotorisation: string; typeCabine?: string; status: string; createdAt: string
  priority?: string; _count: { cadSubmissions: number }
}
interface Props { onLogout: () => void; session: PortalSession; onSessionUpdate?: () => void }

function buildCurrentUser(session: PortalSession) {
  return {
    name: session.name, email: session.role === 'ADMIN' ? 'admin@rmasc.erp' : `${session.userId}@rmasc.erp`,
    initials: session.name.split(' ').map(n => n[0]).join(''),
    role: 'Administrateur en Chef',
  }
}

const menuItems = [
  { icon: 'LayoutDashboard', label: 'Overview complet', view: 'dashboard' as const, badge: null },
  { icon: 'CheckSquare', label: 'Mes commandes', view: 'commandes' as const, badge: null },
  { icon: 'CheckSquare', label: 'Validations', view: 'validations' as const, badge: null },
  { icon: 'DollarSign', label: 'Salim Hamoun AI — Facturation', view: 'invoicing' as const, badge: 'BETA' },
  { icon: 'ListTodo', label: 'Pipeline Cycle de Vie', view: 'lifecycle' as const, badge: null },
  { icon: 'FolderOpen', label: "Bureau d'Étude — File Vault", view: 'vault' as const, badge: null },
  { icon: 'Clock', label: 'Roadmap Production', view: 'roadmap' as const, badge: null },
  { icon: 'HelpCircle', label: 'Aide & Catalogue', view: 'help' as const, badge: null },
  { icon: 'Package', label: 'Archives', view: 'archives' as const, badge: null },
  { icon: 'Settings', label: 'Paramètres', view: 'settings' as const, badge: null },
  { icon: 'Code2', label: "Journal d'Audit", view: 'audit-log' as const, badge: null },
]
const generalItems = [{ icon: 'LogOut', label: 'Déconnexion', action: 'logout' as const }]

type ViewType = 'dashboard' | 'add-elevator' | 'be-inspect' | 'fiche' | 'commandes' | 'validations' | 'settings' | 'roadmap' | 'help' | 'invoicing' | 'lifecycle' | 'vault' | 'archives' | 'pieces-solo' | 'audit-log'

const MOBILE_NAV_ITEMS = [
  { icon: 'LayoutDashboard', label: 'Accueil', view: 'dashboard' as const },
  { icon: 'CheckSquare', label: 'Commandes', view: 'commandes' as const },
  { icon: 'Plus', label: 'Ajouter', view: 'add-elevator' as const },
  { icon: 'FolderOpen', label: 'Vault', view: 'vault' as const },
  { icon: 'Settings', label: 'Plus', view: 'settings' as const },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────
function Sidebar({ onNavigate, onLogout, userRole }: { onNavigate?: (view: ViewType) => void; onLogout?: () => void; userRole?: string }) {
  const [activeView, setActiveView] = useState(() => {
    try { return localStorage.getItem('rmasc_active_tab') || 'dashboard' } catch { return 'dashboard' }
  })
  return (
    <aside className="hidden md:flex md:w-64 h-screen bg-slate-900 border-r border-white/10 flex-col flex-shrink-0">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3 px-2">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 overflow-hidden flex-shrink-0">
            <img src="/images/rmasc-logo.png" alt="RMASC" className="w-7 h-7 object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold text-white tracking-tight"><span className="text-amber-400">RM</span>ASC</p>
            <p className="text-[9px] text-white/60 font-semibold tracking-wider uppercase">ERP Ascenseur</p>
          </div>
        </div>
        <div className="mt-4 mx-2 h-px bg-gradient-to-r from-amber-500/20 via-white/10 to-transparent" />
      </div>
      <div className="px-4 mb-3 flex-1 overflow-y-auto">
        <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase px-3 mb-2">Navigation</p>
        <nav className="space-y-0.5">
          {menuItems.map(item => (
            <button key={item.label} onClick={() => { setActiveView(item.view); onNavigate?.(item.view) }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-left justify-between group transition-all ${
                activeView === item.view ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}>
              <div className="flex items-center gap-3">
                <Icon name={item.icon} className={`w-[18px] h-[18px] ${activeView === item.view ? 'text-amber-400' : 'text-white/50'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-6">
          <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase px-3 mb-2">Raccourcis</p>
          <nav className="space-y-0.5">
            <button onClick={() => onNavigate?.('add-elevator')} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-left group text-white/60 hover:bg-white/5 hover:text-white transition-all">
              <span className="text-sm opacity-70">➕</span>
              <span>Nouvel ascenseur</span>
            </button>
            {(userRole === 'INGENIEUR_2' || userRole === 'PRODUCTION') && (
              <button onClick={() => onNavigate?.('pieces-solo')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-left group transition-all ${
                  activeView === 'pieces-solo' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}>
                <Icon name="Wrench" className="w-[18px] h-[18px]" />
                <span>Pièces Solo</span>
              </button>
            )}
          </nav>
        </div>
      </div>
      <div className="px-4 mb-2">
        <div className="mx-2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />
        <nav className="space-y-0.5">
          {generalItems.map(item => (
            <button key={item.label} onClick={() => { if ((item as any).action === 'logout') onLogout?.() }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-left text-white/60 hover:bg-white/5 hover:text-red-400 transition-all group">
              <Icon name={item.icon} className="w-[18px] h-[18px] group-hover:text-red-400" />
              <span className="group-hover:text-red-400">Déconnexion</span>
            </button>
          ))}
        </nav>
      </div>
      <InstallPWA variant="sidebar" />
    </aside>
  )
}

// ─── Mobile Bottom Navigation ────────────────────────────────────────────
function MobileNav({ activeView, onNavigate, onLogout }: { activeView: string; onNavigate: (view: ViewType) => void; onLogout: () => void }) {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-white/10 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {MOBILE_NAV_ITEMS.map(item => (
            <button key={item.view} onClick={() => { if (item.view === 'settings') setShowMenu(p => !p); else onNavigate(item.view) }}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${activeView === item.view ? 'text-amber-400' : 'text-white/60'}`}>
              <Icon name={item.icon} className={`w-5 h-5 ${activeView === item.view ? 'text-amber-400' : ''}`} />
              <span className="text-[9px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {showMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setShowMenu(false)}>
          <div className="absolute bottom-20 left-4 right-4 bg-slate-800 rounded-2xl shadow-2xl border border-white/10 p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="space-y-1">
              {menuItems.filter(m => !['dashboard','commandes','add-elevator','vault'].includes(m.view)).map(item => (
                <button key={item.view} onClick={() => { onNavigate(item.view); setShowMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-500/10 text-white/70 hover:text-amber-400 transition-all text-sm font-medium">
                  <Icon name={item.icon} className="w-5 h-5 text-white/70" />
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="border-t border-white/10 mt-2 pt-2">
                <button onClick={() => { onLogout(); setShowMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all text-sm font-medium">
                  <Icon name="LogOut" className="w-5 h-5" /> Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────
function Header({ notifCount, onNotifClick, orders, user, onAgentToggle, agentActive, onSmartSearch }: any) {
  const [showProfile, setShowProfile] = useState(false)
  return (
    <header className="h-14 md:h-16 bg-slate-900 border-b border-white/10 flex items-center justify-between px-3 md:px-6 shadow-sm">
      <div className="w-1 md:w-4" />
      <div className="hidden md:block flex-1 max-w-md mx-auto">
        <button onClick={onSmartSearch}
          className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm text-white/70 hover:text-white hover:border-amber-500/30 transition-all group text-left">
          <svg className="w-4 h-4 flex-shrink-0 text-white/70 group-hover:text-amber-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="flex-1">Recherche intelligente...</span>
          <span className="text-[10px] text-white/50 bg-white/10 rounded-md px-1.5 py-0.5 font-medium">⌘K</span>
        </button>
      </div>
      <button onClick={onSmartSearch} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
      <div className="flex items-center gap-3">
        <button onClick={onAgentToggle}
          className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${
            agentActive ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
          }`} title="Assistant IA Salim (⌘I)">
          <span className="text-base md:text-lg">🤖</span>
        </button>
        <SmartNotificationCenter onNavigate={onNotifClick} orders={orders} />
        <div className="w-px h-5 md:h-7 bg-white/10" />
        <div className="relative">
          <div onClick={() => setShowProfile(p => !p)} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded-xl p-1.5 pr-3 transition-all">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center text-white text-sm font-bold">
              {user.initials}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-bold text-white leading-tight">{user.name}</p>
              <p className="text-[11px] text-white/60 font-medium">{user.role}</p>
            </div>
          </div>
          {showProfile && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={() => setShowProfile(false)} />
              <div className="fixed right-4 md:right-6 top-16 z-[100] w-[580px] max-h-[70vh] overflow-y-auto bg-slate-900 rounded-2xl shadow-2xl border border-white/10 animate-scale-in">
                <div className="sticky top-0 bg-slate-900 px-5 py-4 border-b border-white/10 flex items-center justify-between rounded-t-2xl">
                  <h3 className="text-sm font-bold text-white">📊 Roadmap — Suivi des commandes</h3>
                  <span className="text-xs text-white/60">{orders.length} commande{orders.length > 1 ? 's' : ''}</span>
                </div>
                <div className="p-4 space-y-3">
                  {orders.length === 0 ? (
                    <p className="text-sm text-white/60 italic text-center py-4">Aucune commande enregistrée.</p>
                  ) : orders.map(order => <OrderRoadmap key={order.id} order={order} />)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── OrderRoadmap (timeline) ────────────────────────────────────────────
const OrderRoadmap = React.memo(function OrderRoadmap({ order }: { order: OrderSummary }) {
  const statusStep = [
    { key: 'BROUILLON', label: 'Création', icon: '📝', hours: 0 },
    { key: 'ATTENTE_DESSIN_TECH', label: 'Plan Installation', icon: '📐', hours: 16 },
    { key: 'ATTENTE_APPROBATION_ADMIN', label: 'Validation Admin', icon: '✅', hours: 4 },
    { key: 'ATTENTE_DESSIN_2D', label: 'Dessin 2D Cabine', icon: '✏️', hours: 24 },
    { key: 'ATTENTE_VERIFICATION', label: 'Vérification', icon: '🔍', hours: 8 },
    { key: 'PRET_POUR_PRODUCTION', label: 'Prêt Production', icon: '🏭', hours: 0 },
    { key: 'EN_LIVRAISON', label: 'Livraison', icon: '🚛', hours: 8 },
    { key: 'LIVREE', label: 'Livrée', icon: '✅', hours: 0 },
  ]
  const now = Date.now()
  const createdAt = new Date(order.createdAt).getTime()
  const currentIdx = statusStep.findIndex(s => s.key === order.status)
  const activeIdx = currentIdx >= 0 ? currentIdx : 0
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-white font-mono">{order.serialNumber}</p>
          <p className="text-[11px] text-white/60">{order.clientName} — {order.clientCity}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
          order.status === 'PRET_POUR_PRODUCTION' || order.status === 'VALIDEE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
        }`}>{order.status === 'PRET_POUR_PRODUCTION' ? 'Terminée' : 'En cours'}</span>
      </div>
      <div className="relative ml-2">
        {statusStep.map((step, i) => {
          const isPast = i <= activeIdx; const isCurrent = i === activeIdx
          const elapsedH = (now - createdAt) / 3600000
          const phaseProgress = Math.min(100, Math.round((elapsedH / step.hours) * 100))
          return (
            <div key={step.key} className="flex gap-3 pb-3 last:pb-0">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isPast ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60'}`}>
                  {isPast ? '✓' : i + 1}
                </div>
                {i < statusStep.length - 1 && <div className={`w-0.5 flex-1 min-h-[12px] ${isPast ? 'bg-emerald-400/50' : 'bg-white/10'}`} />}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${isCurrent ? 'text-white' : isPast ? 'text-white/70' : 'text-white/60'}`}>{step.icon} {step.label}</p>
                  {isCurrent && step.hours > 0 && <span className={`text-[10px] font-bold ${phaseProgress > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>{Math.max(0, Math.round(step.hours - elapsedH))}h restantes</span>}
                  {isPast && !isCurrent && step.hours > 0 && <span className="text-[10px] text-white/60 font-medium">✓ {step.hours}h</span>}
                </div>
                {isCurrent && step.hours > 0 && (
                  <div className="w-full h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${phaseProgress > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, phaseProgress)}%` }} />
                  </div>
                )}
                <p className="text-[9px] text-white/60 mt-0.5">{isCurrent ? 'En cours...' : isPast ? (step.hours > 0 ? `Durée: ${step.hours}h` : '—') : 'En attente'}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

// ─── Dashboard sub-components ───────────────────────────────────────────
function AnalyticsChart({ orders }: { orders: OrderSummary[] }) {
  const categories = [
    { key: 'PASSAGER', label: 'Résidentiel', color: 'from-amber-400 to-orange-500' },
    { key: 'PANORAMIQUE', label: 'Panoramique', color: 'from-emerald-400 to-teal-500' },
    { key: 'CHARGES_LOURDES', label: 'Charges Lourdes', color: 'from-blue-400 to-indigo-500' },
    { key: 'SERVICE_LIFT', label: 'Monte-Plat', color: 'from-violet-400 to-purple-500' },
  ]
  const chartData = categories.map(c => ({ ...c, value: orders.filter(o => o.typeCabine === c.key).length || 0 }))
  const maxValue = Math.max(...chartData.map(d => d.value), 1)
  if (orders.length === 0) return null
  return (
    <div className="bg-slate-800/70 rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-white">Répartition par Type</h3>
        <span className="text-[10px] text-white/60">{orders.length} commande{orders.length > 1 ? 's' : ''}</span>
      </div>
      <div className="relative h-[160px]">
        <div className="flex items-end justify-between gap-3 h-full pt-2 pb-6">
          {chartData.map((data, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
              <span className="text-xs font-bold text-white/60">{data.value}</span>
              <div className="relative w-full max-w-[32px] rounded-lg overflow-hidden group cursor-pointer" style={{ height: `${(data.value / maxValue) * 100}%` }}>
                <div className={`absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t ${data.color} transition-all duration-500 group-hover:brightness-110`} style={{ height: '100%' }} />
              </div>
              <span className="text-[10px] font-medium text-white/60">{data.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RemindersCard({ orders }: { orders: OrderSummary[] }) {
  const urgentOrders = orders.filter(o => o.priority === 'URGENT')
  const blockedOrders = orders.filter(o => ['BROUILLON', 'ATTENTE_APPROBATION_ADMIN'].includes(o.status))
  const hasReminders = urgentOrders.length > 0 || blockedOrders.length > 0
  return (
    <div className="bg-slate-800/70 rounded-2xl border border-white/10 p-5">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Rappels & Alertes
      </h3>
      {!hasReminders ? (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10 text-center">
          <span className="text-2xl block mb-2">✅</span>
          <p className="text-sm text-white/60">Tout est sous contrôle.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {urgentOrders.length > 0 && (
            <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
              <p className="text-xs font-bold text-red-400">🔴 {urgentOrders.length} commande{urgentOrders.length > 1 ? 's' : ''} urgente{urgentOrders.length > 1 ? 's' : ''}</p>
              <p className="text-[10px] text-red-300 mt-0.5">Priorité la plus haute</p>
            </div>
          )}
          {blockedOrders.length > 0 && (
            <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
              <p className="text-xs font-bold text-amber-400">⏳ {blockedOrders.length} commande{blockedOrders.length > 1 ? 's' : ''} en attente</p>
              <p className="text-[10px] text-amber-300 mt-0.5">{blockedOrders.filter(o => o.status === 'ATTENTE_APPROBATION_ADMIN').length} approbation{blockedOrders.filter(o => o.status === 'ATTENTE_APPROBATION_ADMIN').length > 1 ? 's' : ''} requise</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectList({ orders, onFiche }: { orders: OrderSummary[]; onFiche?: (id: string) => void }) {
  const recent = orders.slice(0, 5)
  const iconColors = ['bg-amber-500/20 text-amber-400', 'bg-emerald-500/20 text-emerald-400', 'bg-blue-500/20 text-blue-400', 'bg-violet-500/20 text-violet-400', 'bg-rose-500/20 text-rose-400']
  return (
    <div className="bg-slate-800/70 rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white">Commandes Récentes</h3>
        <span className="text-xs text-white/60 bg-white/10 px-2.5 py-1 rounded-full">{orders.length} au total</span>
      </div>
      <div className="space-y-1">
        {recent.length === 0 ? <p className="text-sm text-white/60 italic p-2.5">Aucune commande.</p> : recent.map((order, i) => (
          <div key={order.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer group">
            <div className={`w-8 h-8 rounded-xl ${iconColors[i % iconColors.length]} flex items-center justify-center flex-shrink-0`}>
              <span className="text-xs font-bold">{order.serialNumber.slice(-2)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{order.clientName} — <span className="font-mono text-xs text-white/60">{order.serialNumber}</span></p>
              <p className="text-xs text-white/60 font-medium">{order.clientCity} • {order.typeMotorisation}</p>
            </div>
            {onFiche && (
              <button onClick={e => { e.stopPropagation(); onFiche(order.id) }} className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all opacity-0 group-hover:opacity-100">📄 Fiche</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CollaborationCard({ orders }: { orders: OrderSummary[] }) {
  const stages = {
    engineering: orders.filter(o => ['ATTENTE_DESSIN_TECH'].includes(o.status)).length,
    design2d: orders.filter(o => ['ATTENTE_DESSIN_2D'].includes(o.status)).length,
    verification: orders.filter(o => ['ATTENTE_VERIFICATION'].includes(o.status)).length,
    production: orders.filter(o => ['PRET_POUR_PRODUCTION', 'EN_LIVRAISON'].includes(o.status)).length,
  }
  const hasActivity = Object.values(stages).some(v => v > 0)
  return (
    <div className="bg-slate-800/70 rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Activité des Équipes</h3>
        <span className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded">{orders.length} commandes</span>
      </div>
      {!hasActivity ? (
        <div className="text-center py-6"><span className="text-3xl block mb-2">📭</span><p className="text-sm text-white/60">Aucune commande active</p></div>
      ) : (
        <div className="space-y-3">
          {[
            { label: 'Bureau d\'Études', sub: 'Plan Installation', value: stages.engineering, color: 'text-sky-400', bg: 'bg-sky-500/20', icon: '📐' },
            { label: 'Dessinateurs', sub: 'Dessin 2D Cabine', value: stages.design2d, color: 'text-violet-400', bg: 'bg-violet-500/20', icon: '✏️' },
            { label: 'Vérificateurs', sub: 'Contrôle Final', value: stages.verification, color: 'text-rose-400', bg: 'bg-rose-500/20', icon: '🔍' },
            { label: 'Production', sub: 'Atelier & Livraison', value: stages.production, color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: '🏭' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center text-sm`}>{item.icon}</div>
                <div><p className="text-xs font-medium text-white">{item.label}</p><p className="text-[10px] text-white/60">{item.sub}</p></div>
              </div>
              <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProgressArc({ orders }: { orders: OrderSummary[] }) {
  const total = orders.length || 1
  const termines = orders.filter(o => ['LIVREE', 'VALIDEE', 'ANNULEE'].includes(o.status)).length
  const enCours = orders.filter(o => ['ATTENTE_DESSIN_TECH', 'ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION', 'EN_LIVRAISON'].includes(o.status)).length
  const enAttente = orders.filter(o => ['BROUILLON', 'ATTENTE_APPROBATION_ADMIN', 'PRET_POUR_PRODUCTION'].includes(o.status)).length
  const completedPct = Math.round((termines / total) * 100)
  const inProgressPct = Math.round((enCours / total) * 100)
  const pendingPct = Math.round((enAttente / total) * 100)
  const circumference = 2 * Math.PI * 45
  const completedOffset = circumference - (completedPct / 100) * circumference
  const inProgressOffset = circumference - ((completedPct + inProgressPct) / 100) * circumference
  return (
    <div className="bg-slate-800/70 rounded-2xl border border-white/10 p-5 flex flex-col items-center">
      <h3 className="text-base font-semibold text-white mb-3 w-full">Progression des Commandes</h3>
      <div className="relative w-[130px] h-[130px] mb-4">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray={`${(completedPct / 100) * circumference} ${circumference}`} strokeLinecap="round" transform="rotate(-90 50 50)" className="transition-all duration-700" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray={`${(inProgressPct / 100) * circumference} ${circumference}`} strokeDashoffset={-completedOffset} strokeLinecap="round" transform="rotate(-90 50 50)" className="transition-all duration-700" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" strokeDasharray={`${(pendingPct / 100) * circumference} ${circumference}`} strokeDashoffset={-inProgressOffset} strokeLinecap="round" transform="rotate(-90 50 50)" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{completedPct}%</span>
          <span className="text-[10px] text-white/60 font-medium">Terminés</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-white/60">Terminé ({termines})</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-white/60">En Cours ({enCours})</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-white/20" /><span className="text-white/60">Attente ({enAttente})</span></div>
      </div>
    </div>
  )
}

const PHASE_HOURS: Record<string, number> = {
  BROUILLON: 0, ATTENTE_DESSIN_TECH: 16, ATTENTE_APPROBATION_ADMIN: 4,
  ATTENTE_DESSIN_2D: 24, ATTENTE_VERIFICATION: 8, PRET_POUR_PRODUCTION: 0,
  EN_LIVRAISON: 8, LIVREE: 0,
}

function TimeTracker({ orders }: { orders: OrderSummary[] }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv) }, [])
  const activeOrders = orders.filter(o => o.status in PHASE_HOURS && PHASE_HOURS[o.status] > 0).slice(0, 4)
  return (
    <div className="bg-slate-800/70 rounded-2xl border border-white/10 p-5">
      <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2"><span>⏱️</span> Suivi de Production</h3>
      {activeOrders.length === 0 ? (
        <p className="text-sm text-white/60 text-center py-6">Aucune commande active</p>
      ) : activeOrders.map(order => {
        const createdAt = new Date(order.createdAt).getTime()
        const hoursAllocated = PHASE_HOURS[order.status] || 0
        const hoursElapsed = (now - createdAt) / 3600000
        const remainingHours = Math.max(0, hoursAllocated - hoursElapsed)
        const progress = Math.min(100, Math.round((hoursElapsed / hoursAllocated) * 100))
        return (
          <div key={order.id} className="mb-3 last:mb-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${remainingHours <= 0 ? 'bg-emerald-500' : remainingHours < hoursAllocated * 0.25 ? 'bg-amber-500' : 'bg-cyan-500'}`} />
                <p className="text-xs font-bold text-white font-mono truncate">{order.serialNumber.slice(-12)}</p>
              </div>
              <span className={`text-[10px] font-bold flex-shrink-0 ${remainingHours <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {remainingHours <= 0 ? '✅ Terminé' : `~${Math.floor(remainingHours / 8) > 0 ? `${Math.floor(remainingHours / 8)}j ` : ''}${Math.round(remainingHours % 8)}h`}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${progress > 80 ? 'bg-amber-500' : remainingHours <= 0 ? 'bg-emerald-500' : 'bg-cyan-500'}`} style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
            <p className="text-[9px] text-white/60 mt-0.5">{(order.clientName || '').slice(0, 20)} — {order.status.replace(/_/g, ' ')}</p>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export default function Dashboard({ onLogout, session, onSessionUpdate }: Props) {
  const [view, setView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('rmasc_active_tab')
    return (saved && ['dashboard','add-elevator','be-inspect','fiche','commandes','validations','settings','roadmap','help','invoicing','lifecycle','vault','archives','pieces-solo','audit-log'].includes(saved)) ? saved as ViewType : 'dashboard'
  })
  const persistView = useCallback((v: ViewType) => { setView(v); try { localStorage.setItem('rmasc_active_tab', v) } catch {} }, [])
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [ficheOrderId, setFicheOrderId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<OrderSummary[]>([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [showAgent, setShowAgent] = useState(false)
  const [showSmartSearch, setShowSmartSearch] = useState(false)

  useEffect(() => { const t = setTimeout(() => setShowAgent(true), 2000); requestNotificationPermission(); return () => clearTimeout(t) }, [])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSmartSearch(p => !p) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); setShowAgent(p => !p) }
    }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  }, [])

  const prevNotifCount = useRef(0)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data: OrderSummary[] = await apiFetch('/orders')
        if (cancelled) return
        setOrders(data)
        const newNotifs = data.filter(o => o.status === 'ATTENTE_APPROBATION_ADMIN')
        setNotifications(newNotifs)
        if (newNotifs.length > prevNotifCount.current) {
          triggerAlert('🚨 Nouvelle alerte RMASC', `${newNotifs.length - prevNotifCount.current} commande(s) en attente.`, newNotifs[0]?.serialNumber)
        }
        prevNotifCount.current = newNotifs.length
      } catch { /* silent */ }
    }
    load()
    const iv = setInterval(load, 8000)
    const onFocus = () => { if (!cancelled) load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !cancelled) load() })
    return () => { cancelled = true; clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [])

  const kpis = {
    total: orders.length,
    termines: orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length,
    enCours: orders.filter(o => ['ATTENTE_DESSIN_TECH', 'ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION', 'EN_LIVRAISON'].includes(o.status)).length,
    enAttente: orders.filter(o => ['BROUILLON', 'ATTENTE_APPROBATION_ADMIN', 'PRET_POUR_PRODUCTION'].includes(o.status)).length,
  }

  // Route views
  if (view === 'add-elevator') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><AddElevator onBack={() => persistView('dashboard')} /></div>
  if (view === 'be-inspect') return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
      <div className="flex-1 flex flex-col">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 flex items-center justify-between shadow-lg">
          <span className="text-sm font-bold">👁️ Mode Inspection</span>
          <button onClick={() => persistView('dashboard')} className="px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-bold">👑 Retour</button>
        </div>
        <div className="flex-1 overflow-hidden"><BureauEtudeWorkspace onBack={() => persistView('dashboard')} /></div>
      </div>
    </div>
  )
  if (view === 'commandes') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><div className="flex-1 overflow-y-auto bg-slate-950"><MesCommandesPage onBack={() => persistView('dashboard')} onFiche={id => { setFicheOrderId(id); persistView('fiche') }} /></div></div>
  if (view === 'validations') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><div className="flex-1 overflow-y-auto bg-slate-950"><ValidationsPage onBack={() => persistView('dashboard')} onFiche={id => { setFicheOrderId(id); persistView('fiche') }} /></div></div>
  if (view === 'help') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><div className="flex-1 overflow-y-auto bg-slate-950"><HelpPage onBack={() => persistView('dashboard')} /></div></div>
  if (view === 'settings') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><div className="flex-1 overflow-y-auto bg-slate-950"><SettingsPage onBack={() => persistView('dashboard')} session={session} onSessionUpdate={onSessionUpdate} /></div></div>
  if (view === 'roadmap') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><div className="flex-1 overflow-y-auto bg-slate-950"><RoadmapPage orders={orders as any} onBack={() => persistView('dashboard')} /></div></div>
  if (view === 'fiche' && ficheOrderId) return <div className="h-screen bg-slate-950"><FicheTechniqueView orderId={ficheOrderId} onBack={() => { persistView('dashboard'); setFicheOrderId(null) }} variant="full" /></div>
  if (view === 'invoicing') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><div className="flex-1 overflow-y-auto bg-slate-950"><InvoicingPage onBack={() => persistView('dashboard')} /></div></div>
  if (view === 'vault') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><div className="flex-1 overflow-y-auto bg-slate-950"><BureauEtudeVault onBack={() => persistView('dashboard')} /></div></div>
  if (view === 'lifecycle') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><div className="flex-1 overflow-y-auto bg-slate-950"><LifecyclePipeline onBack={() => persistView('dashboard')} /></div></div>
  if (view === 'archives') return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
      <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
        <Header notifCount={notifications.length} onNotifClick={() => setShowNotifPanel(p => !p)} orders={orders} user={buildCurrentUser(session)} onAgentToggle={() => setShowAgent(p => !p)} agentActive={showAgent} onSmartSearch={() => setShowSmartSearch(true)} />
        <main className="flex-1 overflow-y-auto"><ArchiveOrders onSelectOrder={id => { setFicheOrderId(id); persistView('fiche') }} /></main>
      </div>
    </div>
  )
  if (view === 'pieces-solo') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><PiecesSoloWorkspace onBack={() => persistView('dashboard')} session={session} /></div>
  if (view === 'audit-log') return <div className="flex h-screen bg-slate-950"><Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} /><div className="flex-1 overflow-y-auto bg-slate-950"><AuditLogPage onBack={() => persistView('dashboard')} /></div></div>

  // Main Dashboard
  const currentUserData = buildCurrentUser(session)
  return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
      <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
        <Header notifCount={notifications.length} onNotifClick={() => setShowNotifPanel(p => !p)} orders={orders} user={currentUserData} onAgentToggle={() => setShowAgent(p => !p)} agentActive={showAgent} onSmartSearch={() => setShowSmartSearch(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {orders.length === 0 && (
            <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3 text-sm">
              <span className="text-lg">📡</span>
              <div><p className="font-semibold text-amber-400">Mode déconnecté</p><p className="text-[11px] text-amber-300/70">Connexion au serveur indisponible.</p></div>
            </div>
          )}
          <SmartTips />

          <div className="flex items-center justify-between mb-6 bg-white/5 rounded-2xl p-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse-soft" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80">Vue d'ensemble</span>
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Tableau de bord</h1>
              <p className="text-xs md:text-sm text-white/60 mt-1 font-medium">Vue d'ensemble de la production d'ascenseurs RMASC.</p>
            </div>
            <button onClick={() => persistView('add-elevator')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/25 active:scale-[0.97]">
              <Icon name="Plus" className="w-4 h-4" /> Nouvel ascenseur
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 stagger-children">
            <KpiCard title="Commandes Totales" value={String(kpis.total)} subtext="Toutes les configurations" icon="BarChart3" />
            <KpiCard title="Commandes Livrées" value={String(kpis.termines)} subtext="Statut LIVRÉ ou CONSTRUIT" icon="Check" />
            <KpiCard title="En Production" value={String(kpis.enCours)} subtext="En attente ou en fabrication" icon="ListTodo" />
            <KpiCard title="Brouillons" value={String(kpis.enAttente)} subtext="En attente de validation" icon="Clock" />
          </div>

          {/* Notifications */}
          {showNotifPanel && notifications.length > 0 && (
            <div className="mb-4 bg-slate-800/80 rounded-2xl p-4 border border-amber-500/20 shadow-md animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> {notifications.length} commande{notifications.length > 1 ? 's' : ''} en attente</h3>
                <button onClick={() => setShowNotifPanel(false)} className="text-amber-400 hover:text-amber-300 text-xs font-semibold">Masquer</button>
              </div>
              <div className="space-y-2">
                {notifications.slice(0, 5).map(n => (
                  <div key={n.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                    <div><p className="text-sm font-bold text-white font-mono">{n.serialNumber}</p><p className="text-xs text-white/60">{n.clientName} — {n.clientCity}</p></div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400 font-semibold bg-amber-500/20 px-2 py-1 rounded-lg">En attente</span>
                      <button onClick={() => { persistView('validations'); setShowNotifPanel(false) }} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-400 transition-all">Vérifier →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prediction Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-800/70 rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><span>🔮</span> Prédictions</h3>
                <span className="text-[10px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full font-semibold">IA</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-xs text-white/60">Commandes en cours</span><span className="text-lg font-bold text-white">{orders.filter(o => !['LIVREE', 'VALIDEE', 'ANNULEE'].includes(o.status)).length}</span></div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-progress" style={{ width: `${orders.length > 0 ? Math.round((orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length / orders.length) * 100) : 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px]"><span className="text-white/60">Progression</span><span className="text-amber-400 font-bold">{orders.length > 0 ? Math.round((orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length / orders.length) * 100) : 0}%</span></div>
              </div>
            </div>
            <div className="bg-slate-800/70 rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><span>🏆</span> Productivité</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${orders.length > 0 && (orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length / orders.length) > 0.5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{orders.length > 0 ? Math.round((orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length / orders.length) * 100) : 0}%</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between"><span className="text-xs text-white/60">✅ Terminées</span><span className="text-sm font-bold text-emerald-400">{orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-white/60">🔄 En cours</span><span className="text-sm font-bold text-amber-400">{orders.filter(o => ['ATTENTE_DESSIN_TECH', 'ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION', 'ATTENTE_APPROBATION_ADMIN', 'EN_LIVRAISON'].includes(o.status)).length}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-white/60">⏸️ Bloquées</span><span className="text-sm font-bold text-red-400">{orders.filter(o => ['BROUILLON', 'PRET_POUR_PRODUCTION'].includes(o.status)).length}</span></div>
              </div>
            </div>
            <div className="bg-slate-800/70 rounded-2xl border border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2"><span>🚨</span> Priorités</h3>
                <span className="text-[10px] text-red-400 font-bold">{orders.filter(o => o.priority === 'URGENT' || o.priority === 'HAUTE').length}</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between"><span className="text-xs text-white/60">🔴 Urgent</span><span className="text-sm font-bold text-red-400">{orders.filter(o => o.priority === 'URGENT').length}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-white/60">🟠 Haute</span><span className="text-sm font-bold text-orange-400">{orders.filter(o => o.priority === 'HAUTE').length}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-white/60">🔵 Normale</span><span className="text-sm font-bold text-blue-400">{orders.filter(o => !o.priority || o.priority === 'NORMAL').length}</span></div>
              </div>
            </div>
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 stagger-children">
            <AnalyticsChart orders={orders} />
            <RemindersCard orders={orders} />
            <ProjectList orders={orders} onFiche={id => { setFicheOrderId(id); persistView('fiche') }} />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
            <CollaborationCard orders={orders} />
            <ProgressArc orders={orders} />
            <TimeTracker orders={orders} />
          </div>
        </main>
      </div>
      <MobileNav activeView={view} onNavigate={persistView} onLogout={onLogout} />
      {showAgent && <AgentPanel onClose={() => setShowAgent(false)} />}
      {showSmartSearch && <SmartSearch onNavigate={(v, params) => { persistView(v as ViewType); setShowSmartSearch(false) }} />}
    </div>
  )
}
