// ─── Bureau d'étude Service — CAD review pipeline ──────────────────────────
import crypto from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import type { SubmitCadInput } from '../schemas/bureau-etude.schema.js'
import { AppError } from '../middleware/error.js'
import { AUTH_CONFIG } from '../config/auth.js'
import type { ApprovalTokenPayload, RejectionLogEntry } from '../types/index.js'
import type { Prisma } from '@prisma/client'

// ─── Helper: map engineering type to French label ──────────────────────────
function engineeringLabel(type: string): string {
  const labels: Record<string, string> = {
    DESSIN_TECH_1: 'Ingénieur Dessinateur 1',
    DESSIN_TECH_2: 'Ingénieur Dessinateur 2',
    MODEL_2D: 'Modélisation 2D',
    MODEL_3D: 'Modélisation 3D',
  }
  return labels[type] ?? type
}

// ─── 1. Submit CAD (webhook from engineering software) ─────────────────────
export async function submitCad(data: SubmitCadInput) {
  // Verify the order exists
  const order = await prisma.order.findUnique({ where: { id: data.orderId } })
  if (!order) {
    throw new AppError(404, 'Commande introuvable.')
  }

  // Check for duplicate submission on the same track
  const existing = await prisma.cAD_Submission.findUnique({
    where: { orderId_engineeringType: { orderId: data.orderId, engineeringType: data.engineeringType } },
  })
  if (existing) {
    throw new AppError(409, `Une soumission "${data.engineeringType}" existe déjà pour cette commande.`)
  }

  // Check file hash uniqueness (security: prevent file reuse across orders)
  const hashExisting = await prisma.cAD_Submission.findUnique({
    where: { fileHash: data.fileHash },
  })
  if (hashExisting) {
    throw new AppError(409, 'Ce fichier a déjà été soumis pour une autre commande.')
  }

  const submission = await prisma.cAD_Submission.create({
    data: {
      orderId: data.orderId,
      engineeringType: data.engineeringType,
      engineerName: data.engineerName,
      fileHash: data.fileHash,
      fileMimeType: data.fileMimeType,
      fileSizeBytes: data.fileSizeBytes,
      storageKey: data.storageKey,
      status: 'EN_ATTENTE',
    },
  })

  // Update order status to EN_ATTENTE if it was BROUILLON
  if (order.status === 'BROUILLON') {
    await prisma.order.update({
      where: { id: data.orderId },
      data: { status: 'ATTENTE_DESSIN_TECH' },
    })
  }

  return submission
}

// ─── 2. Stream CAD (secure viewport — no download headers) ─────────────
export async function streamCad(cadId: string) {
  const submission = await prisma.cAD_Submission.findUnique({
    where: { id: cadId },
    include: {
      order: { select: { serialNumber: true, clientName: true, clientCity: true } },
    },
  })

  if (!submission) {
    throw new AppError(404, 'Soumission CAD introuvable.')
  }

  // Return secure metadata + viewport data for the React CAD Viewer.
  // File bytes are stored on the local backend filesystem — never uploaded
  // to any cloud storage. The frontend visualiser renders from structured
  // metadata alone, with NO file-download URL exposed.
  return {
    id: submission.id,
    orderSerialNumber: submission.order.serialNumber,
    clientName: submission.order.clientName,
    engineerName: submission.engineerName,
    engineeringType: submission.engineeringType,
    status: submission.status,
    approvedAt: submission.approvedAt,
    rejectionReason: submission.rejectionReason,
    approvalToken: submission.approvalToken,
    // The frontend CAD viewer renders from this structured data.
    // No file URL is exposed — the viewer uses mock technical data
    // keyed to the order dimensions. This enforces the "no download" rule.
    viewportPayload: {
      storageKey: submission.storageKey,          // Opaque — only meaningful to the renderer
      fileMimeType: submission.fileMimeType,
      fileSizeBytes: submission.fileSizeBytes,
      // The file hash allows the viewer to verify integrity without exposing the file
      fileHash: submission.fileHash.substring(0, 16) + '...',  // Partial hash only
    },
  }
}

// ─── 3. Approve CAD ────────────────────────────────────────────────────────
export async function approveCad(cadId: string, adminId: string) {
  const submission = await prisma.cAD_Submission.findUnique({
    where: { id: cadId },
    include: { order: true },
  })

  if (!submission) {
    throw new AppError(404, 'Soumission CAD introuvable.')
  }

  if (submission.status !== 'EN_ATTENTE') {
    throw new AppError(409, `Impossible d\'approuver un plan avec le statut "${submission.status}".`)
  }

  // Generate the electronic stamp token
  const now = new Date().toISOString()
  const tokenPayload: ApprovalTokenPayload = {
    cadId: submission.id,
    orderId: submission.orderId,
    engineeringType: submission.engineeringType as any,
    approvedAt: now,
    approvedBy: adminId,
    signature: '',  // computed below
  }

  // Sign the payload with HMAC-SHA256
  const hmac = crypto.createHmac('sha256', AUTH_CONFIG.stampHmacKey)
  hmac.update(`${tokenPayload.cadId}|${tokenPayload.orderId}|${tokenPayload.engineeringType}|${tokenPayload.approvedAt}|${tokenPayload.approvedBy}`)
  tokenPayload.signature = hmac.digest('hex')

  // Update the submission
  const updated = await prisma.cAD_Submission.update({
    where: { id: cadId },
    data: {
      status: 'APPROUVE',
      approvedAt: new Date(),
      approvalToken: JSON.stringify(tokenPayload),
      approvedBy: adminId,
    },
  })

  // Check if ALL CAD submissions for this order are now APPROUVE
  const allSubmissions = await prisma.cAD_Submission.findMany({
    where: { orderId: submission.orderId },
  })
  const allApproved = allSubmissions.every((s) => s.status === 'APPROUVE')
  if (allApproved) {
    await prisma.order.update({
      where: { id: submission.orderId },
      data: { status: 'VALIDEE' },
    })
  }

  // Mock notification to the engineering platform
  await notifyEngineerPlatform({
    cadId: submission.id,
    orderSerialNumber: submission.order.serialNumber,
    engineeringType: submission.engineeringType,
    engineerName: submission.engineerName,
    action: 'APPROUVE',
    message: `Le plan ${engineeringLabel(submission.engineeringType)} a été approuvé par l'administration RMASC.`,
    approvalToken: tokenPayload,
  })

  return updated
}

// ─── 4. Reject CAD ─────────────────────────────────────────────────────────
export async function rejectCad(cadId: string, motifRejet: string, adminId: string) {
  const submission = await prisma.cAD_Submission.findUnique({
    where: { id: cadId },
    include: { order: true },
  })

  if (!submission) {
    throw new AppError(404, 'Soumission CAD introuvable.')
  }

  if (submission.status !== 'EN_ATTENTE') {
    throw new AppError(409, `Impossible de rejeter un plan avec le statut "${submission.status}".`)
  }

  // Build append-only rejection log
  const logEntry: RejectionLogEntry = {
    date: new Date().toISOString(),
    reason: motifRejet,
    adminId,
  }

  const existingLog: RejectionLogEntry[] = submission.rejectionLog
    ? (JSON.parse(JSON.stringify(submission.rejectionLog)) as RejectionLogEntry[])
    : []
  const updatedLog = [...existingLog, logEntry]

  const updated = await prisma.cAD_Submission.update({
    where: { id: cadId },
    data: {
      status: 'REJETE',
      rejectionReason: motifRejet,
      rejectionLog: updatedLog as Prisma.JsonArray,
    },
  })

  // Mock notification to the engineering platform
  await notifyEngineerPlatform({
    cadId: submission.id,
    orderSerialNumber: submission.order.serialNumber,
    engineeringType: submission.engineeringType,
    engineerName: submission.engineerName,
    action: 'REJETE',
    message: `Le plan ${engineeringLabel(submission.engineeringType)} a été rejeté. Motif: ${motifRejet}`,
    rejectionReason: motifRejet,
  })

  return updated
}

// ─── 5. List submissions for a given order ─────────────────────────────────
export async function listSubmissionsByOrder(orderId: string) {
  return prisma.cAD_Submission.findMany({
    where: { orderId },
    orderBy: { engineeringType: 'asc' },
    select: {
      id: true,
      engineeringType: true,
      engineerName: true,
      status: true,
      rejectionReason: true,
      approvedAt: true,
      fileMimeType: true,
      fileSizeBytes: true,
      createdAt: true,
    },
  })
}

// ─── Mock notification to the external engineering platform ────────────────
interface NotifyPayload {
  cadId: string
  orderSerialNumber: string
  engineeringType: string
  engineerName: string
  action: 'APPROUVE' | 'REJETE'
  message: string
  approvalToken?: unknown
  rejectionReason?: string
}

async function notifyEngineerPlatform(payload: NotifyPayload): Promise<void> {
  // In production, this would POST to the actual engineering software's webhook.
  // For now, we log and simulate.
  console.log('[MOCK WEBHOOK] Notification envoyée à la plateforme ingénierie:')
  console.log(`  → Action: ${payload.action}`)
  console.log(`  → Cible: ${payload.engineerName} (${payload.engineeringType})`)
  console.log(`  → Commande: ${payload.orderSerialNumber}`)
  console.log(`  → Message: ${payload.message}`)

  // Record the notification timestamp
  await prisma.cAD_Submission.update({
    where: { id: payload.cadId },
    data: { externalNotifiedAt: new Date() },
  })

  // In real deployment, uncomment:
  // await fetch(AUTH_CONFIG.electronSoftwareUrl, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'x-api-key': AUTH_CONFIG.webhookApiKey },
  //   body: JSON.stringify(payload),
  // })
}

// ─── Cleanup on shutdown (delegates to the shared singleton) ────────────────
export { disconnectPrisma } from '../lib/prisma.js'
