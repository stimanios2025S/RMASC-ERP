// ─── Bureau d'étude — Zod validation schemas ───────────────────────────────
import { z } from 'zod'

// ─── Submit CAD (webhook from engineering platform) ────────────────────────
export const submitCadSchema = z.object({
  orderId: z.string().uuid('L\'identifiant de commande est invalide.'),

  engineeringType: z.enum(['DESSIN_TECH_1', 'DESSIN_TECH_2', 'MODEL_2D', 'MODEL_3D'], {
    errorMap: () => ({ message: 'Type d\'ingénierie invalide.' }),
  }),

  engineerName: z.string().min(1, 'Le nom de l\'ingénieur est obligatoire.').max(200),

  // File metadata
  fileHash: z.string().min(1, 'Le hash du fichier est obligatoire.').max(128),
  fileMimeType: z.string().min(1, 'Le type MIME est obligatoire.').max(100),
  fileSizeBytes: z.number().int().positive('La taille du fichier doit être positive.'),
  storageKey: z.string().min(1, 'La clé de stockage est obligatoire.').max(200),
  fileName: z.string().optional(),
})

export type SubmitCadInput = z.infer<typeof submitCadSchema>

// ─── Approve CAD ───────────────────────────────────────────────────────────
export const approveCadSchema = z.object({
  adminId: z.string().min(1, 'L\'identifiant administrateur est obligatoire.'),
})

export type ApproveCadInput = z.infer<typeof approveCadSchema>

// ─── Reject CAD ────────────────────────────────────────────────────────────
export const rejectCadSchema = z.object({
  motifRejet: z.string().min(1, 'Le motif du rejet est obligatoire.').max(2000),
  adminId: z.string().min(1, 'L\'identifiant administrateur est obligatoire.'),
})

export type RejectCadInput = z.infer<typeof rejectCadSchema>
