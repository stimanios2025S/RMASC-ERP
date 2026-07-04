import React, { useState, useEffect, useCallback } from 'react'
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
import { apiFetch } from '../config/api'
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
    default: return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
  }
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

type ViewType = 'dashboard' | 'add-elevator' | 'be-inspect' | 'fiche' | 'commandes' | 'validations' | 'settings' | 'roadmap' | 'help' | 'invoicing' | 'lifecycle' | 'vault'
function Sidebar({ onNavigate, onLogout }: { onNavigate?: (view: ViewType) => void; onLogout?: () => void }) {
  const [activeView, setActiveView] = useState(() => {
    try { return localStorage.getItem('rmasc_active_tab') || 'dashboard' } catch { return 'dashboard' }
  })

  return (
    <aside className="w-64 h-screen bg-sidebar-bg border-r border-gray-100 flex flex-col flex-shrink-0">
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
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase px-2 mb-2">Menu</p>
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
                <span className="bg-accent-100 text-accent-600 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* INSPECTION Section — Quick Switch */}
      <div className="px-4 mb-4">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase px-2 mb-2">Raccourcis</p>
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
        </nav>
      </div>

      {/* GÉNÉRAL Section */}
      <div className="px-4 mb-4">
        <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase px-2 mb-2">Général</p>
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

    </aside>
  )
}

function Header({ notifCount, onNotifClick, orders, user }: { notifCount: number; onNotifClick?: () => void; orders: OrderSummary[]; user: { name: string; email: string; initials: string; role: string } }) {
  const [showProfile, setShowProfile] = useState(false)

  return (
    <header className="h-16 bg-gradient-to-r from-primary-50 to-surface-50 border-b border-surface-100 flex items-center justify-between px-6">
      <div className="w-4" />
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Icon name="Search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une tâche..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-12 text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent-300 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-gray-400 bg-gray-100 rounded-md px-1.5 py-0.5 font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4l16 16M20 4L4 20"/></svg>
            <span>⌘F</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={onNotifClick}
          className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-all relative"
        >
          <svg className={`w-[20px] h-[20px] ${notifCount > 0 ? 'text-amber-500' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5.5 h-5.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>
        <div className="w-px h-7 bg-gray-200" />
        <div className="relative">
          <div
            onClick={() => setShowProfile(p => !p)}
            className="flex items-center gap-3 cursor-pointer hover:bg-surface-100 rounded-xl p-1.5 pr-3 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {user.initials}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{user.name}</p>
              <p className="text-[10px] text-gray-400">{user.role}</p>
            </div>
            <Icon name="ChevronDown" className="w-3.5 h-3.5 text-gray-400" />
          </div>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-[580px] max-h-[70vh] overflow-y-auto bg-surface-50 rounded-2xl shadow-2xl border border-slate-200">
                <div className="sticky top-0 bg-surface-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
                  <h3 className="text-sm font-bold text-slate-800">📊 Roadmap — Suivi des commandes</h3>
                  <span className="text-xs text-slate-400">{orders.length} commande{orders.length > 1 ? 's' : ''}</span>
                </div>
                <div className="p-4 space-y-3">
                  {orders.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-4">Aucune commande enregistrée.</p>
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
    <div className="bg-surface-50 rounded-xl border border-slate-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-slate-800 font-mono">{order.serialNumber}</p>
          <p className="text-[11px] text-slate-500">{order.clientName} — {order.clientCity}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
          order.status === 'PRET_POUR_PRODUCTION' || order.status === 'VALIDEE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
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
                  isPast ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  {isPast ? '✓' : i + 1}
                </div>
                {i < statusStep.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[12px] ${isPast ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-1">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${isCurrent ? 'text-slate-800' : isPast ? 'text-slate-500' : 'text-slate-400'}`}>
                    {step.icon} {step.label}
                  </p>
                  {isCurrent && step.hours > 0 && (
                    <span className={`text-[10px] font-bold ${phaseProgress > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {Math.max(0, Math.round(step.hours - elapsedH))}h restantes
                    </span>
                  )}
                  {isPast && !isCurrent && step.hours > 0 && (
                    <span className="text-[10px] text-slate-400 font-medium">✓ {step.hours}h</span>
                  )}
                </div>
                {isCurrent && step.hours > 0 && (
                  <div className="w-full h-1 rounded-full bg-slate-200 mt-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${phaseProgress > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, phaseProgress)}%` }} />
                  </div>
                )}
                <p className="text-[9px] text-slate-400 mt-0.5">
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
  return (
    <div className={`kpi-card ${dark ? 'dark' : 'bg-primary-50/60'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-medium ${dark ? 'text-accent-100' : 'text-gray-500'}`}>{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-surface-50/10' : 'bg-accent-50'}`}>
          <Icon name={icon} className={`w-[18px] h-[18px] ${dark ? 'text-white' : 'text-accent-500'}`} />
        </div>
      </div>
      <p className={`stat-number mb-0.5 ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      <div className="flex items-center gap-1.5">
        <Icon name="ArrowUp" className={`w-3.5 h-3.5 ${dark ? 'text-accent-300' : 'text-accent-500'}`} />
        <span className={`text-xs ${dark ? 'text-accent-200' : 'text-gray-400'}`}>{subtext}</span>
      </div>
    </div>
  )
}

function AnalyticsChart() {
  // Production distribution by elevator application category
  const chartData = [
    { value: 72, label: 'Résidentiel' },
    { value: 55, label: 'Commercial' },
    { value: 38, label: 'Charges Lourdes' },
    { value: 24, label: 'Sur-mesure' },
  ]
  const maxValue = Math.max(...chartData.map(d => d.value), 1)

  return (
    <div className="bg-surface-50 rounded-2xl p-5 shadow-card border border-gray-50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-800">Répartition par Application</h3>
        <button className="btn-ghost text-xs flex items-center gap-1">
          Ce mois
          <Icon name="ChevronDown" className="w-3 h-3" />
        </button>
      </div>

      <div className="relative h-[140px]">
        <div className="absolute -top-2 left-[42%] bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg z-10 flex items-center gap-1.5">
          <Icon name="ArrowUp" className="w-3 h-3 text-accent-300" />
          72 unités
        </div>

        <div className="flex items-end justify-between gap-1.5 h-full pt-2 pb-6">
          {chartData.map((data, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
              {/* Bar */}
              <div className="relative w-full max-w-[28px] rounded-md overflow-hidden" style={{ height: `${(data.value / maxValue) * 100}%` }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${
                    i % 2 === 0 ? 'bg-primary-700' : 'bg-accent-400'
                  }`}
                  style={{ height: '100%' }}
                >
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.3) 3px, rgba(255,255,255,0.3) 6px)',
                    }}
                  />
                </div>
              </div>
              {/* Category label */}
              <span className="text-[10px] font-medium text-gray-500">{data.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RemindersCard() {
  return (
    <div className="bg-surface-50 rounded-2xl p-5 shadow-card border border-gray-50">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Rappels Atelier</h3>
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-500 mt-1.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-800">Contrôle Qualité Cabines — Série RMASC-2026</p>
            <p className="text-sm text-gray-400 mt-0.5">Atelier Montage — 08h00</p>
          </div>
        </div>
        <button className="w-full bg-primary-800 hover:bg-primary-900 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-2 shadow-sm">
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
    'bg-violet-100 text-violet-600',
    'bg-sky-100 text-sky-600',
    'bg-emerald-100 text-emerald-600',
    'bg-amber-100 text-amber-600',
    'bg-rose-100 text-rose-600',
  ]

  return (
    <div className="bg-surface-50 rounded-2xl p-5 shadow-card border border-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Commandes Récentes</h3>
        <span className="text-xs text-gray-400 font-medium">{orders.length} au total</span>
      </div>
      <div className="space-y-1">
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 italic p-2.5">Aucune commande enregistrée.</p>
        ) : (
          recent.map((order, i) => (
            <div key={order.id}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-100 transition-all cursor-pointer group">
              <div className={`w-8 h-8 rounded-xl ${iconColors[i % iconColors.length]} flex items-center justify-center flex-shrink-0`}>
                <span className="text-xs font-bold">{order.serialNumber.slice(-2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {order.clientName} — <span className="font-mono text-xs text-gray-500">{order.serialNumber}</span>
                </p>
                <p className="text-xs text-gray-400">
                  {order.clientCity} • {order.typeMotorisation}
                </p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                {onFiche && (
                  <button onClick={(e) => { e.stopPropagation(); onFiche(order.id) }}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all">
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
    { id: '1', name: 'Salim RM-RE', role: 'Administrateur', module: 'Direction Générale', avatar: 'SR', avatarBg: 'bg-amber-500', status: 'termine' as const },
    { id: '2', name: 'Karim B.', role: 'Dessinateur', module: 'Bureau d\'Études', avatar: 'KB', avatarBg: 'bg-rose-400', status: 'en-cours' as const },
    { id: '3', name: 'Yasmine H.', role: 'Ingénieure', module: 'Validation Technique', avatar: 'YH', avatarBg: 'bg-primary-400', status: 'en-cours' as const },
    { id: '4', name: 'Rachid I.', role: 'Modeleur 2D', module: 'Plans CAO', avatar: 'RI', avatarBg: 'bg-amber-400', status: 'en-attente' as const },
  ]

  const statusLabels = {
    'termine': 'Terminé',
    'en-cours': 'En Cours',
    'en-attente': 'En Attente',
  } as const

  const statusBadge = {
    'termine': 'badge badge-success',
    'en-cours': 'badge badge-warning',
    'en-attente': 'badge badge-danger',
  } as const

  return (
    <div className="bg-surface-50 rounded-2xl p-5 shadow-card border border-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Équipe Bureau d'Études</h3>
        <button className="btn-primary !py-1.5 !px-3 !text-xs">
          <Icon name="UserPlus" className="w-3.5 h-3.5" />
          Ajouter un membre
        </button>
      </div>
      <div className="space-y-2">
        {teamMembers.map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-100 transition-all">
            <div className={`w-9 h-9 rounded-xl ${member.avatarBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}>
              {member.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{member.name}</p>
              <p className="text-xs text-gray-400">{member.module}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-500 mb-1">{member.role}</p>
              <span className={statusBadge[member.status]}>{statusLabels[member.status]}</span>
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
    <div className="bg-surface-50 rounded-2xl p-5 shadow-card border border-gray-50 flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-3">
        <h3 className="text-base font-semibold text-gray-800">Progression des Commandes</h3>
      </div>
      <div className="relative w-[130px] h-[130px] mb-4">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#2563eb" strokeWidth="8"
            strokeDasharray={`${(completedPct / 100) * circumference} ${circumference}`}
            strokeLinecap="round" transform="rotate(-90 50 50)" className="transition-all duration-700" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#f59e0b" strokeWidth="8"
            strokeDasharray={`${(inProgressPct / 100) * circumference} ${circumference}`}
            strokeDashoffset={-completedOffset} strokeLinecap="round" transform="rotate(-90 50 50)"
            className="transition-all duration-700" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#ef4444" strokeWidth="8"
            strokeDasharray={`${(pendingPct / 100) * circumference} ${circumference}`}
            strokeDashoffset={-inProgressOffset} strokeLinecap="round" transform="rotate(-90 50 50)"
            className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{completedPct}%</span>
          <span className="text-[10px] text-gray-400 font-medium">Terminés</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-700" />
          <span className="text-gray-500">Terminé ({termines})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-gray-500">En Cours ({enCours})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-gray-500">Attente ({enAttente})</span>
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
    return (saved && ['dashboard','add-elevator','be-inspect','fiche','commandes','validations','settings','roadmap','help','invoicing','lifecycle','vault'].includes(saved))
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

  // ── Fetch orders from Neon backend API ──────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data: OrderSummary[] = await apiFetch('/orders')
        if (cancelled) return
        setOrders(data)
        setNotifications(data.filter(o => o.status === 'ATTENTE_APPROBATION_ADMIN'))
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
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} />
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
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
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
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} />
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
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} />
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
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} />
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
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} />
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
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} />
        <RoadmapPage orders={orders as any} onBack={() => persistView('dashboard')} />
        </div>
      </div>
    )
  }

  // ── Fiche Technique view ─────────────────────────────────────────────
  if (view === 'fiche' && ficheOrderId) {
    return <FicheTechniqueView orderId={ficheOrderId} onBack={() => { persistView('dashboard'); setFicheOrderId(null) }} />
  }

  // ── Salim Hamoun AI — Invoicing & Devis ─────────────────────────────
  if (view === 'invoicing') {
    return (
      <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} />
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
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} />
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
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
        <Sidebar onNavigate={persistView} onLogout={onLogout} />
        <LifecyclePipeline onBack={() => persistView('dashboard')} />
        </div>
      </div>
    )
  }

  const currentUserData = buildCurrentUser(session)

  return (
    <div className="flex h-screen relative">
        <div className="absolute inset-0 z-0">
          <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20" />
          <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex w-full">
      {/* Sidebar */}
      <Sidebar onNavigate={persistView} onLogout={onLogout} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header notifCount={notifications.length} onNotifClick={() => setShowNotifPanel(p => !p)} orders={orders} user={currentUserData} />

        {/* Scrollable Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
              <p className="text-sm text-gray-400 mt-1">Vue d'ensemble de la production d'ascenseurs RMASC.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary" onClick={() => persistView('add-elevator')}>
                <Icon name="Plus" className="w-4 h-4" />
                Ajouter un ascenseur
              </button>
              <button className="btn-outline">
                <Icon name="Upload" className="w-4 h-4" />
                Importer des données
              </button>
            </div>
          </div>

          {/* KPI Metrics Row */}
          <div className="grid grid-cols-4 gap-4 mb-4">
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
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  {notifications.length} commande{notifications.length > 1 ? 's' : ''} en attente d'approbation
                </h3>
                <button onClick={() => setShowNotifPanel(false)} className="text-amber-400 hover:text-amber-600 text-xs font-medium">Masquer</button>
              </div>
              <div className="space-y-2">
                {notifications.slice(0, 5).map(n => (
                  <div key={n.id} className="flex items-center justify-between bg-surface-50 rounded-xl px-4 py-3 border border-amber-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800 font-mono">{n.serialNumber}</p>
                      <p className="text-xs text-slate-500">{n.clientName} — {n.clientCity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-lg">En attente</span>
                      <button
                        onClick={() => { persistView('validations'); setShowNotifPanel(false) }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all"
                      >
                        Vérifier →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Middle Row */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <AnalyticsChart />
            <RemindersCard />
            <ProjectList orders={orders} onFiche={(id) => { setFicheOrderId(id); persistView('fiche') }} />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-3 gap-4">
            <CollaborationCard />
            <ProgressArc orders={orders} />
            <TimeTracker orders={orders} />
          </div>
        </main>
      </div>
        </div>
    </div>
  )
}
