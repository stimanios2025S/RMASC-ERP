// ─── RMASC FACTORY — Local Storage Layer ──────────────────────────────
// SESSION persistence for login across refresh.
// LOCAL API fallback for offline/demo mode (fully self-contained).
// In production mode with MongoDB backend, all data goes through the API.
// localStorage is only used for session persistence + token.
//
// IMPORTANT: Vault files, orders, stock items, suppliers are ALL stored
// in MongoDB, NOT localStorage. This ensures cross-device sync.
// For offline fallback, we only keep user credentials (read-only).

const SEED_KEY = 'rmasc_local_seeded_v6'
const SESSION_KEY = 'rmasc_portal_session'

interface LocalUser {
  id: string; loginId: string; password: string; name: string; role: string
}

function getUsers(): LocalUser[] {
  try { return JSON.parse(localStorage.getItem('rmasc_local_users') || '[]') } catch { return [] }
}

function isSeedValid(): boolean {
  // v6 : la présence de la clé = déjà purgé (aucun compte local à re-seeder)
  return !!localStorage.getItem(SEED_KEY)
}

function seedOnce() {
  if (isSeedValid()) return
  localStorage.removeItem(SEED_KEY)

  // 🔐 SÉCURITÉ (v2.8.0) : AUCUN identifiant / mot de passe dans le bundle client.
  // L'authentification passe UNIQUEMENT par le backend (MongoDB, hachage bcrypt).
  // Ce seed vide PURGE aussi les anciens identifiants en clair déjà stockés sur
  // les appareils (v5) — plus aucune trace de mot de passe côté navigateur.
  const users: LocalUser[] = []
  localStorage.setItem('rmasc_local_users', JSON.stringify(users))

  // Clean up any stale test data that prevents cross-device sync
  localStorage.removeItem('rmasc_local_orders')
  localStorage.removeItem('rmasc_local_items')
  localStorage.removeItem('rmasc_local_suppliers')
  localStorage.removeItem('rmasc_vault_files')
  localStorage.removeItem('rmasc_uploads_cache')
  localStorage.removeItem('rmasc_phases_cache')

  localStorage.setItem(SEED_KEY, '1')
}

// ─── Session persistence ─────────────────────────────────────────────────
export function saveSession(session: { userId: string; name: string; role: string; loggedInAt: string }): void {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
}

export function loadSession(): { userId: string; name: string; role: string; loggedInAt: string } | null {
  try { const saved = localStorage.getItem(SESSION_KEY); return saved ? JSON.parse(saved) : null } catch { return null }
}

export function clearSession(): void {
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}

// ─── Init (called once on app load) ─────────────────────────────────────────
export function initLocalData() {
  try { seedOnce() } catch {}
}

// ─── Local API (minimal localStorage fallback — AUTH only, no data) ────────
function ls(key: string) { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }

export const localApi = {
  login: (loginId: string, password: string) => {
    const users: LocalUser[] = ls('rmasc_local_users')
    const user = users.find(u => u.loginId === loginId && u.password === password)
    return user || null
  },
  getUsers: () => {
    const users: LocalUser[] = ls('rmasc_local_users')
    return users.map(({ password, ...u }) => ({ ...u, canChangePassword: u.role === 'ADMIN' }))
  },
  updateUser: (id: string, name: string) => {
    const users: LocalUser[] = ls('rmasc_local_users')
    const idx = users.findIndex(u => u.id === id)
    if (idx >= 0) { users[idx].name = name; localStorage.setItem('rmasc_local_users', JSON.stringify(users)) }
  },
  // These exist for backward compatibility but return empty arrays.
  // All real data comes from the MongoDB backend API.
  getItems: () => [],
  getSuppliers: () => [],
  getOrders: () => [],
  getVaultFiles: () => [],
  createItem: () => null,
  createSupplier: () => null,
  createOrder: () => null,
  updateOrderStatus: () => {},
  updateAdminCredentials: () => null,
  getVaultFilesByEngineer: () => [],
}
