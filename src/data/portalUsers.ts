// ─── Portal User Accounts ─────────────────────────────────────────────────
// Connects to Neon via the backend API. No localStorage fallback.
import { api } from '../config/api'
import { saveSession, loadSession, clearSession } from './localStore'

export interface PortalUser { id: string; loginId: string; name: string; role: string; canChangePassword: boolean }
export interface PortalSession { userId: string; name: string; role: string; loggedInAt: string }

// Hydrate session from localStorage (preserves login across refresh)
let currentSession: PortalSession | null = loadSession()

export async function initPortalUsers(): Promise<void> {
  try { await api.post('/users/seed', {}) } catch {}
}

export async function login(loginId: string, password: string): Promise<PortalSession | null> {
  try {
    const user: any = await api.post('/users/login', { loginId, password })
    currentSession = { userId: user.userId, name: user.name, role: user.role, loggedInAt: user.loggedInAt }
    saveSession(currentSession)
    // Save JWT token for authenticated API calls
    if (user.token) {
      try { localStorage.setItem('rmasc_token', user.token) } catch {}
    }
    return currentSession
  } catch { return null }
}

export function logout(): void {
  currentSession = null
  clearSession()
  try { localStorage.removeItem('rmasc_token') } catch {}
}
export function getSession(): PortalSession | null { return currentSession }

export async function fetchAllUsers(): Promise<PortalUser[]> {
  try { return await api.get('/users') } catch { return [] }
}

export async function updateUserDisplayName(userId: string, newName: string): Promise<{ success: boolean; error?: string }> {
  try {
    await api.patch(`/users/${userId}/name`, { name: newName })
    const allUsers: any[] = await api.get('/users')
    const updated = allUsers.find(u => u.id === userId)
    if (updated && currentSession && currentSession.userId === updated.loginId) {
      currentSession = { ...currentSession, name: updated.name }
      saveSession(currentSession) // Persist to localStorage
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
