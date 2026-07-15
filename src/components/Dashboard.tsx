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

// ─── Types ─────────────────────────────────────────────────────────────────
interface OrderSummary {
  id: string
  serialNumber: string
  clientName: string
  clientCity: string
  typeMotorisation: string
  status: string
  createdAt: string
  _count: { cadSubmissions: number }
}

// ─── Props ────────────────────────────────────────────────────────────────
interface Props {
  onLogout: () => void
  session: PortalSession
  onSessionUpdate?: () => void
}

// ─── Data ──────────────────────────────────────────────────────────────────
function buildCurrentUser(session: PortalSession) {
  return {
    name: session.name,
    email: session.role === 'ADMIN' ? 'admin@rmasc.erp' : `${session.userId}@rmasc.erp`,
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
  { icon: 'FolderOpen', label: 'Bureau d\'Étude — File Vault', view: 'vault' as const, badge: null },
  { icon: 'Clock', label: 'Roadmap Production', view: 'roadmap' as const, badge: null },
  { icon: 'HelpCircle', label: 'Aide & Catalogue', view: 'help' as const, badge: null },
  { icon: 'Package', label: 'Archives', view: 'archives' as const, badge: null },
  { icon: 'Settings', label: 'Paramètres', view: 'settings' as const, badge: null },
]

const generalItems = [
  { icon: 'LogOut', label: 'Déconnexion', action: 'logout' as const },
]

// ─── SVG Icon Components ────────────────────────────────────────────────────
function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const props = { className, strokeWidth: 1.5, fill: 'none' }
  switch (name) {
    case 'LayoutDashboard': return (
      <svg {...props} viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1" strokeLinejoin="round"/><rect x="14" y="3" width="7" height="5" rx="1" strokeLinejoin="round"/><rect x="14" y="12" width="7" height="9" rx="1" strokeLinejoin="round"/><rect x="3" y="16" width="7" height="5" rx="1" strokeLinejoin="round"/></svg>
    )
    case 'ListTodo': return (
      <svg {...props} viewBox="0 0 24 24" stroke="currentColor"><line x1="9" y1="6" x2="20" y2="6" strokeLinecap="round"/><line x1="9" y1="12" x2="20" y2="12" strokeLinecap="round"/><line x1="9" y1="18" x2="20" y2="18" strokeLinecap="round"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/></svg>
    )
    case 'Calendar': return (
      <svg {...props} viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" strokeLinejoin="round"/><line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/><line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/></svg>
    )
    case 'BarChart3': return (
      <svg {...props} viewBox="0 0 24 24" stroke="currentColor"><line x1="4" y1="20" x2="4" y2="10" strokeLinecap="round"/><line x1="9" y1="20" x2="9" y2="6" strokeLinecap="round"/><line x1="14" y1="20" x2="14" y2="12" strokeLinecap="round"/><line x1="19" y1="20" x2="19" y2="8" strokeLinecap="round"/></svg>
    )
    case 'Users': return (
      <svg {...props} viewBox="0 0 24 24" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></svg>
    )
    case 'Settings': return (
      <svg {...props} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/></svg>
    )
    case 'HelpCircle': return (
      <svg {...props} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/></svg>
    )
    case 'LogOut': return (
      <svg {...props} viewBox="0 0 24 24" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round"/></svg>
    )
    case 'DollarSign': return (
      <svg {...props} viewBox="0 0 24 24" stroke="currentColor"><line x1="12" y1="2" x2="12" y2="22" strokeLinecap="round"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round"/></svg>
    )
    case 'FolderOpen': return (
      <svg {...props} viewBox="0 0 24 24" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeLinejoin="round"/><line x1="2" y1="15" x2="22" y2="15" strokeLinecap="round"/></svg>
    )
    case 'Search': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    )
    case 'Mail': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
    )
    case 'Bell': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
    )
    case 'Plus': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    )
    case 'Upload': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    )
    case 'Play': return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    )
    case 'Pause': return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
    )
    case 'Stop': return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
    )
    case 'Clock': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    )
    case 'ArrowUp': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
    )
    case 'MoreHorizontal': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
    )
    case 'UserPlus': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
    )
    case 'ChevronDown': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    )
    case 'Check': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    )
    case 'Code2': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
    )
    case 'GitMerge': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
    )
    case 'Zap': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    )
    case 'Globe': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    )
    case 'Download': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    )
    case 'Compass': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
    )
    case 'Factory': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20V8a2 2 0 0 1 2-2h2v12"/><path d="M6 20V6a2 2 0 0 1 2-2h2v16"/><path d="M10 20V4a2 2 0 0 1 2-2h2v18"/><path d="M14 20v-8a2 2 0 0 1 2-2h4v10"/><path d="M2 20h20"/></svg>
    )
    case 'CheckSquare': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    )
    case 'Package': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.55 4.24a1 1 0 0 0-1.1 0L3 6.5"/><polyline points="21 16 12 21 3 16 3 8 12 3 21 8 21 12"/><line x1="12" y1="21" x2="12" y2="11.5"/><line x1="9" y1="6.5" x2="15" y2="10"/></svg>
    )
    case 'Warehouse': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="6" x="6" y="10"/></svg>
    )
    case 'Wrench': return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    )
    default: return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
  }
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

type ViewType = 'dashboard' | 'add-elevator' | 'be-inspect' | 'fiche' | 'commandes' | 'validations' | 'settings' | 'roadmap' | 'help' | 'invoicing' | 'lifecycle' | 'vault' | 'archives' | 'pieces-solo'
function Sidebar({ onNavigate, onLogout, userRole }: { onNavigate?: (view: ViewType) => void; onLogout?: () => void; userRole?: string }) {
  const [activeView, setActiveView] = useState(() => {
    try { return localStorage.getItem('rmasc_active_tab') || 'dashboard' } catch { return 'dashboard' }
  })

  return (
    <aside className="hidden md:flex md:w-64 h-screen bg-white/[0.03] backdrop-blur-xl border-r border-white/5 flex-col flex-shrink-0">
      {/* Logo RMASC */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 overflow-hidden">
            <img src="/images/rmasc-logo.png" alt="RMASC" className="w-10 h-10 object-contain" />
          </div>
        </div>
      </div>

      {/* MENU Section */}
      <div className="px-4 mb-4">
        <p className="text-[11px] font-semibold tracking-widest text-gray-300 uppercase px-2 mb-2">Menu</p>
        <div className="h-px bg-white/5 mb-3 mx-2" />
        <nav className="space-y-0.5">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { setActiveView(item.view); if (onNavigate) onNavigate(item.view) }}
              className={`sidebar-item w-full text-left justify-between group ${activeView === item.view ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon name={item.icon} className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-accent-200 text-accent-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* INSPECTION Section — Quick Switch */}
      <div className="px-4 mb-4">
        <p className="text-[11px] font-semibold tracking-widest text-gray-300 uppercase px-2 mb-2">Raccourcis</p>
        <nav className="space-y-0.5">
          <button
            onClick={() => { if (onNavigate) onNavigate('add-elevator') }}
            className="sidebar-item w-full text-left group"
          >
            <div className="flex items-center gap-3">
              <span className="w-[18px] h-[18px] flex items-center justify-center text-base">➕</span>
              <span>Nouvel ascenseur</span>
            </div>
          </button>
          {/* 🔒 Pièces Solo — visible ONLY for INGENIEUR_2 and PRODUCTION */}
          {(userRole === 'INGENIEUR_2' || userRole === 'PRODUCTION') && (
            <button
              onClick={() => { if (onNavigate) onNavigate('pieces-solo') }}
              className={`sidebar-item w-full text-left group ${activeView === 'pieces-solo' ? 'active' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon name="Wrench" className="w-[18px] h-[18px]" />
                <span>Pièces Solo</span>
              </div>
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">ATELIER</span>
            </button>
          )}
        </nav>
      </div>

      {/* GÉNÉRAL Section */}
      <div className="px-4 mb-4">
        <p className="text-[11px] font-semibold tracking-widest text-gray-300 uppercase px-2 mb-2">Général</p>
        <nav className="space-y-0.5">
          {generalItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if ((item as any).action === 'logout') {
                  if (onLogout) onLogout()
                } else if ('view' in item && onNavigate) {
                  onNavigate((item as any).view)
                }
              }}
              className="sidebar-item w-full text-left"
            >
              <Icon name={item.icon} className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <InstallPWA variant="sidebar" />
    </aside>
  )
}

// ─── Mobile Bottom Navigation ──────────────────────────────────────────────
const MOBILE_NAV_ITEMS = [
  { icon: 'LayoutDashboard', label: 'Accueil', view: 'dashboard' as const },
  { icon: 'CheckSquare', label: 'Commandes', view: 'commandes' as const },
  { icon: 'Plus', label: 'Ajouter', view: 'add-elevator' as const },
  { icon: 'FolderOpen', label: 'Vault', view: 'vault' as const },
  { icon: 'Settings', label: 'Plus', view: 'settings' as const },
]

function MobileNav({ activeView, onNavigate, onLogout }: { activeView: string; onNavigate: (view: ViewType) => void; onLogout: () => void }) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {MOBILE_NAV_ITEMS.map(item => (
            <button
              key={item.view}
              onClick={() => {
                if (item.view === 'settings') {
                  setShowMenu(p => !p)
                } else {
                  onNavigate(item.view)
                }
              }}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
                activeView === item.view || (item.view === 'settings' && showMenu)
                  ? 'text-amber-400'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Icon name={item.icon} className={`w-5 h-5 ${activeView === item.view ? 'text-amber-400' : ''}`} />
              <span className="text-[9px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Expanded Menu Overlay (for "Plus" / Settings) */}
      {showMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setShowMenu(false)}>
          <div className="absolute bottom-20 left-4 right-4 bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="space-y-1">
              {menuItems.filter(m => !['dashboard', 'commandes', 'add-elevator', 'vault'].includes(m.view)).map(item => (
                <button
                  key={item.view}
                  onClick={() => { onNavigate(item.view); setShowMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-500/10 text-gray-300 hover:text-amber-400 transition-all text-sm font-medium"
                >
                  <Icon name={item.icon} className="w-5 h-5 text-gray-500" />
                  <span>{item.label}</span>
                  {item.badge && <span className="ml-auto bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>}
                </button>
              ))}
              <div className="border-t border-white/5 mt-2 pt-2">
                <button onClick={() => { onLogout(); setShowMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all text-sm font-medium">
                  <Icon name="LogOut" className="w-5 h-5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Header({ notifCount, onNotifClick, orders, user, onAgentToggle, agentActive, onSmartSearch }: { notifCount: number; onNotifClick?: () => void; orders: OrderSummary[]; user: { name: string; email: string; initials: string; role: string }; onAgentToggle?: () => void; agentActive?: boolean; onSmartSearch?: () => void }) {
  const [showProfile, setShowProfile] = useState(false)

  return (
    <header className="h-14 md:h-16 bg-white/[0.04] backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-3 md:px-6">
      <div className="w-1 md:w-4" />
      <div className="hidden md:block flex-1 max-w-md mx-auto">
        <button
          onClick={onSmartSearch}
          className="w-full flex items-center gap-3 bg-white/[0.06] border border-white/10 rounded-xl py-2 px-4 text-sm text-gray-400 hover:text-gray-200 hover:border-white/20 hover:bg-white/[0.08] transition-all group text-left"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="flex-1">Recherche intelligente...</span>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-white/[0.08] rounded-md px-1.5 py-0.5 font-medium group-hover:bg-white/[0.12] transition-all">
            <span>⌘K</span>
          </div>
        </button>
      </div>
      {/* Mobile search icon */}
      <button onClick={onSmartSearch} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-all">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
      <div className="flex items-center gap-1.5 md:gap-4">
        {/* Agent IA Button */}
        <button
          onClick={onAgentToggle}
          className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all shadow-sm relative ${
            agentActive
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/25'
              : 'bg-white/[0.06] hover:bg-white/[0.1] text-gray-400'
          }`}
          title="Assistant IA Salim"
        >
          <span className="text-base md:text-lg">🤖</span>
        </button>

        <SmartNotificationCenter onNavigate={(view) => onNotifClick?.()} orders={orders} />
        <div className="w-px h-5 md:h-7 bg-white/[0.08]" />
        <div className="relative">
          <div
            onClick={() => setShowProfile(p => !p)}
            className="flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] rounded-xl p-1.5 pr-3 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {user.initials}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-200 leading-tight">{user.name}</p>
              <p className="text-[11px] text-gray-500 font-medium">{user.role}</p>
            </div>
            <Icon name="ChevronDown" className="w-3.5 h-3.5 text-gray-500" />
          </div>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-[580px] max-h-[70vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10">
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl px-5 py-4 border-b border-white/5 flex items-center justify-between rounded-t-2xl">
                  <h3 className="text-sm font-bold text-gray-200">📊 Roadmap — Suivi des commandes</h3>
                  <span className="text-xs text-gray-500 font-medium">{orders.length} commande{orders.length > 1 ? 's' : ''}</span>
                </div>
                <div className="p-4 space-y-3">
                  {orders.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center py-4">Aucune commande enregistrée.</p>
                  ) : (
                    orders.map(order => <OrderRoadmap key={order.id} order={order} />)
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function OrderRoadmap({ order }: { order: OrderSummary }) {
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
    <div className="bg-white/[0.04] rounded-xl border border-white/5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-gray-200 font-mono">{order.serialNumber}</p>
          <p className="text-[11px] text-gray-500">{order.clientName} — {order.clientCity}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
          order.status === 'PRET_POUR_PRODUCTION' || order.status === 'VALIDEE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
        }`}>
          {order.status === 'PRET_POUR_PRODUCTION' ? 'Terminée' : 'En cours'}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative ml-2">
        {statusStep.map((step, i) => {
          const isPast = i <= activeIdx
          const isCurrent = i === activeIdx
          const elapsedH = (now - createdAt) / 3600000
          const phaseProgress = Math.min(100, Math.round((elapsedH / step.hours) * 100))

          return (
            <div key={step.key} className="flex gap-3 pb-3 last:pb-0">
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  isPast ? 'bg-emerald-500 text-white' : 'bg-white/[0.08] text-gray-500'
                }`}>
                  {isPast ? '✓' : i + 1}
                </div>
                {i < statusStep.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[12px] ${isPast ? 'bg-emerald-400/50' : 'bg-white/[0.06]'}`} />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-1">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${isCurrent ? 'text-gray-200' : isPast ? 'text-gray-300' : 'text-gray-500'}`}>
                    {step.icon} {step.label}
                  </p>
                  {isCurrent && step.hours > 0 && (
                    <span className={`text-[10px] font-bold ${phaseProgress > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {Math.max(0, Math.round(step.hours - elapsedH))}h restantes
                    </span>
                  )}
                  {isPast && !isCurrent && step.hours > 0 && (
                    <span className="text-[10px] text-gray-500 font-medium">✓ {step.hours}h</span>
                  )}
                </div>
                {isCurrent && step.hours > 0 && (
                  <div className="w-full h-1 rounded-full bg-white/[0.08] mt-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${phaseProgress > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, phaseProgress)}%` }} />
                  </div>
                )}
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {isCurrent ? 'En cours...' : isPast ? (step.hours > 0 ? `Durée estimée: ${step.hours}h` : '—') : 'En attente'}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtext, dark = false, icon }: { title: string; value: string; subtext: string; dark?: boolean; icon: string }) {
  const isDark = true // Force all cards to dark theme for consistency
  const gradients = [
    'from-amber-500/20 to-orange-600/5 border-amber-500/20',
    'from-emerald-500/20 to-teal-600/5 border-emerald-500/20',
    'from-blue-500/20 to-indigo-600/5 border-blue-500/20',
    'from-violet-500/20 to-purple-600/5 border-violet-500/20',
  ]
  const iconBg = [
    'bg-amber-500/20 text-amber-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-blue-500/20 text-blue-400',
    'bg-violet-500/20 text-violet-400',
  ]
  // Use title to pick a consistent color
  const idx = title.length % 4
  return (
    <div className={`rounded-2xl p-5 bg-white/[0.06] backdrop-blur-xl border ${gradients[idx]} shadow-lg hover:bg-white/[0.09] transition-all duration-300 group`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-300">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg[idx]}`}>
          <Icon name={icon} className="w-[18px] h-[18px]" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-0.5 tracking-tight">{value}</p>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Icon name="ArrowUp" className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-medium text-gray-400">{subtext}</span>
      </div>
    </div>
  )
}

function AnalyticsChart() {
  // Production distribution by elevator application category
  const chartData = [
    { value: 72, label: 'Résidentiel', color: 'from-amber-400 to-orange-500' },
    { value: 55, label: 'Commercial', color: 'from-emerald-400 to-teal-500' },
    { value: 38, label: 'Charges Lourdes', color: 'from-blue-400 to-indigo-500' },
    { value: 24, label: 'Sur-mesure', color: 'from-violet-400 to-purple-500' },
  ]
  const maxValue = Math.max(...chartData.map(d => d.value), 1)

  return (
    <div className="bg-white/[0.06] backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-white">Répartition par Application</h3>
        <button className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
          Ce mois
          <Icon name="ChevronDown" className="w-3 h-3" />
        </button>
      </div>

      <div className="relative h-[160px]">
        <div className="flex items-end justify-between gap-3 h-full pt-2 pb-6">
          {chartData.map((data, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
              {/* Value label */}
              <span className="text-xs font-bold text-white">{data.value}</span>
              {/* Bar */}
              <div className="relative w-full max-w-[32px] rounded-lg overflow-hidden group cursor-pointer" style={{ height: `${(data.value / maxValue) * 100}%` }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t ${data.color} transition-all duration-500 group-hover:brightness-110`}
                  style={{ height: '100%' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              {/* Category label */}
              <span className="text-[10px] font-medium text-gray-400">{data.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RemindersCard() {
  return (
    <div className="bg-white/[0.06] backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-lg">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Rappels Atelier
      </h3>
      <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0 shadow-lg shadow-amber-400/30" />
          <div>
            <p className="font-semibold text-gray-200">Contrôle Qualité Cabines — Série RMASC-2026</p>
            <p className="text-sm text-gray-400 mt-0.5 font-medium">Atelier Montage — 08h00</p>
          </div>
        </div>
        <button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-2 shadow-lg shadow-amber-500/25">
          <Icon name="Play" className="w-4 h-4" />
          Lancer le contrôle qualité
        </button>
      </div>
    </div>
  )
}

function ProjectList({ orders, onFiche }: { orders: OrderSummary[]; onFiche?: (id: string) => void }) {
  const recent = orders.slice(0, 5)
  const iconColors = [
    'bg-amber-500/20 text-amber-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-blue-500/20 text-blue-400',
    'bg-violet-500/20 text-violet-400',
    'bg-rose-500/20 text-rose-400',
  ]

  return (
    <div className="bg-white/[0.06] backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white">Commandes Récentes</h3>
        <span className="text-xs text-gray-400 font-semibold bg-white/[0.06] px-2.5 py-1 rounded-full">{orders.length} au total</span>
      </div>
      <div className="space-y-1">
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500 italic p-2.5">Aucune commande enregistrée.</p>
        ) : (
          recent.map((order, i) => (
            <div key={order.id}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group">
              <div className={`w-8 h-8 rounded-xl ${iconColors[i % iconColors.length]} flex items-center justify-center flex-shrink-0`}>
                <span className="text-xs font-bold">{order.serialNumber.slice(-2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {order.clientName} — <span className="font-mono text-xs text-gray-500">{order.serialNumber}</span>
                </p>
                <p className="text-xs text-gray-400 font-medium">
                  {order.clientCity} • {order.typeMotorisation}
                </p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                {onFiche && (
                  <button onClick={(e) => { e.stopPropagation(); onFiche(order.id) }}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all">
                    📄 Fiche
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function CollaborationCard() {
  const teamMembers = [
    { id: '1', name: 'Salim RM-RE', role: 'Administrateur', module: 'Direction Générale', avatar: 'SR', avatarBg: 'bg-gradient-to-br from-amber-500 to-orange-600', status: 'termine' as const },
    { id: '2', name: 'Karim B.', role: 'Dessinateur', module: 'Bureau d\'Études', avatar: 'KB', avatarBg: 'bg-gradient-to-br from-rose-400 to-pink-500', status: 'en-cours' as const },
    { id: '3', name: 'Yasmine H.', role: 'Ingénieure', module: 'Validation Technique', avatar: 'YH', avatarBg: 'bg-gradient-to-br from-blue-400 to-indigo-500', status: 'en-cours' as const },
    { id: '4', name: 'Rachid I.', role: 'Modeleur 2D', module: 'Plans CAO', avatar: 'RI', avatarBg: 'bg-gradient-to-br from-amber-400 to-yellow-500', status: 'en-attente' as const },
  ]

  const statusLabels = {
    'termine': 'Terminé',
    'en-cours': 'En Cours',
    'en-attente': 'En Attente',
  } as const

  const statusBadge = {
    'termine': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
    'en-cours': 'bg-amber-500/20 text-amber-400 border-amber-500/20',
    'en-attente': 'bg-gray-500/20 text-gray-400 border-gray-500/20',
  } as const

  return (
    <div className="bg-white/[0.06] backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Équipe Bureau d'Études</h3>
        <button className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all border border-amber-500/20">
          <Icon name="UserPlus" className="w-3.5 h-3.5 inline mr-1" />
          Ajouter
        </button>
      </div>
      <div className="space-y-2">
        {teamMembers.map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all">
            <div className={`w-9 h-9 rounded-xl ${member.avatarBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-lg`}>
              {member.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-200">{member.name}</p>
              <p className="text-xs text-gray-500">{member.module}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400 mb-1">{member.role}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge[member.status]}`}>{statusLabels[member.status]}</span>
            </div>
          </div>
        ))}
      </div>
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
    <div className="bg-white/[0.06] backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-lg flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-3">
        <h3 className="text-base font-semibold text-white">Progression des Commandes</h3>
      </div>
      <div className="relative w-[130px] h-[130px] mb-4">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#f59e0b" strokeWidth="8"
            strokeDasharray={`${(completedPct / 100) * circumference} ${circumference}`}
            strokeLinecap="round" transform="rotate(-90 50 50)" className="transition-all duration-700" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="8"
            strokeDasharray={`${(inProgressPct / 100) * circumference} ${circumference}`}
            strokeDashoffset={-completedOffset} strokeLinecap="round" transform="rotate(-90 50 50)"
            className="transition-all duration-700" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#6b7280" strokeWidth="8"
            strokeDasharray={`${(pendingPct / 100) * circumference} ${circumference}`}
            strokeDashoffset={-inProgressOffset} strokeLinecap="round" transform="rotate(-90 50 50)"
            className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{completedPct}%</span>
          <span className="text-[10px] text-gray-400 font-medium">Terminés</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-gray-400">Terminé ({termines})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span className="text-gray-400">En Cours ({enCours})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
          <span className="text-gray-400">Attente ({enAttente})</span>
        </div>
      </div>
    </div>
  )
}

// ─── Phase durations (hours) ────────────────────────────────────────────
// These will be configurable once estimation data is provided per cabin type.
const PHASE_HOURS: Record<string, number> = {
  BROUILLON: 0,
  ATTENTE_DESSIN_TECH: 16,       // Plan d'Installation — 2 jours ouvrés
  ATTENTE_APPROBATION_ADMIN: 4,  // Validation Admin — demi-journée
  ATTENTE_DESSIN_2D: 24,         // Dessin 2D Cabine — 3 jours ouvrés
  ATTENTE_VERIFICATION: 8,       // Vérification Finale — 1 jour
  PRET_POUR_PRODUCTION: 0,
  EN_LIVRAISON: 8,               // Livraison — 1 jour
  LIVREE: 0,                     // Terminé
}

function TimeTracker({ orders }: { orders: OrderSummary[] }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  // Only show orders that are in progress
  const activeOrders = orders.filter(o => o.status in PHASE_HOURS && PHASE_HOURS[o.status] > 0).slice(0, 4)

  if (activeOrders.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-5 shadow-card border border-slate-800 text-white relative overflow-hidden">
        <h3 className="text-base font-semibold mb-4 relative z-10 flex items-center gap-2">
          <span>⏱️</span>
          Suivi de Production
        </h3>
        <p className="text-sm text-slate-400 text-center py-6">Aucune commande active</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-5 shadow-card border border-slate-800 text-white relative overflow-hidden">
      <h3 className="text-base font-semibold mb-3 relative z-10 flex items-center gap-2">
        <span>⏱️</span>
        Suivi de Production
      </h3>
      <div className="space-y-3 relative z-10">
        {activeOrders.map((order, idx) => {
          const createdAt = new Date(order.createdAt).getTime()
          const hoursAllocated = PHASE_HOURS[order.status] || 0
          const hoursElapsed = (now - createdAt) / 3600000
          const remainingHours = Math.max(0, hoursAllocated - hoursElapsed)
          const progress = Math.min(100, Math.round((hoursElapsed / hoursAllocated) * 100))
          const remainingDays = Math.floor(remainingHours / 8)
          const remainingRemainder = Math.round(remainingHours % 8)

          return (
            <div key={order.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${remainingHours <= 0 ? 'bg-emerald-400' : remainingHours < hoursAllocated * 0.25 ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                  <p className="text-xs font-bold text-white font-mono truncate">{order.serialNumber.slice(-12)}</p>
                </div>
                <span className={`text-[10px] font-bold flex-shrink-0 ${remainingHours <= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {remainingHours <= 0 ? '✅ Terminé' : `~${remainingDays > 0 ? `${remainingDays}j ` : ''}${remainingRemainder}h`}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    remainingHours <= 0 ? 'bg-emerald-500' : progress > 80 ? 'bg-amber-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5">
                {order.clientName.slice(0, 20)} — {order.status === 'ATTENTE_DESSIN_TECH' ? 'Plan d\'Installation' : order.status === 'ATTENTE_DESSIN_2D' ? 'Dessin 2D' : order.status === 'ATTENTE_VERIFICATION' ? 'Vérification' : order.status === 'ATTENTE_APPROBATION_ADMIN' ? 'Validation Admin' : order.status}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Production Serial Generator ───────────────────────────────────────────
function generateSerial(): string {
  const year = new Date().getFullYear()
  const ts = Date.now().toString(36).toUpperCase().slice(-5)
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RMASC-${year}-${ts}${rand}`
}

// ─── Main Dashboard Component ───────────────────────────────────────────────

export default function Dashboard({ onLogout, session, onSessionUpdate }: Props) {
  // ── REQUIREMENT 1: Persist active tab across browser reloads ────────
  // Lazy-init from localStorage so the user stays on their last page
  const [view, setView] = useState<ViewType>(() => {
    const saved = localStorage.getItem('rmasc_active_tab')
    return (saved && ['dashboard','add-elevator','be-inspect','fiche','commandes','validations','settings','roadmap','help','invoicing','lifecycle','vault','archives','pieces-solo'].includes(saved))
      ? saved as ViewType
      : 'dashboard'
  })
  // Sync every view change to localStorage instantly
  const persistView = useCallback((v: ViewType) => {
    setView(v)
    try { localStorage.setItem('rmasc_active_tab', v) } catch {}
  }, [])
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [ficheOrderId, setFicheOrderId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<OrderSummary[]>([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [showAgent, setShowAgent] = useState(false)
  const [showSmartSearch, setShowSmartSearch] = useState(false)

  // ── AUTO-LAUNCH AGENT SALIM ──────────────────────────────────────────
  // Après 2 secondes, Salim s'ouvre automatiquement pour accueillir l'utilisateur
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAgent(true)
    }, 2000)
    // Request notification permission on mount
    requestNotificationPermission()
    return () => clearTimeout(timer)
  }, [])

  // ── GLOBAL KEYBOARD SHORTCUTS ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K → Smart Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSmartSearch(p => !p)
      }
      // ⌘I / Ctrl+I → Toggle Agent
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault()
        setShowAgent(p => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Fetch orders from Neon backend API ──────────────────────────────
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
        // ── Trigger alert on NEW notifications ──
        if (newNotifs.length > prevNotifCount.current) {
          const newCount = newNotifs.length - prevNotifCount.current
          triggerAlert(
            '🚨 Nouvelle alerte RMASC',
            `${newCount} commande${newCount > 1 ? 's' : ''} en attente d'approbation.`,
            newNotifs[0]?.serialNumber
          )
        }
        prevNotifCount.current = newNotifs.length
      } catch { /* silent */ }
    }
    load()
    const iv = setInterval(load, 8_000)
    const onFocus = () => { if (!cancelled) load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !cancelled) load() })
    return () => { cancelled = true; clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [])

  // ── Live KPI computations ──────────────────────────────────────────
  const kpis = {
    total: orders.length,
    termines: orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length,
    enCours: orders.filter(o => ['ATTENTE_DESSIN_TECH', 'ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION', 'EN_LIVRAISON'].includes(o.status)).length,
    enAttente: orders.filter(o => ['BROUILLON', 'ATTENTE_APPROBATION_ADMIN', 'PRET_POUR_PRODUCTION'].includes(o.status)).length,
  }

  if (view === 'add-elevator') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
        <AddElevator onBack={() => persistView('dashboard')} />
        </div>
      </div>
    )
  }

  // ── Bureau d'Études PLM ───────────────────────────────────────────
  if (view === 'be-inspect') {
    return (
      <div className="h-screen flex flex-col relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex-1 flex flex-col">
        {/* Inspection banner bar */}
        <div className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 flex items-center justify-between shadow-lg z-50">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">👁️</span>
            <span className="text-sm font-bold tracking-wide">Mode Inspection</span>
            <span className="text-xs font-medium text-white/80">Portail technique temporaire</span>
          </div>
          <button
            onClick={() => persistView('dashboard')}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-surface-50/20 hover:bg-surface-50/30 text-sm font-bold transition-all backdrop-blur-sm"
          >
            👑 Retour à l'Administration
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <BureauEtudeWorkspace onBack={() => persistView('dashboard')} />
        </div>
      </div>
      </div>
    )
  }

  // ── Mes Commandes ──────────────────────────────────────────────────
  if (view === 'commandes') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
        <div className="flex-1 overflow-y-auto">
          <MesCommandesPage onBack={() => persistView('dashboard')} onFiche={(id) => { setFicheOrderId(id); persistView('fiche') }} />
        </div>
        </div>
      </div>
    )
  }

  // ── Validations en attente ──────────────────────────────────────────
  if (view === 'validations') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
        <ValidationsPage
          onBack={() => persistView('dashboard')}
          onFiche={(id) => { setFicheOrderId(id); persistView('fiche') }}
        />
        </div>
      </div>
    )
  }

  // ── Aide & Catalogue ────────────────────────────────────────────────
  if (view === 'help') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
        <HelpPage onBack={() => persistView('dashboard')} />
        </div>
      </div>
    )
  }

  // ── Paramètres ─────────────────────────────────────────────────────
  if (view === 'settings') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
        <SettingsPage onBack={() => persistView('dashboard')} session={session} onSessionUpdate={onSessionUpdate} />
        </div>
      </div>
    )
  }

  // ── Roadmap Production ──────────────────────────────────────────────
  if (view === 'roadmap') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
        <RoadmapPage orders={orders as any} onBack={() => persistView('dashboard')} />
        </div>
      </div>
    )
  }

  // ── Fiche Technique full-page view ───────────────────────────────────
  if (view === 'fiche' && ficheOrderId) {
    return (
      <div className="h-screen flex flex-col bg-slate-950">
        <FicheTechniqueView orderId={ficheOrderId} onBack={() => { persistView('dashboard'); setFicheOrderId(null) }} variant="full" />
      </div>
    )
  }

  // ── Salim Hamoun AI — Invoicing & Devis ─────────────────────────────
  if (view === 'invoicing') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
        <InvoicingPage onBack={() => persistView('dashboard')} />
        </div>
      </div>
    )
  }

  // ── Bureau d'Etude — File Vault ────────────────────────────────────
  if (view === 'vault') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
        <BureauEtudeVault onBack={() => persistView('dashboard')} />
        </div>
      </div>
    )
  }

  // ── Lifecycle Pipeline ─────────────────────────────────────────────
  if (view === 'lifecycle') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
        <LifecyclePipeline onBack={() => persistView('dashboard')} />
        </div>
      </div>
    )
  }

  // ── Archives (global — all portals) ─────────────────────────────────
  if (view === 'archives') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
          <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
          <div className="flex-1 flex flex-col min-h-0">
            <Header notifCount={notifications.length} onNotifClick={() => setShowNotifPanel(p => !p)} orders={orders} user={buildCurrentUser(session)} onAgentToggle={() => setShowAgent(p => !p)} agentActive={showAgent} onSmartSearch={() => setShowSmartSearch(true)} />
            <main className="flex-1 overflow-y-auto">
              <ArchiveOrders onSelectOrder={(id) => { setFicheOrderId(id); persistView('fiche') }} />
            </main>
          </div>
        </div>
      </div>
    )
  }

  // ── Pièces Solo — Atelier (Ingénieur 2 + Production only) ────────────
  if (view === 'pieces-solo') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
          <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />
          <PiecesSoloWorkspace onBack={() => persistView('dashboard')} session={session} />
        </div>
      </div>
    )
  }

  const currentUserData = buildCurrentUser(session)

  return (
    <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
      {/* Sidebar */}
      <Sidebar onNavigate={persistView} onLogout={onLogout} userRole={session.role} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <Header notifCount={notifications.length} onNotifClick={() => setShowNotifPanel(p => !p)} orders={orders} user={currentUserData} onAgentToggle={() => setShowAgent(p => !p)} agentActive={showAgent} onSmartSearch={() => setShowSmartSearch(true)} />

        {/* Scrollable Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Smart Tips — Astuces contextuelles */}
          <SmartTips />

          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Tableau de bord</h1>
              <p className="text-xs md:text-sm text-gray-300 mt-1 font-medium">Vue d'ensemble de la production d'ascenseurs RMASC.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/25" onClick={() => persistView('add-elevator')}>
                <Icon name="Plus" className="w-4 h-4" />
                Ajouter un ascenseur
              </button>
              <button className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] hover:text-white transition-all border border-white/10">
                <Icon name="Upload" className="w-4 h-4" />
                Importer des données
              </button>
            </div>
          </div>

          {/* KPI Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 stagger-children">
            <KpiCard
              title="Commandes Totales"
              value={String(kpis.total)}
              subtext="Toutes les configurations enregistrées"
              dark={true}
              icon="BarChart3"
            />
            <KpiCard
              title="Commandes Livrées"
              value={String(kpis.termines)}
              subtext="Statut LIVRÉ ou CONSTRUIT"
              icon="Check"
            />
            <KpiCard
              title="En Production"
              value={String(kpis.enCours)}
              subtext="En attente ou en cours de fabrication"
              icon="ListTodo"
            />
            <KpiCard
              title="Brouillons"
              value={String(kpis.enAttente)}
              subtext="En attente de validation technique"
              icon="Clock"
            />
          </div>

          {/* Notification Panel — Approbations en attente */}
          {showNotifPanel && notifications.length > 0 && (
            <div className="mb-4 bg-white/[0.06] backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4 shadow-lg animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {notifications.length} commande{notifications.length > 1 ? 's' : ''} en attente d'approbation
                </h3>
                <button onClick={() => setShowNotifPanel(false)} className="text-amber-400 hover:text-amber-300 text-xs font-semibold">Masquer</button>
              </div>
              <div className="space-y-2">
                {notifications.slice(0, 5).map(n => (
                  <div key={n.id} className="flex items-center justify-between bg-white/[0.04] rounded-xl px-4 py-3 border border-white/5 shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-gray-200 font-mono">{n.serialNumber}</p>
                      <p className="text-xs text-gray-400">{n.clientName} — {n.clientCity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-lg">En attente</span>
                      <button
                        onClick={() => { persistView('validations'); setShowNotifPanel(false) }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-400 transition-all"
                      >
                        Vérifier →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ SMART PREDICTION & INSIGHTS ROW ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* ── Prédiction & Tendances ── */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg animate-scale-in relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/5 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🔮</span> Prédictions
                  </h3>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">IA</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Commandes en cours</span>
                    <span className="text-lg font-bold text-white">{orders.filter(o => !['LIVREE', 'VALIDEE', 'ANNULEE'].includes(o.status)).length}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-progress"
                      style={{ width: `${orders.length > 0 ? Math.round((orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length / orders.length) * 100) : 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Progression</span>
                    <span className="text-amber-400 font-bold">{orders.length > 0 ? Math.round((orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length / orders.length) * 100) : 0}%</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">📅 Estimation fin</span>
                      <span className="text-xs font-bold text-emerald-400">
                        {(() => {
                          const enCours = orders.filter(o => !['LIVREE', 'VALIDEE', 'ANNULEE'].includes(o.status)).length
                          const rythme = Math.max(1, Math.round(orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length / 6))
                          const mois = Math.ceil(enCours / rythme)
                          const d = new Date()
                          d.setMonth(d.getMonth() + mois)
                          return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Score de Productivité ── */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg animate-scale-in relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
              <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-emerald-500/5 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🏆</span> Productivité
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    orders.length > 0 && (orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length / orders.length) > 0.5
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {orders.length > 0 ? Math.round((orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length / orders.length) * 100) : 0}%
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">✅ Terminées</span>
                    <span className="text-sm font-bold text-emerald-400">{orders.filter(o => ['LIVREE', 'VALIDEE'].includes(o.status)).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">🔄 En cours</span>
                    <span className="text-sm font-bold text-amber-400">{orders.filter(o => ['ATTENTE_DESSIN_TECH', 'ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION', 'ATTENTE_APPROBATION_ADMIN', 'EN_LIVRAISON'].includes(o.status)).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">⏸️ Bloquées</span>
                    <span className="text-sm font-bold text-red-400">{orders.filter(o => ['BROUILLON', 'PRET_POUR_PRODUCTION'].includes(o.status)).length}</span>
                  </div>
                  <div className="pt-2 mt-1 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Diagnostic</span>
                      <span className="text-[10px] font-semibold text-slate-300">
                        {orders.filter(o => ['BROUILLON', 'ATTENTE_APPROBATION_ADMIN'].includes(o.status)).length > 3
                          ? '⚠️ Goulot d\'étranglement'
                          : orders.length === 0 ? '📭 Aucune donnée' : '✅ Bon rythme'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Alertes & Priorités ── */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg animate-scale-in relative overflow-hidden" style={{ animationDelay: '0.2s' }}>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-red-500/5 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🚨</span> Priorités
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] text-red-400 font-bold">
                      {orders.filter(o => o.priority === 'URGENT' || o.priority === 'HAUTE').length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">🔴 Urgent</span>
                    <span className="text-sm font-bold text-red-400">{orders.filter(o => o.priority === 'URGENT').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">🟠 Haute priorité</span>
                    <span className="text-sm font-bold text-orange-400">{orders.filter(o => o.priority === 'HAUTE').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">🔵 Normale</span>
                    <span className="text-sm font-bold text-blue-400">{orders.filter(o => !o.priority || o.priority === 'NORMAL').length}</span>
                  </div>
                  <div className="pt-2 mt-1 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Actions recommandées</span>
                      <span className="text-[10px] text-amber-400 font-semibold">
                        {orders.filter(o => o.priority === 'URGENT').length > 0
                          ? '✅ Traiter les urgences'
                          : orders.filter(o => o.status === 'ATTENTE_APPROBATION_ADMIN').length > 0
                            ? '✅ Valider les approbations'
                            : '✅ Tout est sous contrôle'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 stagger-children">
            <AnalyticsChart />
            <RemindersCard />
            <ProjectList orders={orders} onFiche={(id) => { setFicheOrderId(id); persistView('fiche') }} />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
            <CollaborationCard />
            <ProgressArc orders={orders} />
            <TimeTracker orders={orders} />
          </div>
        </main>
      </div>
        </div>
        {/* Mobile Navigation */}
        <MobileNav activeView={view} onNavigate={persistView} onLogout={onLogout} />
        {showAgent && <AgentPanel onClose={() => setShowAgent(false)} />}
        {showSmartSearch && <SmartSearch onNavigate={(view, params) => { persistView(view as ViewType); setShowSmartSearch(false) }} />}
    </div>
  )
}
