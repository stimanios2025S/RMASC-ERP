// ─── External Software Sync Service ────────────────────────────────────────
// Transmits the complete order payload + Fiche Technique PDF (base64) directly
// to the colleague's Electron desktop app at "Bureau d'étude #1" via a single
// HTTP POST over the local network. NO external hosting, NO cloud uploads,
// NO temporary public URLs — everything flows point-to-point.
//
// Design: fail-safe — a webhook failure NEVER crashes the order creation flow.
// The frontend always receives a 201; the sync error is logged server-side
// for later investigation.

import { AUTH_CONFIG } from '../config/auth.js'
import type { PdfOrderData } from './pdf.service.js'

export interface SyncPayload {
  serialNumber: string
  clientInfo: {
    nom: string
    email: string | null
    telephone: string
    ville: string
  }
  technicalSpecs: {
    motorisation: string
    sousType: string | null
    vitesse: string | null
    etages: string | null
  }
  dimensions: {
    largeur: string
    profondeur: string
    hauteur: string
  }
  materiaux: {
    cabine: string | null
    parois: string | null
    portes: string | null
    sol: string | null
  }
  /** Mekisan catalog specifications. */
  catalogSpecs: {
    typeCabine: string | null
    typePorte: string | null
    finitionPorteCabine: string | null
    typeChassisArcade: string | null
    finitionInterieurCabine: string | null
    revetementSol: string | null
  }
  /** Mechanical specifications. */
  mecaniqueSpecs: {
    largeurPassageLibreMm: string | null
    hauteurUtileCabineMm: string | null
    typeSuspensionGuidage: string | null
    systemeSurcharge: string | null
  }
  options: string[]
  /** The generated PDF filename (e.g. "fiche_technique_RM-2026-0042-ASC.pdf").
   *  Provided for display / naming in the Electron app's dashboard. */
  pdfFileName: string
  /** Full base64-encoded PDF content — the complete "Fiche Technique" document.
   *  The Electron app decodes this directly into its local memory buffer without
   *  ever needing to fetch an external URL. NO cloud hosting involved. */
  pdfBase64: string
  /** Extended specification payload from the Production Direct Injector.
   *  Contains fields beyond the core Prisma schema (project_name, capacite_kg,
   *  structure_type, cabine dimensions, niveaux_count) that the Electron app's
   *  "Bureau d'étude #1" dashboard uses for its verification schema. */
  extendedSpecs?: Record<string, unknown>
  /** Metadata identifying the origin system and target section. */
  source: 'rmasc-erp'
  targetSection: "Bureau d'étude #1"
}

export interface SyncResult {
  success: boolean
  statusCode?: number
  error?: string
}

// ─── Build the options list (only checked ones) ────────────────────────────
function buildOptionsList(data: PdfOrderData): string[] {
  const opts: string[] = []
  if (data.optPanoramique) opts.push('Ascenseur panoramique')
  if (data.optSecours) opts.push('Alimentation de secours')
  if (data.optAnnoncesVocales) opts.push('Annonces vocales')
  if (data.optCctv) opts.push('CCTV intégré')
  if (data.optPortesCoupeFeu) opts.push('Portes coupe-feu')
  if (data.optPanneauTactile) opts.push('Panneau tactile')
  return opts
}

// ─── Build the direct point-to-point webhook payload ───────────────────────
export function buildSyncPayload(
  data: PdfOrderData,
  pdfFileName: string,
  pdfBase64: string,
  extendedSpecs?: Record<string, unknown>,
): SyncPayload {
  return {
    serialNumber: data.serialNumber,
    clientInfo: {
      nom: data.clientName,
      email: data.clientEmail,
      telephone: data.clientPhone,
      ville: data.clientCity,
    },
    technicalSpecs: {
      motorisation: data.typeMotorisation,
      sousType: data.sousTypeElectrique,
      vitesse: data.vitesseMs,
      etages: data.nombreEtages,
    },
    dimensions: {
      largeur: data.largeurGaineMm,
      profondeur: data.profondeurGaineMm,
      hauteur: data.hauteurGaineMm,
    },
    materiaux: {
      cabine: data.materiauCabine,
      parois: data.materiauParois,
      portes: data.materiauPortes,
      sol: data.materiauSol,
    },
    catalogSpecs: {
      typeCabine: data.typeCabine,
      typePorte: data.typePorte,
      finitionPorteCabine: data.finitionPorteCabine,
      typeChassisArcade: data.typeChassisArcade,
      finitionInterieurCabine: data.finitionInterieurCabine,
      revetementSol: data.revetementSol,
    },
    mecaniqueSpecs: {
      largeurPassageLibreMm: data.largeurPassageLibreMm,
      hauteurUtileCabineMm: data.hauteurUtileCabineMm,
      typeSuspensionGuidage: data.typeSuspensionGuidage,
      systemeSurcharge: data.systemeSurcharge,
    },
    options: buildOptionsList(data),
    pdfFileName,
    pdfBase64,
    extendedSpecs,
    source: 'rmasc-erp',
    targetSection: "Bureau d'étude #1",
  }
}

// ─── Direct local-network POST to the Electron desktop app ─────────────────
export async function syncToExternalSoftware(
  payload: SyncPayload,
): Promise<SyncResult> {
  // ── HARDWIRED direct local-network target ──────────────────────────────
  // NO load balancers, NO cloud proxies, NO external routing — straight
  // from this backend instance into the colleague's machine via the local
  // network interface.
  const targetUrl = AUTH_CONFIG.electronSoftwareUrl

  try {
    console.log('[SYNC] ── Début synchronisation directe ──────────────────────────')
    console.log(`[SYNC]   Cible    : ${targetUrl}`)
    console.log(`[SYNC]   Machine  : 192.168.0.189:30000 (réseau local)`)
    console.log(`[SYNC]   Section  : Bureau d'étude #1`)
    console.log(`[SYNC]   Série    : ${payload.serialNumber}`)
    console.log(`[SYNC]   PDF      : ${payload.pdfFileName} (${(payload.pdfBase64.length / 1024).toFixed(1)} KB base64)`)
    console.log('[SYNC]   Transfert direct point-à-point — aucun stockage cloud intermédiaire.')

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AUTH_CONFIG.webhookApiKey,
        'X-RMASC-Source': 'rmasc-erp',
        'X-RMASC-Target': "Bureau d'étude #1",
        'X-RMASC-Delivery': 'direct-local-network',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      console.warn(`[SYNC]   ⚠️  Réponse Electron: HTTP ${response.status} ${response.statusText}`)
    }

    const result: SyncResult = {
      success: response.ok,
      statusCode: response.status,
    }
    console.log(`[SYNC]   Résultat: ${result.success ? '✅ LIVRÉ — Fichier reçu par le Bureau d\'étude' : `⚠️ Reçu HTTP ${response.status}`}`)
    console.log('[SYNC] ──────────────────────────────────────────────────────────')
    return result
  } catch (err) {
    // ── FAIL-SAFE: Electron app offline ─────────────────────────────────
    // The colleague's machine at 192.168.0.189:30000 may be powered off or
    // his Electron app may not be running. This is a non-critical error
    // logged with full context so the team can investigate later.
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.warn('[SYNC] ═══════════════════════════════════════════════════════════════')
    console.warn('[SYNC]  ⚠️  TRANSMISSION ÉLECTRON ÉCHOUÉE (non-bloquante)')
    console.warn(`[SYNC]  Cible   : ${targetUrl} (192.168.0.189:30000)`)
    console.warn(`[SYNC]  Série   : ${payload.serialNumber}`)
    console.warn(`[SYNC]  Raison  : ${message}`)
    console.warn('[SYNC]  Action  : La commande est SAUVEGARDÉE dans la base Neon.')
    console.warn('[SYNC]           : Demander au collègue de vérifier que son')
    console.warn('[SYNC]           : application Electron est bien lancée.')
    console.warn('[SYNC] ═══════════════════════════════════════════════════════════════')
    return { success: false, error: message }
  }
}
