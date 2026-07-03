// ─── RMASC FACTORY — Local Storage Layer ──────────────────────────────
// SESSION persistence for login across refresh.
// LOCAL API fallback for offline/demo mode (fully self-contained).
// In production mode with Neon backend, all data goes through the API.
// localStorage is only used for session + local fallback.

const SEED_KEY = 'rmasc_local_seeded_v2'
const SESSION_KEY = 'rmasc_portal_session'

interface LocalUser {
  id: string; loginId: string; password: string; name: string; role: string
}

interface LocalItem {
  id: string; reference: string; name: string; description: string
  category: string; unit: string; location: string; quantity: number
  alertThreshold: number; unitPrice: number; imageUrl: string | null
  supplierId: string | null
}

interface LocalSupplier {
  id: string; name: string; contactName: string; email: string; phone: string; address: string
}

interface LocalOrder {
  id: string; serialNumber: string; clientName: string; clientEmail: string | null
  clientPhone: string; clientCity: string; status: string
  typeMotorisation: string; largeurGaineMm: string; profondeurGaineMm: string
  hauteurGaineMm: string; createdAt: string
  lifecycleStage?: string; engineeredBy?: string
  totalCostDZD?: number; salePriceDZD?: number; marginPct?: number; completedAt?: string
}

let uid = 100
function genId(prefix: string) { return `${prefix}_${++uid}_${Date.now().toString(36)}` }

function seedOnce() {
  if (localStorage.getItem(SEED_KEY)) return
  const users: LocalUser[] = [
    { id: genId('u'), loginId: 'admin', password: 'admin123', name: 'Totok Michael', role: 'ADMIN' },
    { id: genId('u'), loginId: 'ingenieur1', password: 'ingenieur1', name: 'Karim Bensalem', role: 'INGENIEUR_1' },
    { id: genId('u'), loginId: 'ingenieur2', password: 'ingenieur2', name: 'Yasmine Hamidi', role: 'INGENIEUR_2' },
    { id: genId('u'), loginId: 'verificateur', password: 'verificateur', name: 'Rachid Imane', role: 'VERIFICATEUR' },
    { id: genId('u'), loginId: 'production', password: 'production', name: 'Said Mansouri', role: 'PRODUCTION' },
    { id: genId('u'), loginId: 'magasinier', password: 'magasinier', name: 'Ahmed Benali', role: 'MAGASINIER' },
  ]
  localStorage.setItem('rmasc_local_users', JSON.stringify(users))

  const suppliers: LocalSupplier[] = [
    { id: genId('s'), name: 'Mekisan Algerie', contactName: 'Karim', email: 'contact@mekisan.dz', phone: '+213 21 123 456', address: 'Alger' },
    { id: genId('s'), name: 'AcierPro SPA', contactName: 'Mohamed', email: 'info@acierpro.dz', phone: '+213 23 789 012', address: 'Oran' },
    { id: genId('s'), name: 'Elevatech SARL', contactName: 'Ali', email: 'contact@elevatech.dz', phone: '+213 29 345 678', address: 'Setif' },
    { id: genId('s'), name: 'Inox Distribution', contactName: 'Sofiane', email: 'commandes@inox.dz', phone: '+213 25 567 890', address: 'Constantine' },
    { id: genId('s'), name: 'Hydraulique Services', contactName: 'Redouane', email: 'info@hydrau.dz', phone: '+213 27 901 234', address: 'Blida' },
  ]
  localStorage.setItem('rmasc_local_suppliers', JSON.stringify(suppliers))

  const items = [
    { id: genId('i'), reference: 'TLE-001', name: "Tole d'acier galvanise 2mm", description: 'Plaque 2000x1000mm epaisseur 2mm', category: 'Tolerie & Metal', unit: 'Plaque', location: 'Stock 1', quantity: 45, alertThreshold: 10, unitPrice: 2800, imageUrl: null, supplierId: suppliers[0].id },
    { id: genId('i'), reference: 'TLE-002', name: 'Tole inox brosse 1.5mm', description: 'Finition brosse qualite alimentaire', category: 'Tolerie & Metal', unit: 'Plaque', location: 'Stock 1', quantity: 22, alertThreshold: 5, unitPrice: 4500, imageUrl: null, supplierId: suppliers[3].id },
    { id: genId('i'), reference: 'PRO-001', name: 'Verin hydraulique 80mm', description: 'Course 1500mm, pression max 200 bar', category: 'Hydraulique', unit: 'Unite', location: 'Stock 1', quantity: 8, alertThreshold: 3, unitPrice: 15000, imageUrl: null, supplierId: suppliers[4].id },
    { id: genId('i'), reference: 'PRO-002', name: 'Moteur traction Gearless 5kW', description: 'Moteur synchrone 5kW 32A', category: 'Composants Electriques', unit: 'Unite', location: 'Stock 1', quantity: 3, alertThreshold: 2, unitPrice: 85000, imageUrl: null, supplierId: suppliers[2].id },
    { id: genId('i'), reference: 'FIX-001', name: 'Rail de guidage T45', description: 'Profile 5m, acier lamine', category: 'Fixations & Quincaillerie', unit: 'Metre', location: 'Stock 1', quantity: 120, alertThreshold: 30, unitPrice: 650, imageUrl: null, supplierId: suppliers[1].id },
    { id: genId('i'), reference: 'FIX-002', name: 'Kit patins coulissants', description: 'Patins PTFE pour rail T45', category: 'Fixations & Quincaillerie', unit: 'Lot', location: 'Stock 1', quantity: 15, alertThreshold: 5, unitPrice: 3200, imageUrl: null, supplierId: suppliers[1].id },
    { id: genId('i'), reference: 'ELC-001', name: 'Cable electrique 4x2.5mm2', description: 'Cable cuivre multibrin 50m', category: 'Composants Electriques', unit: 'Rouleau', location: 'Stock 2', quantity: 10, alertThreshold: 3, unitPrice: 7500, imageUrl: null, supplierId: suppliers[2].id },
    { id: genId('i'), reference: 'ELC-002', name: "Bouton d'arret d'urgence", description: 'Bouton coup de poing rouge', category: 'Composants Electriques', unit: 'Unite', location: 'Stock 2', quantity: 25, alertThreshold: 8, unitPrice: 450, imageUrl: null, supplierId: suppliers[2].id },
    { id: genId('i'), reference: 'VIT-001', name: 'Verre trempe 6mm', description: 'Panneau 1200x2000mm trempe securite', category: 'Vitrerie', unit: 'Plaque', location: 'Stock 2', quantity: 6, alertThreshold: 2, unitPrice: 12000, imageUrl: null, supplierId: suppliers[0].id },
    { id: genId('i'), reference: 'BOI-001', name: 'Melamine blanc laque', description: 'Panneau 2800x2070mm ep. 18mm', category: 'Bois & Finitions', unit: 'Plaque', location: 'Stock 2', quantity: 12, alertThreshold: 4, unitPrice: 3500, imageUrl: null, supplierId: suppliers[3].id },
    { id: genId('i'), reference: 'CDT-001', name: 'Carton ondule double cannelure', description: 'Emballage 1200x800x600mm lot 10', category: 'Conditionnement', unit: 'Lot', location: 'Stock 2', quantity: 30, alertThreshold: 10, unitPrice: 850, imageUrl: null, supplierId: null },
  ]
  localStorage.setItem('rmasc_local_items', JSON.stringify(items))

  const orders: LocalOrder[] = [
    { id: genId('o'), serialNumber: 'RMASC-2026-A1B2C3', clientName: 'SARL Batimmo', clientEmail: 'contact@batimmo.dz', clientPhone: '+213 555 123 456', clientCity: 'Alger', status: 'ATTENTE_DESSIN_TECH', typeMotorisation: 'ELECTRIQUE', largeurGaineMm: '1800', profondeurGaineMm: '2000', hauteurGaineMm: '25000', lifecycleStage: 'engineering', engineeredBy: 'Karim Bensalem', createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), totalCostDZD: 321180, salePriceDZD: 543800, marginPct: 30 },
    { id: genId('o'), serialNumber: 'RMASC-2026-D4E5F6', clientName: 'ETS Hamouda', clientEmail: null, clientPhone: '+213 666 789 012', clientCity: 'Oran', status: 'ATTENTE_VERIFICATION', typeMotorisation: 'HYDRAULIQUE', largeurGaineMm: '1600', profondeurGaineMm: '1800', hauteurGaineMm: '15000', lifecycleStage: 'engineering', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), totalCostDZD: 281180, salePriceDZD: 476700, marginPct: 30 },
    { id: genId('o'), serialNumber: 'RMASC-2026-G7H8I9', clientName: 'Residence El Manar', clientEmail: 'gestion@elmanar.dz', clientPhone: '+213 777 345 678', clientCity: 'Setif', status: 'ATTENTE_APPROBATION_ADMIN', typeMotorisation: 'ELECTRIQUE', largeurGaineMm: '2000', profondeurGaineMm: '2200', hauteurGaineMm: '32000', lifecycleStage: 'invoicing', createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), totalCostDZD: 421180, salePriceDZD: 713800, marginPct: 30 },
    { id: genId('o'), serialNumber: 'RMASC-2026-J0K1L2', clientName: 'Clinique Ibn Sina', clientEmail: 'tech@ibnsina.dz', clientPhone: '+213 888 901 234', clientCity: 'Constantine', status: 'PRET_POUR_PRODUCTION', typeMotorisation: 'ELECTRIQUE', largeurGaineMm: '1400', profondeurGaineMm: '1600', hauteurGaineMm: '18000', lifecycleStage: 'production', createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), totalCostDZD: 297180, salePriceDZD: 512700, marginPct: 30 },
    { id: genId('o'), serialNumber: 'RMASC-2026-M3N4O5', clientName: 'Ecole Polytechnique', clientEmail: 'direction@polytech.dz', clientPhone: '+213 999 567 890', clientCity: 'Blida', status: 'VALIDEE', typeMotorisation: 'ELECTRIQUE', largeurGaineMm: '1500', profondeurGaineMm: '1700', hauteurGaineMm: '12000', lifecycleStage: 'delivered', engineeredBy: 'Yasmine Hamidi', createdAt: new Date(Date.now() - 86400000 * 15).toISOString(), completedAt: new Date(Date.now() - 86400000 * 2).toISOString(), totalCostDZD: 278400, salePriceDZD: 542300, marginPct: 35 },
  ]
  localStorage.setItem('rmasc_local_orders', JSON.stringify(orders))

  const vaultFiles = [
    { id: genId('f'), orderId: orders[0]?.id || '', fileName: 'Plan_Installation_Batimmo.pdf', engineer: 'Karim Bensalem', uploadedAt: new Date(Date.now() - 86400000 * 4).toISOString(), size: '2.4 MB', type: 'application/pdf' },
    { id: genId('f'), orderId: orders[0]?.id || '', fileName: 'Coupe_Technique_Gaine.dwg', engineer: 'Karim Bensalem', uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(), size: '4.1 MB', type: 'application/dwg' },
    { id: genId('f'), orderId: orders[1]?.id || '', fileName: 'Schema_Hydraulique_Hamouda.pdf', engineer: 'Karim Bensalem', uploadedAt: new Date(Date.now() - 86400000 * 1).toISOString(), size: '1.8 MB', type: 'application/pdf' },
    { id: genId('f'), orderId: orders[4]?.id || '', fileName: 'Fiche_Technique_Polytech.pdf', engineer: 'Yasmine Hamidi', uploadedAt: new Date(Date.now() - 86400000 * 12).toISOString(), size: '3.2 MB', type: 'application/pdf' },
    { id: genId('f'), orderId: orders[4]?.id || '', fileName: 'Plan_Cabine_2D.dwg', engineer: 'Yasmine Hamidi', uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(), size: '5.7 MB', type: 'application/dwg' },
  ].filter(f => f.orderId)
  localStorage.setItem('rmasc_vault_files', JSON.stringify(vaultFiles))

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

// ─── Local API (localStorage fallback when backend is offline) ──────────────
function ls(key: string) { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }

export const localApi = {
  getItems: () => ls('rmasc_local_items'),
  getItem: (id: string) => ls('rmasc_local_items').find((i: any) => i.id === id) || null,
  createItem: (data: any) => { const items = ls('rmasc_local_items'); const item = { ...data, id: genId('i') }; items.push(item); localStorage.setItem('rmasc_local_items', JSON.stringify(items)); return item },
  getSuppliers: () => ls('rmasc_local_suppliers'),
  createSupplier: (data: any) => { const s = ls('rmasc_local_suppliers'); const sup = { ...data, id: genId('s') }; s.push(sup); localStorage.setItem('rmasc_local_suppliers', JSON.stringify(s)); return sup },
  getOrders: () => ls('rmasc_local_orders'),
  createOrder: (data: any) => { const o = ls('rmasc_local_orders'); const order = { ...data, id: genId('o'), createdAt: new Date().toISOString(), status: 'ATTENTE_DESSIN_TECH', lifecycleStage: 'engineering' }; o.push(order); localStorage.setItem('rmasc_local_orders', JSON.stringify(o)); return order },
  updateOrderStatus: (id: string, status: string) => { const o = ls('rmasc_local_orders'); const idx = o.findIndex((x: any) => x.id === id); if (idx >= 0) { o[idx].status = status; localStorage.setItem('rmasc_local_orders', JSON.stringify(o)) } },
  login: (loginId: string, password: string) => { const users: LocalUser[] = ls('rmasc_local_users'); const user = users.find(u => u.loginId === loginId && u.password === password); return user || null },
  getUsers: () => { const users: LocalUser[] = ls('rmasc_local_users'); return users.map(({ password, ...u }) => u) },
  updateUser: (id: string, name: string) => { const users: LocalUser[] = ls('rmasc_local_users'); const idx = users.findIndex(u => u.id === id); if (idx >= 0) { users[idx].name = name; localStorage.setItem('rmasc_local_users', JSON.stringify(users)) } },
  updateAdminCredentials: (loginId: string, newPassword: string, newId: string) => { const users: LocalUser[] = ls('rmasc_local_users'); const admin = users.find(u => u.role === 'ADMIN'); if (admin) { admin.loginId = newId; admin.password = newPassword; localStorage.setItem('rmasc_local_users', JSON.stringify(users)) } },
  getVaultFiles: () => ls('rmasc_vault_files'),
  getVaultFilesByEngineer: (engineerName: string) => ls('rmasc_vault_files').filter((f: any) => f.engineer === engineerName),
}
