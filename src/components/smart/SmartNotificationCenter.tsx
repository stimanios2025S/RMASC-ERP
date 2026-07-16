// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — SMART NOTIFICATION CENTER
//  Analyse intelligente de toutes les données pour générer des
//  notifications contextuelles, priorisées et actionnables.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../../config/api'

interface SmartNotif {
  id: string
  type: 'urgent' | 'warning' | 'info' | 'success'
  icon: string
  title: string
  message: string
  action?: { label: string; onClick: () => void }
  timestamp: Date
  dismissable?: boolean
}

interface Props {
  onNavigate?: (view: string, params?: any) => void
  orders?: any[]
}

export default function SmartNotificationCenter({ onNavigate, orders: propOrders }: Props) {
  const [notifications, setNotifications] = useState<SmartNotif[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [orders, setOrders] = useState<any[]>(propOrders || [])
  const panelRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLButtonElement>(null)

  // ── Charge les données et analyse intelligente ──────────────────────
  useEffect(() => {
    async function analyze() {
      try {
        const ords: any[] = propOrders || await apiFetch('/orders')
        if (propOrders) setOrders(propOrders)
        else setOrders(ords)

        const items: any[] = await apiFetch('/stock/items').catch(() => [])
        const notifs: SmartNotif[] = []

        // 🔴 URGENT — Commandes urgentes non traitées
        const urgentes = ords.filter((o: any) => o.priority === 'URGENT' && !['LIVREE', 'VALIDEE', 'ANNULEE'].includes(o.status))
        urgentes.slice(0, 3).forEach((o: any) => {
          notifs.push({
            id: `urgent-${o.id}`,
            type: 'urgent',
            icon: '🔴',
            title: 'Commande urgente',
            message: `${o.serialNumber} — ${o.clientName} nécessite une action immédiate`,
            action: { label: 'Voir', onClick: () => onNavigate?.('commandes') },
            timestamp: new Date(o.createdAt),
          })
        })

        // 🟠 WARNING — Approbations en attente
        const approbations = ords.filter((o: any) => o.status === 'ATTENTE_APPROBATION_ADMIN')
        if (approbations.length > 0) {
          notifs.push({
            id: 'approbations',
            type: 'warning',
            icon: '⏳',
            title: 'Approbations en attente',
            message: `${approbations.length} commande${approbations.length > 1 ? 's' : ''} ${approbations.length > 1 ? 'sont' : 'est'} en attente de validation`,
            action: { label: 'Valider', onClick: () => onNavigate?.('validations') },
            timestamp: new Date(),
          })
        }

        // 🔴 WARNING — Stock bas
        const lowStock = items.filter((i: any) => i.quantity <= i.alertThreshold)
        if (lowStock.length > 0) {
          notifs.push({
            id: 'low-stock',
            type: 'warning',
            icon: '📦',
            title: 'Stock bas',
            message: `${lowStock.length} article${lowStock.length > 1 ? 's' : ''} sous le seuil critique`,
            action: { label: 'Voir stock', onClick: () => onNavigate?.('dashboard') },
            timestamp: new Date(),
          })
        }

        // ℹ️ INFO — Dessins en attente
        const dessin1 = ords.filter((o: any) => o.status === 'ATTENTE_DESSIN_TECH')
        const dessin2 = ords.filter((o: any) => o.status === 'ATTENTE_DESSIN_2D')
        if (dessin1.length > 0) {
          notifs.push({
            id: 'be-d1',
            type: 'info',
            icon: '📐',
            title: "Bureau d'Études - Plans",
            message: `${dessin1.length} plan${dessin1.length > 1 ? 's' : ''} d'installation à réaliser`,
            timestamp: new Date(),
          })
        }
        if (dessin2.length > 0) {
          notifs.push({
            id: 'be-d2',
            type: 'info',
            icon: '✏️',
            title: "Bureau d'Études - Dessins 2D",
            message: `${dessin2.length} dessin${dessin2.length > 1 ? 's' : ''} cabine à terminer`,
            timestamp: new Date(),
          })
        }

        // ✅ SUCCESS — Commandes récemment livrées
        const recentDelivered = ords.filter((o: any) => o.status === 'LIVREE' || o.status === 'VALIDEE')
        if (recentDelivered.length > 0 && recentDelivered.length < 5) {
          notifs.push({
            id: 'success-delivery',
            type: 'success',
            icon: '✅',
            title: 'Commandes terminées',
            message: `${recentDelivered.length} commande${recentDelivered.length > 1 ? 's' : ''} livrée${recentDelivered.length > 1 ? 's' : ''} avec succès`,
            timestamp: new Date(),
          })
        }

        // Classer par priorité
        const priority = { urgent: 0, warning: 1, info: 2, success: 3 }
        notifs.sort((a, b) => (priority[a.type] || 0) - (priority[b.type] || 0))

        setNotifications(notifs)
      } catch {}
    }

    analyze()
    const iv = setInterval(analyze, 15_000)
    return () => clearInterval(iv)
  }, [propOrders])

  // ── Fermeture au clic en dehors ──
  useEffect(() => {
    if (!showPanel) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPanel])

  const unreadCount = notifications.length
  const urgentCount = notifications.filter(n => n.type === 'urgent').length

  const badgeColor = urgentCount > 0
    ? 'bg-red-500 animate-pulse'
    : unreadCount > 0
      ? 'bg-amber-500'
      : 'bg-gray-400'

  return (
    <div className="relative">
      {/* ── Notification Bell ── */}
      <button
        ref={badgeRef}
        onClick={() => setShowPanel(p => !p)}
        className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-gray-400 hover:text-gray-200 transition-all relative"
        title="Notifications intelligentes"
      >
        <svg className="w-[20px] h-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 w-5.5 h-5.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-lg ring-2 ring-slate-900 ${badgeColor}`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {showPanel && (
        <div
          ref={panelRef}
          className="fixed right-4 md:right-24 top-16 z-[100] w-[420px] max-h-[70vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 animate-fade-in"
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl px-5 py-4 border-b border-white/5 flex items-center justify-between rounded-t-2xl z-10">
            <div>
              <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <span>🔔</span> Centre d'Intelligence
              </h3>
              <p className="text-[10px] text-gray-500">{notifications.length} notification{notifications.length > 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-200 text-xs">✕</button>
          </div>

          {/* Notifications */}
          <div className="p-3 space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl block mb-2">✅</span>
                <p className="text-sm text-gray-400 font-medium">Tout est sous contrôle</p>
                <p className="text-xs text-gray-500 mt-1">Aucune notification pour le moment.</p>
              </div>
            ) : (
              notifications.map((notif, i) => (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl border transition-all hover:shadow-sm animate-fade-in ${
                    notif.type === 'urgent' ? 'bg-red-500/10 border-red-500/20' :
                    notif.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                    notif.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    'bg-blue-500/10 border-blue-500/20'
                  }`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{notif.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-bold ${
                          notif.type === 'urgent' ? 'text-red-400' :
                          notif.type === 'warning' ? 'text-amber-400' :
                          notif.type === 'success' ? 'text-emerald-400' :
                          'text-blue-400'
                        }`}>{notif.title}</span>
                        <span className="text-[9px] text-gray-500">{notif.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-gray-300">{notif.message}</p>
                      {notif.action && (
                        <button
                          onClick={() => { notif.action?.onClick(); setShowPanel(false) }}
                          className={`mt-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            notif.type === 'urgent' ? 'bg-red-500 text-white hover:bg-red-600' :
                            notif.type === 'warning' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                            'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {notif.action.label} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-xl px-5 py-3 border-t border-white/5 rounded-b-2xl">
            <p className="text-[9px] text-gray-500 text-center">
              🤖 Analyse intelligente en temps réel · Mise à jour automatique
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
