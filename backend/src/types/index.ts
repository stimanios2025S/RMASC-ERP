// ─── Shared types for RMASC Backend ────────────────────────────────────────

export type EngineeringType = 'DESSIN_TECH_1' | 'DESSIN_TECH_2' | 'MODEL_2D' | 'MODEL_3D'
export type CADStatus = 'EN_ATTENTE' | 'APPROUVE' | 'REJETE'
export type OrderStatus = 'BROUILLON' | 'EN_ATTENTE' | 'VALIDEE' | 'ANNULEE'

// ─── JWT payload ───────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string
  role: 'ADMIN' | 'INGENIEUR'
  iat?: number
  exp?: number
}

// ─── Rejection log entry ───────────────────────────────────────────────────
export interface RejectionLogEntry {
  date: string   // ISO 8601
  reason: string
  adminId: string
}

// ─── Mock CAD file metadata ────────────────────────────────────────────────
export interface CadFileMeta {
  fileHash: string
  fileMimeType: string
  fileSizeBytes: number
  storageKey: string
  fileName: string
}

// ─── Approval token payload (the red stamp) ────────────────────────────────
export interface ApprovalTokenPayload {
  cadId: string
  orderId: string
  engineeringType: EngineeringType
  approvedAt: string   // ISO 8601
  approvedBy: string
  signature: string    // HMAC-SHA256 of the above fields
}
