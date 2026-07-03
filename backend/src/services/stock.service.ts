// ─── Stock Service — Business Logic ──────────────────────────────────────────
import type { MovementType, DocumentType, DocumentStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/error.js'
import { generateMovementPdf, generateBonCommandePdf } from './stock-pdf.service.js'
import type { BonCommandeLineData } from './stock-pdf.service.js'

// ─── Item CRUD ──────────────────────────────────────────────────────────────
export async function createItem(data: {
  reference: string; name: string; description?: string; category: string
  unit?: string; quantity?: number; alertThreshold?: number; unitPrice?: number; supplierId?: string; imageUrl?: string; location?: string
}) {
  const existing = await prisma.stockItem.findUnique({ where: { reference: data.reference } })
  if (existing) throw new AppError(409, 'Cette référence existe déjà.')
  return prisma.stockItem.create({ data, include: { supplier: true, movements: { take: 5, orderBy: { createdAt: 'desc' } } } })
}

export async function listItems(category?: string, lowStock?: boolean, location?: string, supplierId?: string) {
  const where: any = {}
  if (category) where.category = category
  if (location) where.location = location
  if (supplierId) where.supplierId = supplierId
  // lowStock filter is applied post-query via JS filter below
  const items = await prisma.stockItem.findMany({
    where, include: { supplier: true, _count: { select: { movements: true } } },
    orderBy: { name: 'asc' },
  })
  if (lowStock) return items.filter(i => i.quantity <= i.alertThreshold)
  return items
}

export async function getItem(id: string) {
  const item = await prisma.stockItem.findUnique({
    where: { id }, include: { supplier: true, movements: { orderBy: { createdAt: 'desc' }, take: 50, include: { order: { select: { serialNumber: true } }, supplier: true, document: true } } },
  })
  if (!item) throw new AppError(404, 'Article introuvable.')
  return item
}

export async function updateItem(id: string, data: Partial<{
  name: string; description: string; category: string; unit: string
  quantity: number; alertThreshold: number; unitPrice: number; supplierId: string; imageUrl: string; location: string
}>) {
  return prisma.stockItem.update({ where: { id }, data, include: { supplier: true } })
}

export async function deleteItem(id: string) {
  await prisma.stockItem.delete({ where: { id } })
}

// ─── Supplier CRUD ──────────────────────────────────────────────────────────
export async function createSupplier(data: { name: string; contactName?: string; email?: string; phone?: string; address?: string; notes?: string }) {
  return prisma.supplier.create({ data })
}

export async function listSuppliers() {
  return prisma.supplier.findMany({
    include: { _count: { select: { items: true, movements: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id }, include: { items: true, movements: { take: 20, orderBy: { createdAt: 'desc' } }, documents: { take: 20, orderBy: { createdAt: 'desc' } } },
  })
  if (!supplier) throw new AppError(404, 'Fournisseur introuvable.')
  return supplier
}

export async function updateSupplier(id: string, data: any) {
  return prisma.supplier.update({ where: { id }, data })
}

export async function deleteSupplier(id: string) {
  await prisma.supplier.delete({ where: { id } })
}

// ─── Stock Movements ────────────────────────────────────────────────────────
export async function createMovement(data: {
  type: MovementType; quantity: number; itemId: string; orderId?: string
  supplierId?: string; reference?: string; notes?: string; unitPrice?: number; totalPrice?: number
  performedBy?: string
}) {
  // Use a transaction: create movement + update item quantity
  let finalNewQty = 0
  const movement = await prisma.$transaction(async (tx) => {
    const item = await tx.stockItem.findUnique({ where: { id: data.itemId } })
    if (!item) throw new AppError(404, 'Article introuvable.')

    let newQty = item.quantity
    if (data.type === 'ENTRY') newQty += data.quantity
    else if (data.type === 'EXIT') newQty -= data.quantity
    else if (data.type === 'ADJUSTMENT') newQty = data.quantity

    if (newQty < 0) throw new AppError(400, 'Stock insuffisant pour cette sortie.')

    await tx.stockItem.update({ where: { id: data.itemId }, data: { quantity: newQty } })
    finalNewQty = newQty

    return tx.stockMovement.create({
      data: {
        type: data.type, quantity: data.quantity, itemId: data.itemId,
        orderId: data.orderId || null, supplierId: data.supplierId || null,
        reference: data.reference, notes: data.notes,
        unitPrice: data.unitPrice, totalPrice: data.totalPrice,
        performedBy: data.performedBy,
      },
      include: { item: { include: { supplier: true } }, order: { select: { serialNumber: true } }, supplier: true, document: true },
    })
  })

  // ── Auto-generate PDF document for this movement ────────────────────────
  try {
    const movementWithSupplier = await prisma.stockMovement.findUnique({
      where: { id: movement.id },
      include: { item: { include: { supplier: true } }, order: { select: { serialNumber: true } }, supplier: true },
    })

    if (movementWithSupplier?.item) {
      const pdfResult = await generateMovementPdf({
        movementId: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        unitPrice: movement.unitPrice,
        totalPrice: movement.totalPrice,
        reference: movement.reference,
        notes: movement.notes,
        performedBy: movement.performedBy,
        createdAt: movement.createdAt.toISOString(),
        itemName: movementWithSupplier.item.name,
        itemReference: movementWithSupplier.item.reference,
        itemCategory: movementWithSupplier.item.category,
        itemUnit: movementWithSupplier.item.unit,
        itemQuantity: finalNewQty, // quantity after movement
        supplierName: movementWithSupplier.supplier?.name || movementWithSupplier.item.supplier?.name || null,
        orderSerial: movementWithSupplier.order?.serialNumber || null,
      })

      // Save document reference
      const docType = { ENTRY: 'BON_LIVRAISON', EXIT: 'BON_SORTIE', ADJUSTMENT: 'INVENTAIRE', TRANSFER: 'INVENTAIRE' }[movement.type] || 'BON_SORTIE'
      const ref = movement.reference || movement.id.slice(0, 8).toUpperCase()
      await prisma.stockDocument.create({
        data: {
          documentType: docType as any,
          documentNumber: ref,
          title: `${docType.replace('_', ' ')} - ${movementWithSupplier.item.name}`,
          supplierId: movement.supplierId || movementWithSupplier.item.supplierId,
          totalHT: movement.totalPrice || undefined,
          totalTTC: movement.totalPrice || undefined,
          status: 'VALIDE',
          movement: { connect: { id: movement.id } },
        },
      })
    }
  } catch (pdfErr: any) {
    console.warn('[STOCK-PDF] ⚠️  PDF generation failed (non-blocking):', pdfErr.message)
  }

  return movement
}

export async function listMovements(itemId?: string, type?: string, limit = 100) {
  const where: any = {}
  if (itemId) where.itemId = itemId
  if (type) where.type = type
  return prisma.stockMovement.findMany({
    where, include: { item: true, order: { select: { serialNumber: true } }, supplier: true, document: true },
    orderBy: { createdAt: 'desc' }, take: limit,
  })
}

// ─── Documents (Bon de commande, Facture, etc.) ──────────────────────────
export async function createDocument(data: {
  documentType: DocumentType; documentNumber: string; title: string; description?: string
  supplierId?: string; orderId?: string; totalHT?: number; totalTVA?: number; totalTTC?: number
  status?: DocumentStatus
}) {
  // Strip any unknown properties that may come from req.body
  const { documentType, documentNumber, title, description, supplierId, orderId, totalHT, totalTVA, totalTTC, status: docStatus } = data
  return prisma.stockDocument.create({
    data: { documentType, documentNumber, title, description, supplierId, orderId, totalHT, totalTVA, totalTTC, status: docStatus },
    include: { supplier: true, order: { select: { serialNumber: true, clientName: true } } },
  })
}

export async function listDocuments(type?: string, limit = 50) {
  const where: any = {}
  if (type) where.documentType = type
  return prisma.stockDocument.findMany({
    where, include: { supplier: true, order: { select: { serialNumber: true, clientName: true } } },
    orderBy: { createdAt: 'desc' }, take: limit,
  })
}

export async function getDocument(id: string) {
  const doc = await prisma.stockDocument.findUnique({
    where: { id }, include: { supplier: true, order: true, movement: { include: { item: true } } },
  })
  if (!doc) throw new AppError(404, 'Document introuvable.')
  return doc
}

// ─── Bon de Commande ────────────────────────────────────────────────────────
// Creates a purchase order document with multiple items + auto-generates PDF
export async function createBonCommande(data: {
  documentNumber: string
  title: string
  description?: string
  supplierId?: string
  totalHT?: number
  totalTVA?: number
  totalTTC?: number
  lines: { itemId: string; quantity: number; unitPrice?: number; totalPrice?: number }[]
  createdBy?: string
}) {
  // Calculate totals from lines if not provided
  let totalHT = data.totalHT ?? 0
  let totalTTC = data.totalTTC ?? 0
  const computedLines = data.lines.map(l => ({
    ...l,
    unitPrice: l.unitPrice ?? 0,
    totalPrice: l.totalPrice ?? (l.unitPrice ?? 0) * l.quantity,
  }))

  if (!data.totalHT) totalHT = computedLines.reduce((s, l) => s + (l.totalPrice || 0), 0)
  if (!data.totalTTC) totalTTC = totalHT + (data.totalTVA || 0)

  // Create the document with lines in a transaction
  const doc = await prisma.$transaction(async (tx) => {
    const document = await tx.stockDocument.create({
      data: {
        documentType: 'BON_COMMANDE',
        documentNumber: data.documentNumber,
        title: data.title,
        description: data.description,
        supplierId: data.supplierId || null,
        totalHT: totalHT,
        totalTTC: totalTTC,
        status: 'VALIDE',
        lines: {
          create: computedLines.map(l => ({
            itemId: l.itemId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            totalPrice: l.totalPrice,
          })),
        },
      },
      include: {
        supplier: true,
        lines: { include: { item: true } },
      },
    })
    return document
  })

  // ── Auto-generate PDF ──────────────────────────────────────────────────
  try {
    const pdfData = {
      documentNumber: doc.documentNumber,
      title: doc.title,
      description: doc.description,
      createdAt: doc.createdAt.toISOString(),
      supplierName: doc.supplier?.name || null,
      supplierContact: doc.supplier?.contactName || null,
      supplierPhone: doc.supplier?.phone || null,
      supplierEmail: doc.supplier?.email || null,
      totalHT: doc.totalHT,
      totalTVA: doc.totalTVA,
      totalTTC: doc.totalTTC,
      createdBy: data.createdBy || null,
      lines: doc.lines.map(l => ({
        itemName: l.item.name,
        itemReference: l.item.reference,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: l.totalPrice,
      })),
    }
    await generateBonCommandePdf(pdfData)
  } catch (pdfErr: any) {
    console.warn('[BON_COMMANDE-PDF] ⚠️  PDF generation failed (non-blocking):', pdfErr.message)
  }

  return doc
}

// ─── Dashboard / Stats ──────────────────────────────────────────────────────
export async function getStockStats() {
  const [totalItems, totalSuppliers, recentMovements, allItems] = await Promise.all([
    prisma.stockItem.count(),
    prisma.supplier.count(),
    prisma.stockMovement.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { item: true } }),
    prisma.stockItem.findMany({ select: { quantity: true, alertThreshold: true } }),
  ])

  const lowStockItems = allItems.filter(i => i.quantity <= i.alertThreshold).length

  const categoryCounts = await prisma.stockItem.groupBy({ by: ['category'], _count: true })
  const totalValue = await prisma.stockItem.aggregate({ _sum: { unitPrice: true } })
  const totalStockValue = totalValue._sum.unitPrice || 0

  return { totalItems, lowStockItems, totalSuppliers, recentMovements, categoryCounts, totalStockValue }
}
