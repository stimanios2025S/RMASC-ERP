// ─── Create-and-Sync Controller ─────────────────────────────────────────────
// Orchestrates: validate → save order → generate PDF → sync to Electron app.
//
// ARCHITECTURE: Direct point-to-point pipeline.
//   - PDF is compiled on the backend filesystem, then read into a base64
//     buffer and transmitted directly inside the sync JSON payload.
//   - NO cloud uploads. NO external hosting. NO public temporary URLs.
//   - The Electron app at 192.168.0.189:30000 receives the complete document
//     in its own memory space via a single HTTP POST.
//
// ERROR BOUNDARY DESIGN:
//   - DB persistence is the ONLY hard failure point. If it throws, the
//     error propagates (frontend sees the real error message).
//   - PDF generation and Electron sync are non-critical side-effects.
//     Failures are logged as `console.warn` with full context; the
//     frontend ALWAYS receives HTTP 201 on successful DB commit.
//   - Empty strings in optional fields are normalised to NULL inside the
//     orders service BEFORE they reach Prisma.

import { Request, Response, NextFunction } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Prisma } from '@prisma/client'
import { createOrderSchema, validateOrderPayload } from '../schemas/orders.schema.js'
import * as ordersService from '../services/orders.service.js'
import { generateFicheTechnique } from '../services/pdf.service.js'
import { buildSyncPayload, syncToExternalSoftware } from '../services/sync.service.js'
import type { PdfOrderData } from '../services/pdf.service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || '4000', 10)

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a local URL for the Admin's frontend to view the PDF in-browser.
 * This URL is ONLY served to the RMASC Admin UI running on the same machine
 * — it is NEVER transmitted to the external Electron app.
 */
function buildLocalAdminPdfUrl(req: Request, relativePath: string): string {
  const host = req.get('host') || `localhost:${PORT}`
  const protocol = req.protocol || 'http'
  return `${protocol}://${host}${relativePath}`
}

/** Read the compiled PDF from disk into a base64-encoded string. */
function readPdfBase64(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[PDF BASE64] Fichier introuvable: ${filePath}`)
      return null
    }
    const buffer = fs.readFileSync(filePath)
    return buffer.toString('base64')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.warn(`[PDF BASE64] Impossible de lire le fichier PDF: ${msg}`)
    return null
  }
}

// ─── Controller ─────────────────────────────────────────────────────────────

// POST /api/orders/create-and-sync
export async function createAndSync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // ── STEP 1 — Zod schema validation ────────────────────────────────────
    const parsed = createOrderSchema.parse(req.body)

    // Capture extendedSpecs BEFORE Zod strips unknown fields.
    // This envelope carries project_name, capacite_kg, structure_type,
    // cabine dimensions — fields outside the core Prisma schema that the
    // Electron app at 192.168.0.189:30000 uses for its verification.
    const extendedSpecs: Record<string, unknown> | undefined = req.body?.extendedSpecs

    // ── STEP 2 — Conditional business rules ───────────────────────────────
    validateOrderPayload(parsed)

    // ── STEP 3 — Persist to Neon PostgreSQL ───────────────────────────────
    // THIS IS THE ONLY CRITICAL STEP. Empty-string-to-null sanitization
    // happens inside ordersService.createOrder() before Prisma sees the data.
    console.log('[DB] ═══ Transaction PostgreSQL (Neon) ═══')
    console.log(`[DB]   Série: ${parsed.serialNumber}`)
    console.log(`[DB]   Client: ${parsed.clientName}`)
    console.log(`[DB]   Motorisation: ${parsed.typeMotorisation}`)

    // CRITICAL: Use a dedicated try/catch around ONLY the Prisma call so
    // we can log the full error object to the terminal. The outer catch
    // only sees `next(err)` which gets serialized by Express — we lose the
    // stack trace and Prisma metadata.
    let order
    try {
      order = await ordersService.createOrder(parsed)
    } catch (dbErr) {
      // ── FORENSIC LOG: Print the COMPLETE error to the terminal ────────
      console.error('')
      console.error('╔═══════════════════════════════════════════════════════════════')
      console.error('║  ❌  PRISMA / DATABASE ERROR — ORDER INSERTION FAILED')
      console.error('╠═══════════════════════════════════════════════════════════════')
      console.error(`║  Serial : ${parsed.serialNumber}`)
      console.error(`║  Client : ${parsed.clientName}`)
      console.error(`║  Email  : ${parsed.clientEmail}`)
      console.error(`║  Phone  : ${parsed.clientPhone}`)
      console.error(`║  Ville  : ${parsed.clientCity}`)
      console.error(`║  Motor  : ${parsed.typeMotorisation}`)
      console.error(`║  Sous   : ${parsed.sousTypeElectrique}`)
      console.error(`║  Vitesse: ${parsed.vitesseMs}`)
      console.error(`║  Étages : ${parsed.nombreEtages}`)
      console.error(`║  L gaine: ${parsed.largeurGaineMm}`)
      console.error(`║  P gaine: ${parsed.profondeurGaineMm}`)
      console.error(`║  H gaine: ${parsed.hauteurGaineMm}`)
      console.error('╠───────────────────────────────────────────────────────────────')

      if (dbErr instanceof Prisma.PrismaClientKnownRequestError) {
        // Prisma-specific error with code (e.g., P2002 for unique constraint)
        console.error(`║  📦 Prisma Error Code  : ${dbErr.code}`)
        console.error(`║  📦 Prisma Meta        : ${JSON.stringify(dbErr.meta, null, 2)}`)
        console.error(`║  📦 Prisma Message     : ${dbErr.message}`)
      } else if (dbErr instanceof Prisma.PrismaClientInitializationError) {
        console.error(`║  🔌 Prisma Init Error  : ${dbErr.message}`)
        console.error(`║  🔌 Erreur de connexion à la base de données.`)
        console.error(`║  🔌 Vérifier DATABASE_URL dans .env`)
      } else if (dbErr instanceof Prisma.PrismaClientValidationError) {
        console.error(`║  ⚠️  Prisma Validation  : ${dbErr.message}`)
      } else if (dbErr instanceof Error) {
        console.error(`║  ⚠️  Erreur             : ${dbErr.message}`)
        console.error(`║  📋 Stack              : ${dbErr.stack}`)
      } else {
        console.error(`║  ⚠️  Erreur inconnue    : ${String(dbErr)}`)
      }
      console.error('╚═══════════════════════════════════════════════════════════════')
      console.error('')

      // Re-throw so the outer catch sends the proper HTTP response
      throw dbErr
    }

    console.log(`[DB]   ✅ COMMIT — ${order.serialNumber} (id: ${order.id})`)
    console.log('[DB] ════════════════════════════════════')

    // ── STEP 3b — Advance to ATTENTE_DESSIN_TECH (PLM entry point) ─────────
    // After creation, the order enters the PLM pipeline immediately.
    // Ingénieur 1 can now start the Plan d'Installation.
    try {
      const { prisma } = await import('../lib/prisma.js')
      const advanced = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'ATTENTE_DESSIN_TECH' },
      })
      order.status = advanced.status
      console.log(`[DB]   Avancé → ATTENTE_DESSIN_TECH`)
    } catch (advErr) {
      const msg = advErr instanceof Error ? advErr.message : 'Erreur inconnue'
      console.warn(`[DB]   ⚠️  Échec avancement statut: ${msg}`)
      // Non-blocking — the order still exists at BROUILLON
    }

    // ── STEP 4 — Build PDF data transfer object ───────────────────────────
    const pdfData: PdfOrderData = {
      serialNumber: order.serialNumber,
      clientName: order.clientName,
      clientEmail: order.clientEmail,
      clientPhone: order.clientPhone,
      clientCity: order.clientCity,
      typeMotorisation: order.typeMotorisation,
      sousTypeElectrique: order.sousTypeElectrique,
      vitesseMs: order.vitesseMs,
      nombreEtages: order.nombreEtages,
      largeurGaineMm: order.largeurGaineMm,
      profondeurGaineMm: order.profondeurGaineMm,
      hauteurGaineMm: order.hauteurGaineMm,
      materiauCabine: order.materiauCabine,
      materiauPortes: order.materiauPortes,
      materiauParois: order.materiauParois,
      materiauSol: order.materiauSol,
      // ── Mekisan catalog fields (use type-safe nullish coalescing)
      typeCabine: order.typeCabine ?? null,
      typePorte: order.typePorte ?? null,
      finitionPorteCabine: order.finitionPorteCabine ?? null,
      typeChassisArcade: order.typeChassisArcade ?? null,
      finitionInterieurCabine: order.finitionInterieurCabine ?? null,
      revetementSol: order.revetementSol ?? null,
      largeurPassageLibreMm: order.largeurPassageLibreMm ?? null,
      hauteurUtileCabineMm: order.hauteurUtileCabineMm ?? null,
      typeSuspensionGuidage: order.typeSuspensionGuidage ?? null,
      systemeSurcharge: order.systemeSurcharge ?? null,
      optPanoramique: order.optPanoramique,
      optSecours: order.optSecours,
      optAnnoncesVocales: order.optAnnoncesVocales,
      optCctv: order.optCctv,
      optPortesCoupeFeu: order.optPortesCoupeFeu,
      optPanneauTactile: order.optPanneauTactile,
    }

    // ── STEP 5 — Generate the "Fiche Technique" PDF ───────────────────────
    let pdfFileName = ''
    let pdfBase64: string | undefined = undefined

    try {
      console.log('[PDF] ═══ Génération Fiche Technique ═══')
      console.log(`[PDF]   Série: ${pdfData.serialNumber}`)
      const pdfResult = await generateFicheTechnique(pdfData)
      pdfFileName = pdfResult.fileName
      console.log(`[PDF]   Fichier compilé: ${pdfFileName}`)
      console.log(`[PDF]   Emplacement: ${pdfResult.filePath}`)

      pdfBase64 = readPdfBase64(pdfResult.filePath) ?? undefined
      if (pdfBase64) {
        console.log(`[PDF]   Base64 prêt: ${(pdfBase64.length / 1024).toFixed(1)} KB encodés`)
      }
      console.log('[PDF] ════════════════════════════════════')
    } catch (pdfErr) {
      const msg = pdfErr instanceof Error ? pdfErr.message : 'Erreur inconnue'
      console.warn('[PDF] ⚠️  ÉCHEC DE GÉNÉRATION PDF (non-bloquant)')
      console.warn(`[PDF]   Raison: ${msg}`)
      console.warn('[PDF]   La commande est sauvegardée — la fiche pourra être régénérée.')
    }

    // ── STEP 6 — Sync to Electron (Bureau d'étude #1) ─────────────────────
    let syncResult: { success: boolean; error?: string } = {
      success: false,
      error: 'Non déclenché (PDF non disponible)',
    }

    if (pdfBase64) {
      try {
        console.log('[SYNC] ═══ Transmission point-à-point vers Electron ═══')
        const syncPayload = buildSyncPayload(pdfData, pdfFileName, pdfBase64, extendedSpecs)
        syncResult = await syncToExternalSoftware(syncPayload)
      } catch (syncErr) {
        const msg = syncErr instanceof Error ? syncErr.message : 'Erreur inconnue'
        console.warn('[SYNC] ⚠️  Exception inattendue dans le pipeline de synchronisation')
        console.warn(`[SYNC]   Raison: ${msg}`)
        syncResult = { success: false, error: msg }
      }
    } else {
      console.warn('[SYNC] ⚠️  Pas de PDF base64 disponible — synchronisation ignorée.')
    }

    // ── STEP 7 — Respond with HTTP 201 ────────────────────────────────────
    res.status(201).json({
      message: 'Commande créée avec succès. Fiche technique compilée et transmise directement au bureau d\'étude.',
      order: {
        id: order.id,
        serialNumber: order.serialNumber,
        status: order.status,
        createdAt: order.createdAt,
      },
      pdf: pdfFileName
        ? { fileName: pdfFileName, url: buildLocalAdminPdfUrl(req, `/documents/fiches/${pdfFileName}`) }
        : null,
      sync: syncResult,
    })
  } catch (err) {
    // ── Only DB/Zod failures reach here ──────────────────────────────────
    // PDF and sync errors are caught internally and never propagate.
    // The global error handler maps:
    //   ZodError → 400 (field-level details)
    //   AppError → 409 / 404 / etc.
    //   Fallback → 500
    next(err)
  }
}
