// ─── RMASC FACTORY — Runtime Store (in-memory only) ───────────────────
// Uploaded files, notices, and production phases are stored in-memory
// for the current session. Persistence is handled by the backend API (MongoDB),
// which ensures all devices share the same state.
//
// localStorage persistence has been REMOVED to prevent stale per-device
// data from breaking cross-device sync.

type Notice = { from: string; message: string; date: string }
type UploadFile = { data: string; name: string; type: string; uploadedAt: string; label?: string }

const noticesByOrder = new Map<string, Notice[]>()
const uploadsByOrder = new Map<string, UploadFile[]>()

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
  return next
}
