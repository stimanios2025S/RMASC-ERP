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
  // Tentative de seed du backend (silencieux si hors-ligne, non bloquant)
  api.post('/users/seed', {}).catch(() => {})
}

export async function login(loginId: string, password: string): Promise<PortalSession | null> {
  // 1. Toujours essayer l'API backend d'abord pour obtenir un vrai JWT token.
  //    Le token est nécessaire pour les requêtes authentifiées (uploads, fichiers, etc.)
  const localUser = localApi.login(loginId, password)

  // 2. API call — WAIT for it to get the JWT token
  try {
    const user: any = await api.post('/users/login', { loginId, password })
    if (user?.token) {
      localStorage.setItem('rmasc_token', user.token)
    }
    currentSession = { userId: user.userId, name: user.name, role: user.role, loggedInAt: user.loggedInAt }
    saveSession(currentSession)
    return currentSession
  } catch {
    // API unreachable — fall back to localStorage auth (no JWT token)
    // File uploads and PDF viewing will NOT work in this mode
    if (localUser) {
      currentSession = {
        userId: localUser.loginId,
        name: localUser.name,
        role: localUser.role,
        loggedInAt: new Date().toISOString(),
      }
      saveSession(currentSession)
      return currentSession
    }
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
