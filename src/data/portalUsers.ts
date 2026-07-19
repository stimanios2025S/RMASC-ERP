// ─── RMASC FACTORY — Portal User Accounts ───────────────────────────────
// Normal : authentification via le backend API.
// Hors-ligne : fallback vers les comptes localStorage quand le backend est down.

import { api } from '../config/api'
import { saveSession, loadSession, clearSession, initLocalData, localApi } from './localStore'

export interface PortalUser { id: string; loginId: string; name: string; role: string; canChangePassword: boolean }
export interface PortalSession { userId: string; name: string; role: string; loggedInAt: string }

// Hydrate session from localStorage (preserves login across refresh)
let currentSession: PortalSession | null = loadSession()

export async function initPortalUsers(): Promise<void> {
  // Init le localStorage (seed des utilisateurs locaux)
  initLocalData()
  // Tentative de seed du backend (silencieux si hors-ligne)
  try { await api.post('/users/seed', {}) } catch {}
}

export async function login(loginId: string, password: string): Promise<PortalSession | null> {
  // 1. D'abord essayer localStorage (instantané, pas de backend nécessaire)
  const localUser = localApi.login(loginId, password)
  if (localUser) {
    currentSession = {
      userId: localUser.loginId,
      name: localUser.name,
      role: localUser.role,
      loggedInAt: new Date().toISOString(),
    }
    saveSession(currentSession)
    // 2. En arrière-plan, essayer l'API backend pour avoir un token JWT
    api.post('/users/login', { loginId, password }).then((user: any) => {
      if (user?.token) {
        try { localStorage.setItem('rmasc_token', user.token) } catch {}
      }
    }).catch(() => {})
    return currentSession
  }

  // 3. Fallback : essayer l'API backend (peut prendre du temps si hors-ligne)
  try {
    const user: any = await api.post('/users/login', { loginId, password })
    currentSession = { userId: user.userId, name: user.name, role: user.role, loggedInAt: user.loggedInAt }
    saveSession(currentSession)
    if (user.token) {
      try { localStorage.setItem('rmasc_token', user.token) } catch {}
    }
    return currentSession
  } catch {
    return null
  }
}

export function logout(): void {
  currentSession = null
  clearSession()
  try { localStorage.removeItem('rmasc_token') } catch {}
}

export function getSession(): PortalSession | null { return currentSession }

export async function fetchAllUsers(): Promise<PortalUser[]> {
  try { return await api.get('/users') } catch { return localApi.getUsers() }
}

export async function updateUserDisplayName(userId: string, newName: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api.patch(`/users/${userId}/name`, { name: newName })
    const allUsers: any[] = await api.get('/users')
    const updated = allUsers.find(u => u.id === userId)
    if (updated && currentSession && currentSession.userId === updated.loginId) {
      currentSession = { ...currentSession, name: updated.name }
      saveSession(currentSession)
    }
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function changeAdminCredentials(currentLoginId: string, currentPassword: string, newLoginId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api.put('/users/admin', { currentLoginId, currentPassword, newLoginId, newPassword })
    if (currentSession) currentSession = { ...currentSession, userId: newLoginId }
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function changeUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api.patch(`/users/${userId}/password`, { newPassword })
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}
