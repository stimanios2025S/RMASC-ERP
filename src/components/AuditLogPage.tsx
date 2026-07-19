// ─── RMASC FACTORY — Audit Log Viewer (Admin) ───────────────────────────
// Affiche l'historique des actions dans l'interface d'administration.

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../config/api'
import Icon from './ui/Icon'

interface AuditEntry {
  id: string
  action: string
  resource: string
  resourceId: string
  userId: string
  userName: string
  details: any
  ip: string
  statusCode: number
  duration: number
  createdAt: string
}

interface AuditResponse {
  items: AuditEntry[]
  total: number
  page: number
  totalPages: number
}

const ACTION_ICONS: Record<string, string> = {
  'POST /orders': '📝',
  'PATCH /orders': '✏️',
  'DELETE /orders': '🗑️',
  'POST /stock': '📦',
  'PATCH /stock': '🔧',
  'POST /users': '👤',
  'PATCH /users': '👤',
  'POST /users/login': '🔑',
}

const ACTION_COLORS: Record<string, string> = {
  'POST': 'bg-emerald-500/20 text-emerald-400',
  'PATCH': 'bg-amber-500/20 text-amber-400',
  'PUT': 'bg-blue-500/20 text-blue-400',
  'DELETE': 'bg-red-500/20 text-red-400',
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return iso }
}

function getActionMethod(action: string): string {
  return action.split(' ')[0] || ''
}

function getActionLabel(action: string): string {
  const parts = action.split(' ')
  const method = parts[0] || ''
  const path = parts.slice(1).join(' ') || action
  return path.length > 40 ? path.slice(0, 40) + '…' : path
}

export default function AuditLogPage({ onBack }: { onBack?: () => void }) {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterDays, setFilterDays] = useState('7')
  const [actions, setActions] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (filterAction) params.set('action', filterAction)
      if (filterUser) params.set('userId', filterUser)
      if (filterDays) params.set('days', filterDays)

      const [data, acts] = await Promise.all([
        apiFetch<AuditResponse>(`/admin/audit-logs?${params}`),
        apiFetch<string[]>('/admin/audit-logs/actions'),
      ])
      setLogs(data.items || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      if (acts) setActions(acts)
    } catch { /* silencieux */ }
    finally { setLoading(false) }
  }, [page, filterAction, filterUser, filterDays])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-800/60">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/[0.06] text-white">
              <Icon name="ArrowLeft" className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg font-bold text-white">📋 Journal d'Audit</h1>
          <span className="text-xs text-white bg-white/[0.06] px-2 py-0.5 rounded">{total} entrées</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-white/[0.02] flex-wrap">
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1) }}
          className="h-9 px-3 rounded-xl border border-white/10 bg-slate-800/60 text-xs text-white/80">
          <option value="">Toutes actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="text" value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1) }}
          placeholder="🔍 Filtre utilisateur..."
          className="h-9 px-3 rounded-xl border border-white/10 bg-slate-800/60 text-xs text-white/80 w-48" />
        <select value={filterDays} onChange={e => { setFilterDays(e.target.value); setPage(1) }}
          className="h-9 px-3 rounded-xl border border-white/10 bg-slate-800/60 text-xs text-white/80">
          <option value="1">24h</option>
          <option value="7">7 jours</option>
          <option value="30">30 jours</option>
          <option value="90">90 jours</option>
        </select>
        <button onClick={() => { setPage(1); load() }} className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/30">
          🔄 Rafraîchir
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-white/60">Chargement...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/60 italic">Aucune entrée d'audit.</div>
        ) : (
          <div className="p-4 space-y-2">
            {logs.map(log => {
              const method = getActionMethod(log.action)
              const color = ACTION_COLORS[method] || 'bg-white/10 text-white'
              const icon = ACTION_ICONS[log.action] || '📋'
              return (
                <div key={log.id} className="bg-slate-800/60 rounded-xl border border-white/10 p-4 hover:bg-white/[0.06] transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-lg flex-shrink-0">{icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>{method}</span>
                          <span className="text-xs font-mono text-white/80 truncate">{getActionLabel(log.action)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-white">
                          <span>👤 {log.userName || log.userId}</span>
                          {log.resourceId && <span>🔗 {log.resourceId.slice(-8)}</span>}
                          {log.duration != null && <span>⚡ {log.duration}ms</span>}
                          <span>📌 {log.statusCode}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[11px] text-white/60 font-mono whitespace-nowrap">{fmtDate(log.createdAt)}</span>
                      {log.ip && <div className="text-[9px] text-white/40 mt-0.5">{log.ip}</div>}
                    </div>
                  </div>
                  {log.details?.body && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <details className="text-[10px] text-white/60">
                        <summary className="cursor-pointer hover:text-white/80">Détails</summary>
                        <pre className="mt-1 p-2 bg-black/30 rounded-lg overflow-x-auto">{JSON.stringify(log.details.body, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-white/5 bg-white/[0.02]">
        <span className="text-xs text-white/60">Page {page} / {totalPages}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white text-xs font-semibold disabled:opacity-30 hover:bg-white/[0.1]">
            ← Précédent
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white text-xs font-semibold disabled:opacity-30 hover:bg-white/[0.1]">
            Suivant →
          </button>
        </div>
      </div>
    </div>
  )
}
