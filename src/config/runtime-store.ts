// ─── RMASC FACTORY — Runtime Store (volatile + localStorage hybrid) ──────
// UPLOADED FILES are persisted to localStorage so they survive page refresh.
// Production phase is also persisted to localStorage.
// The in-memory Map serves as a hot cache for current session.

type Notice = { from: string; message: string; date: string }
type UploadFile = { data: string; name: string; type: string; uploadedAt: string; label?: string }

const noticesByOrder = new Map<string, Notice[]>()
const uploadsByOrder = new Map<string, UploadFile[]>()
const productionPhaseByOrder = new Map<string, string>()

// ─── Hydrate Maps from localStorage on module load ─────────────────────
try {
  const savedUploads = JSON.parse(localStorage.getItem('rmasc_uploads_cache') || '{}')
  for (const [key, val] of Object.entries(savedUploads)) {
    uploadsByOrder.set(key, val as UploadFile[])
  }
  const savedPhases = JSON.parse(localStorage.getItem('rmasc_phases_cache') || '{}')
  for (const [key, val] of Object.entries(savedPhases)) {
    productionPhaseByOrder.set(key, val as string)
  }
} catch {}

// ─── Persist helpers ───────────────────────────────────────────────────
function persistUploads() {
  try {
    const obj: Record<string, UploadFile[]> = {}
    for (const [key, val] of uploadsByOrder) { obj[key] = val }
    localStorage.setItem('rmasc_uploads_cache', JSON.stringify(obj))
  } catch { /* localStorage may be full */ }
}

function persistPhases() {
  try {
    const obj: Record<string, string> = {}
    for (const [key, val] of productionPhaseByOrder) { obj[key] = val }
    localStorage.setItem('rmasc_phases_cache', JSON.stringify(obj))
  } catch {}
}

export function getNotices(orderId: string): Notice[] {
  return noticesByOrder.get(orderId) || []
}

export function addNotice(orderId: string, from: string, message: string): Notice[] {
  const next = [...getNotices(orderId), { from, message, date: new Date().toISOString() }]
  noticesByOrder.set(orderId, next)
  return next
}

export function getUploads(orderId: string): UploadFile[] {
  return uploadsByOrder.get(orderId) || []
}

export function addUpload(orderId: string, file: UploadFile): UploadFile[] {
  const next = [...getUploads(orderId), file]
  uploadsByOrder.set(orderId, next)
  persistUploads() // persist immediately
  return next
}

export function getProductionPhase(orderId: string): string {
  return productionPhaseByOrder.get(orderId) || 'decoupe'
}

export function setProductionPhase(orderId: string, phase: string): void {
  productionPhaseByOrder.set(orderId, phase)
  persistPhases() // persist immediately
}
