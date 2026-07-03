import { useState, useEffect } from 'react'
import type { PortalSession, PortalUser } from '../data/portalUsers'
import { getSession, changeAdminCredentials, updateUserDisplayName, fetchAllUsers } from '../data/portalUsers'

interface Props {
  onBack?: () => void
  session?: PortalSession
  onSessionUpdate?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '👑 Administrateur en Chef',
  INGENIEUR_1: '📐 Ingénieur Dessinateur 1',
  INGENIEUR_2: '✏️ Ingénieur Dessinateur 2',
  VERIFICATEUR: '🔍 Vérificateur en Chef',
  PRODUCTION: '🏭 Chef de Production',
  MAGASINIER: '📦 Magasinier / Stocks',
}

const ROLE_ORDER = ['ADMIN', 'INGENIEUR_1', 'INGENIEUR_2', 'VERIFICATEUR', 'PRODUCTION', 'MAGASINIER']

export default function SettingsPage({ onBack, session, onSessionUpdate }: Props) {
  const [users, setUsers] = useState<PortalUser[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  // ── Admin credential change state ──
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newId, setNewId] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [adminSaving, setAdminSaving] = useState(false)

  const user = session || getSession()
  if (!user) return null
  const isAdmin = user.role === 'ADMIN'

  // ── Load users from database on mount + every 10s ─────────────────────
  useEffect(() => {
    let ignore = false
    const load = async () => {
      try { const data = await fetchAllUsers(); if (!ignore) setUsers(data) } catch {}
    }
    load()
    const iv = setInterval(load, 10_000)
    return () => { ignore = true; clearInterval(iv) }
  }, [])

  const refreshUsers = async () => {
    try { const d = await fetchAllUsers(); setUsers(d) } catch {}
  }

  const startEdit = (u: PortalUser) => {
    setEditingId(u.id)
    setEditName(u.name)
    setFeedback(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setFeedback(null)
  }

  const saveName = async (userId: string) => {
    if (!editName.trim()) { setFeedback({ ok: false, msg: 'Le nom ne peut pas être vide.' }); return }
    setSavingId(userId)
    const result = await updateUserDisplayName(userId, editName.trim())
    setSavingId(null)
    if (result.success) {
      setFeedback({ ok: true, msg: '✅ Nom mis à jour avec succès.' })
      setEditingId(null)
      refreshUsers()
      if (onSessionUpdate) onSessionUpdate()
    } else {
      setFeedback({ ok: false, msg: result.error || 'Erreur.' })
    }
    setTimeout(() => setFeedback(null), 3000)
  }

  // ── Admin credential form ──
  const handleAdminCredentialChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    if (!currentPassword) { setFeedback({ ok: false, msg: 'Mot de passe actuel requis.' }); return }
    if (!newPassword || newPassword.length < 4) { setFeedback({ ok: false, msg: 'Mot de passe min. 4 caractères.' }); return }
    if (newPassword !== confirmPassword) { setFeedback({ ok: false, msg: 'Les mots de passe ne correspondent pas.' }); return }

    setAdminSaving(true)
    const adminUser = users.find(u => u.role === 'ADMIN')
    const result = await changeAdminCredentials(
      adminUser?.loginId || '',
      currentPassword,
      newId.trim() || adminUser?.loginId || '',
      newPassword,
    )
    setAdminSaving(false)
    if (result.success) {
      setFeedback({ ok: true, msg: '✅ Identifiants administrateur mis à jour !' })
      setShowAdminForm(false)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      if (onSessionUpdate) onSessionUpdate()
      refreshUsers()
    } else {
      setFeedback({ ok: false, msg: result.error || 'Erreur.' })
    }
    setTimeout(() => setFeedback(null), 4000)
  }

  const sorted = ROLE_ORDER.map(role => users.find(u => u.role === role)).filter(Boolean) as PortalUser[]

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-primary-50/60 via-surface-50 to-surface-50">
      <div className="sticky top-0 z-10 bg-surface-50 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <h1 className="text-lg font-extrabold text-slate-800">⚙️ Paramètres</h1>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-6">

        {/* Feedback toast */}
        {feedback && (
          <div className={`rounded-2xl px-5 py-3.5 border flex items-center gap-3 text-sm font-medium ${
            feedback.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span>{feedback.ok ? '✅' : '⚠️'}</span>
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ── Team Management ── */}
        <div className="bg-surface-50 rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">👥 Équipe — Gestion des noms</h2>
            {!isAdmin && <span className="text-xs text-amber-600 font-medium">Lecture seule</span>}
          </div>
          <p className="text-[11px] text-slate-400 mb-4">
            {isAdmin
              ? 'Cliquez sur ✏️ pour modifier le nom d\'un membre de l\'équipe.'
              : 'Seul l\'administrateur peut modifier les noms.'}
          </p>

          <div className="space-y-2">
            {sorted.map(u => {
              const isEditing = editingId === u.id
              const isSaving = savingId === u.id
              const isCurrentUser = u.loginId === user.userId

              return (
                <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isEditing ? 'border-amber-300 bg-amber-50/50' : 'border-slate-100 bg-surface-50'
                }`}>
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                    u.role === 'ADMIN' ? 'bg-amber-500' :
                    u.role === 'INGENIEUR_1' ? 'bg-sky-500' :
                    u.role === 'INGENIEUR_2' ? 'bg-violet-500' :
                    u.role === 'VERIFICATEUR' ? 'bg-rose-500' :
                    u.role === 'PRODUCTION' ? 'bg-emerald-500' :
                    'bg-cyan-500'
                  }`}>
                    {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {isEditing && isAdmin ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          autoFocus
                          className="flex-1 h-9 px-3 rounded-lg border border-amber-300 bg-surface-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                          onKeyDown={e => { if (e.key === 'Enter') saveName(u.id); if (e.key === 'Escape') cancelEdit() }}
                        />
                        <button onClick={() => saveName(u.id)} disabled={isSaving}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-60">
                          {isSaving ? '⏳' : '💾'}
                        </button>
                        <button onClick={cancelEdit}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-100">
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">{u.name}</p>
                        {u.role === 'ADMIN' && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Admin</span>}
                        {isCurrentUser && !isEditing && <span className="text-[9px] text-slate-400">— Vous</span>}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400">{ROLE_LABELS[u.role] || u.role}</p>
                  </div>

                  {/* Edit button */}
                  {isAdmin && !isEditing && (
                    <button onClick={() => startEdit(u)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-all">
                      ✏️
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Admin Credentials ── */}
        {isAdmin && (
          <div className="bg-surface-50 rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">🔐 Identifiants Administrateur</h2>
              {!showAdminForm && (
                <button onClick={() => setShowAdminForm(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm">
                  ✏️ Modifier
                </button>
              )}
            </div>

            {showAdminForm && (
              <form onSubmit={handleAdminCredentialChange} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600">Identifiant</label>
                    <input type="text" value={newId} onChange={e => setNewId(e.target.value)}
                      placeholder={users.find(u => u.role === 'ADMIN')?.loginId || 'admin'}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-surface-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600">Mot de passe actuel *</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Saisir le mot de passe actuel" required
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-surface-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                  </div>
                </div>
                <hr className="border-slate-100" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600">Nouveau mot de passe *</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min. 4 caractères" required
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-surface-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600">Confirmer *</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirmer le mot de passe" required
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-surface-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={adminSaving}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all shadow-sm disabled:opacity-60">
                    {adminSaving ? '⏳...' : '💾 Mettre à jour'}
                  </button>
                  <button type="button" onClick={() => setShowAdminForm(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-surface-50">
                    Annuler
                  </button>
                </div>
              </form>
            )}

            {!showAdminForm && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700">
                  🔒 L'administrateur peut modifier son identifiant et mot de passe.
                  Les autres comptes ont des identifiants fixes (seuls les noms sont modifiables ci-dessus).
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Not-admin notice ── */}
        {!isAdmin && (
          <div className="bg-surface-50 rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4">🔒 Vos informations</h2>
            <div className="bg-surface-50 border border-slate-100 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500">
                Votre nom et identifiant sont gérés par l'administrateur système.
                Contactez l'administration pour toute modification.
              </p>
            </div>
          </div>
        )}

        {/* ── Connexions système ── */}
        <div className="bg-surface-50 rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 mb-4">🔌 Connexions système</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Base de données Neon PostgreSQL</p>
                <p className="text-xs text-slate-400">Cloud — Production</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-surface-50 border border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Bureau d'étude #1 (192.168.0.189:30000)</p>
                <p className="text-xs text-slate-400">Synchronisation directe — Réseau local</p>
              </div>
              <span className="text-xs text-slate-400">⚠️ Hors ligne</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
