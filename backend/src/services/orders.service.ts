// ─── Orders Service — Business Logic ────────────────────────────────────────
import type { OrderStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import type { CreateOrderInput } from '../schemas/orders.schema.js'
import { AppError } from '../middleware/error.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strict: if a string field is empty (even after trimming), yield null. */
function emptyStrToNull(value: string | undefined | null): string | null {
  if (value == null || value.trim() === '') return null
  return value
}

// ─── Create a new order configuration ──────────────────────────────────────
export async function createOrder(data: CreateOrderInput) {
  // Check serial uniqueness first — fast path avoids a wasted INSERT.
  const existing = await prisma.order.findUnique({
    where: { serialNumber: data.serialNumber },
  })
  if (existing) {
    throw new AppError(409, `Le numéro de série "${data.serialNumber}" existe déjà.`)
  }

  // ── Build the create payload with explicit null-coercion for optional fields ──
  const order = await prisma.order.create({
    data: {
      // Required string fields
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientCity: data.clientCity,
      serialNumber: data.serialNumber,
      typeMotorisation: data.typeMotorisation,
      largeurGaineMm: data.largeurGaineMm,
      profondeurGaineMm: data.profondeurGaineMm,
      hauteurGaineMm: data.hauteurGaineMm,

      // Optional string fields — empty string → null
      clientEmail: emptyStrToNull(data.clientEmail),
      sousTypeElectrique: emptyStrToNull(data.sousTypeElectrique),
      vitesseMs: emptyStrToNull(data.vitesseMs),
      nombreEtages: emptyStrToNull(data.nombreEtages),
      materiauCabine: emptyStrToNull(data.materiauCabine),
      materiauPortes: emptyStrToNull(data.materiauPortes),
      materiauParois: emptyStrToNull(data.materiauParois),
      materiauSol: emptyStrToNull(data.materiauSol),

      // ── Nouvelles dimensions
      profondeurCuvetteMm: emptyStrToNull(data.profondeurCuvetteMm),
      hauteurDernierEtageMm: emptyStrToNull(data.hauteurDernierEtageMm),

      // ── Contrepoids & calculs Salim Hamoun AI
      contrepoidsPosition: emptyStrToNull(data.contrepoidsPosition),
      positionContrepoids: emptyStrToNull(data.positionContrepoids),
      largeurCabineCalculeeMm: emptyStrToNull(data.largeurCabineCalculeeMm),
      profondeurCabineCalculeeMm: emptyStrToNull(data.profondeurCabineCalculeeMm),

      // ── Cycle de vie & traçabilité financière
      lifecycleStage: emptyStrToNull(data.lifecycleStage),
      engineeredBy: emptyStrToNull(data.engineeredBy),
      totalCostDZD: data.totalCostDZD ?? undefined,
      salePriceDZD: data.salePriceDZD ?? undefined,
      marginPct: data.marginPct ?? undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,

      // ── Mekisan Catalog fields (String/Enum mix)
      typeCabine: data.typeCabine ?? undefined,
      typePorte: data.typePorte ?? undefined,
      finitionPorteCabine: data.finitionPorteCabine ?? undefined,
      typeChassisArcade: data.typeChassisArcade ?? undefined,
      finitionInterieurCabine: emptyStrToNull(data.finitionInterieurCabine),
      revetementSol: emptyStrToNull(data.revetementSol),

      // ── Mécanique — dimensions libres
      largeurPassageLibreMm: emptyStrToNull(data.largeurPassageLibreMm),
      hauteurUtileCabineMm: emptyStrToNull(data.hauteurUtileCabineMm),
      typeSuspensionGuidage: data.typeSuspensionGuidage ?? undefined,
      systemeSurcharge: data.systemeSurcharge ?? undefined,

      // Boolean options (defaults handled by Prisma schema)
      optPanoramique: data.optPanoramique ?? false,
      optSecours: data.optSecours ?? false,
      optAnnoncesVocales: data.optAnnoncesVocales ?? false,
      optCctv: data.optCctv ?? false,
      optPortesCoupeFeu: data.optPortesCoupeFeu ?? false,
      optPanneauTactile: data.optPanneauTactile ?? false,
      optVentilation: data.optVentilation ?? false,
      optBarreaudage: data.optBarreaudage ?? false,
      optAlarme: data.optAlarme ?? false,
    },
  })

  return order
}

// ─── Get order by ID ───────────────────────────────────────────────────────
export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      cadSubmissions: {
        select: {
          id: true,
          engineeringType: true,
          engineerName: true,
          status: true,
          rejectionReason: true,
          approvedAt: true,
          approvalToken: true,
          fileMimeType: true,
          fileSizeBytes: true,
        },
        orderBy: { engineeringType: 'asc' },
      },
    },
  })

  if (!order) {
    throw new AppError(404, 'Commande introuvable.')
  }

  return order
}

// ─── List all orders ───────────────────────────────────────────────────────
export async function listOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      serialNumber: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      clientCity: true,
      typeMotorisation: true,
      sousTypeElectrique: true,
      vitesseMs: true,
      nombreEtages: true,
      status: true,
      createdAt: true,
      largeurGaineMm: true,
      profondeurGaineMm: true,
      hauteurGaineMm: true,
      profondeurCuvetteMm: true,
      hauteurDernierEtageMm: true,
      contrepoidsPosition: true,
      positionContrepoids: true,
      largeurCabineCalculeeMm: true,
      profondeurCabineCalculeeMm: true,
      lifecycleStage: true,
      engineeredBy: true,
      totalCostDZD: true,
      salePriceDZD: true,
      marginPct: true,
      completedAt: true,
      materiauCabine: true,
      materiauPortes: true,
      materiauParois: true,
      materiauSol: true,
      typeCabine: true,
      typePorte: true,
      finitionPorteCabine: true,
      typeChassisArcade: true,
      finitionInterieurCabine: true,
      revetementSol: true,
      largeurPassageLibreMm: true,
      hauteurUtileCabineMm: true,
      typeSuspensionGuidage: true,
      systemeSurcharge: true,
      optPanoramique: true,
      optSecours: true,
      optAnnoncesVocales: true,
      optCctv: true,
      optPortesCoupeFeu: true,
      optPanneauTactile: true,
      optVentilation: true,
      optBarreaudage: true,
      optAlarme: true,
      _count: { select: { cadSubmissions: true } },
    },
  })
}

// ─── Update order status ───────────────────────────────────────────────────
export async function updateOrderStatus(id: string, status: OrderStatus) {
  const order = await prisma.order.update({
    where: { id },
    data: { status },
  })
  return order
}
