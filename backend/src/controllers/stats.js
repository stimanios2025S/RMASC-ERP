// ─── RMASC FACTORY — Stats Aggregation Controller ──────────────────────────
// Centralized, live MongoDB aggregation pipelines for ALL dashboards.
// Replaces hardcoded / client-side array filtering with real DB-level metrics.
import mongoose from 'mongoose'
import Order from '../models/Order.js'
import StockItem from '../models/StockItem.js'
import StockDocument from '../models/StockDocument.js'
import StockMovement from '../models/StockMovement.js'
import Supplier from '../models/Supplier.js'
import CAD_Submission from '../models/CAD_Submission.js'

// ─── GET /api/stats/dashboard ───────────────────────────────────────────────
// Admin dashboard: orders by status, pipeline flow, conversion metrics.
export async function getDashboardStats(req, res) {
  try {
    const [
      ordersByStatus,
      priorityBreakdown,
      typeBreakdown,
      lifecyclePipeline,
      totalRevenue,
    ] = await Promise.all([
      // Orders grouped by status (live count)
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).option({ allowDiskUse: false }),

      // Priority distribution
      Order.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]).option({ allowDiskUse: false }),

      // Cabin type breakdown
      Order.aggregate([
        { $group: { _id: '$typeCabine', count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
      ]).option({ allowDiskUse: false }),

      // Lifecycle pipeline: orders per engineering stage
      Order.aggregate([
        { $group: { _id: '$lifecycleStage', count: { $sum: 1 } } },
      ]).option({ allowDiskUse: false }),

      // Total revenue (sum of salePriceDZD for delivered/validated orders)
      Order.aggregate([
        { $match: { status: { $in: ['LIVREE', 'VALIDEE'] } } },
        { $group: { _id: null, total: { $sum: '$salePriceDZD' }, count: { $sum: 1 } } },
      ]).option({ allowDiskUse: false }),
    ])

    // ── Map results into structured response ──────────────────────────────
    const statusMap = {}
    for (const row of ordersByStatus) { statusMap[row._id] = row.count }

    const priorityMap = {}
    for (const row of priorityBreakdown) { priorityMap[row._id] = row.count }

    const typeMap = {}
    for (const row of typeBreakdown) { typeMap[row._id] = row.count }

    const lifecycleMap = {}
    for (const row of lifecyclePipeline) { lifecycleMap[row._id] = row.count }

    const revenue = totalRevenue.length > 0 ? totalRevenue[0] : { total: 0, count: 0 }

    // ── Derived KPIs ────────────────────────────────────────────────────
    const activeStatuses = ['ATTENTE_DESSIN_TECH', 'ATTENTE_DESSIN_2D', 'ATTENTE_VERIFICATION', 'EN_LIVRAISON']
    const blockedStatuses = ['BROUILLON', 'ATTENTE_APPROBATION_ADMIN', 'PRET_POUR_PRODUCTION']
    const completedStatuses = ['LIVREE', 'VALIDEE']
    const cancelledStatuses = ['ANNULEE']

    const totalOrders = Object.values(statusMap).reduce((s, c) => s + c, 0)
    const activeOrders = activeStatuses.reduce((s, k) => s + (statusMap[k] || 0), 0)
    const blockedOrders = blockedStatuses.reduce((s, k) => s + (statusMap[k] || 0), 0)
    const completedOrders = completedStatuses.reduce((s, k) => s + (statusMap[k] || 0), 0)
    const cancelledOrders = cancelledStatuses.reduce((s, k) => s + (statusMap[k] || 0), 0)

    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

    // ── Engineer pipeline stages ─────────────────────────────────────────
    const engineeringStages = {
      engineering: statusMap['ATTENTE_DESSIN_TECH'] || 0,
      design2d: statusMap['ATTENTE_DESSIN_2D'] || 0,
      verification: statusMap['ATTENTE_VERIFICATION'] || 0,
      production: (statusMap['PRET_POUR_PRODUCTION'] || 0) + (statusMap['EN_LIVRAISON'] || 0),
    }

    res.json({
      totalOrders,
      activeOrders,
      blockedOrders,
      completedOrders,
      cancelledOrders,
      completionRate,
      statusMap,
      priorityMap,
      typeMap,
      lifecycleMap,
      engineeringStages,
      revenue: { totalDZD: revenue.total || 0, deliveredCount: revenue.count || 0 },
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// ─── GET /api/stats/orders ──────────────────────────────────────────────────
// Detailed orders metrics: timeline, average cycle time, per-engineer stats.
export async function getOrderMetrics(req, res) {
  try {
    const [recentOrders, avgCompletion, engineerBreakdown, cadSubmissionsByType] = await Promise.all([
      // Recent 10 orders (lightweight projection)
      Order.find()
        .select('serialNumber clientName clientCity status priority typeCabine createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Average cycle time for completed orders (createdAt → completedAt)
      Order.aggregate([
        { $match: { completedAt: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            avgDays: { $avg: { $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 86400000] } },
            count: { $sum: 1 },
          },
        },
      ]).option({ allowDiskUse: false }),

      // Orders per engineer
      Order.aggregate([
        { $match: { engineeredBy: { $exists: true, $ne: null } } },
        { $group: { _id: '$engineeredBy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).option({ allowDiskUse: false }),

      // CAD submissions grouped by type
      CAD_Submission.aggregate([
        { $group: { _id: '$engineeringType', count: { $sum: 1 } } },
      ]).option({ allowDiskUse: false }),
    ])

    // Count orders created in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const recent30Days = await Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })

    // Count orders created in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    const recent7Days = await Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } })

    res.json({
      recentOrders: recentOrders.map(o => ({ ...o, id: o._id.toString() })),
      avgCompletionDays: avgCompletion.length > 0 ? Math.round(avgCompletion[0].avgDays * 10) / 10 : null,
      completedCount: avgCompletion.length > 0 ? avgCompletion[0].count : 0,
      engineerBreakdown: engineerBreakdown.reduce((acc, r) => { acc[r._id] = r.count; return acc }, {}),
      cadSubmissionsByType: cadSubmissionsByType.reduce((acc, r) => { acc[r._id] = r.count; return acc }, {}),
      recent30Days,
      recent7Days,
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// ─── GET /api/stats/stock ───────────────────────────────────────────────────
// Stock KPIs: total value, low stock alerts, category breakdown, top items.
export async function getStockKPIs(req, res) {
  try {
    const [
      totalItems,
      lowStockItems,
      categoryBreakdown,
      totalStockValue,
      recentMovements,
      supplierCount,
    ] = await Promise.all([
      StockItem.countDocuments(),
      StockItem.countDocuments({ $expr: { $lte: ['$quantity', '$alertThreshold'] } }),
      StockItem.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, totalQuantity: { $sum: '$quantity' } } },
        { $sort: { count: -1 } },
      ]).option({ allowDiskUse: false }),
      StockItem.aggregate([
        { $group: { _id: null, total: { $sum: { $multiply: [{ $ifNull: ['$quantity', 0] }, { $ifNull: ['$unitPrice', 0] }] } } } },
      ]).option({ allowDiskUse: false }),
      StockMovement.find()
        .populate('item', 'name reference')
        .populate('supplier', 'name')
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      Supplier.countDocuments(),
    ])

    const stockValue = totalStockValue.length > 0 ? totalStockValue[0].total : 0

    // Low stock item details
    const lowStockDetails = await StockItem.find(
      { $expr: { $lte: ['$quantity', '$alertThreshold'] } }
    ).select('name reference category quantity alertThreshold unitPrice').sort({ quantity: 1 }).limit(20).lean()

    res.json({
      totalItems,
      lowStockCount: lowStockItems,
      lowStockItems: lowStockDetails.map(i => ({ ...i, id: i._id.toString() })),
      totalSuppliers: supplierCount,
      totalStockValueDZD: stockValue,
      categoryBreakdown: categoryBreakdown.map(c => ({ category: c._id, count: c.count, totalQuantity: c.totalQuantity })),
      recentMovements: recentMovements.map(m => ({
        id: m._id.toString(),
        type: m.type,
        quantity: m.quantity,
        itemName: m.item?.name,
        itemRef: m.item?.reference,
        supplierName: m.supplier?.name,
        unitPrice: m.unitPrice,
        totalPrice: m.totalPrice,
        createdAt: m.createdAt,
      })),
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// ─── GET /api/stats/invoicing ───────────────────────────────────────────────
// Invoicing KPIs: totals, pending payments, document breakdown.
export async function getInvoicingStats(req, res) {
  try {
    const [
      documentTotals,
      totalInvoiced,
      pendingPayments,
      byStatus,
      byType,
    ] = await Promise.all([
      // Totals by document type
      StockDocument.aggregate([
        { $group: { _id: '$documentType', count: { $sum: 1 }, totalTTC: { $sum: '$totalTTC' }, totalHT: { $sum: '$totalHT' }, totalTVA: { $sum: '$totalTVA' } } },
      ]).option({ allowDiskUse: false }),

      // Grand total invoiced (FACTURE type only)
      StockDocument.aggregate([
        { $match: { documentType: 'FACTURE' } },
        { $group: { _id: null, totalTTC: { $sum: '$totalTTC' }, totalHT: { $sum: '$totalHT' }, totalTVA: { $sum: '$totalTVA' }, count: { $sum: 1 } } },
      ]).option({ allowDiskUse: false }),

      // Pending payment documents
      StockDocument.aggregate([
        { $match: { status: { $in: ['EN_ATTENTE', 'BROUILLON'] } } },
        { $group: { _id: null, totalTTC: { $sum: '$totalTTC' }, count: { $sum: 1 } } },
      ]).option({ allowDiskUse: false }),

      // By status
      StockDocument.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, totalTTC: { $sum: '$totalTTC' } } },
      ]).option({ allowDiskUse: false }),

      // By document type
      StockDocument.aggregate([
        { $group: { _id: '$documentType', count: { $sum: 1 } } },
      ]).option({ allowDiskUse: false }),
    ])

    // Recent documents (last 20)
    const recentDocs = await StockDocument.find()
      .populate('supplier', 'name')
      .populate('order', 'serialNumber')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    const invoiceTotals = totalInvoiced.length > 0 ? totalInvoiced[0] : { totalTTC: 0, totalHT: 0, totalTVA: 0, count: 0 }
    const pending = pendingPayments.length > 0 ? pendingPayments[0] : { totalTTC: 0, count: 0 }

    res.json({
      documentTotals: documentTotals.reduce((acc, r) => { acc[r._id] = { count: r.count, totalTTC: r.totalTTC, totalHT: r.totalHT, totalTVA: r.totalTVA }; return acc }, {}),
      invoiceTotals: { totalTTC: invoiceTotals.totalTTC, totalHT: invoiceTotals.totalHT, totalTVA: invoiceTotals.totalTVA },
      invoicedCount: invoiceTotals.count,
      pendingPayments: { totalTTC: pending.totalTTC, count: pending.count },
      byStatus: byStatus.reduce((acc, r) => { acc[r._id] = { count: r.count, totalTTC: r.totalTTC }; return acc }, {}),
      byType: byType.reduce((acc, r) => { acc[r._id] = r.count; return acc }, {}),
      recentDocuments: recentDocs.map(d => ({
        id: d._id.toString(),
        documentType: d.documentType,
        documentNumber: d.documentNumber,
        title: d.title,
        supplierName: d.supplier?.name,
        orderSerial: d.order?.serialNumber,
        totalTTC: d.totalTTC,
        status: d.status,
        createdAt: d.createdAt,
      })),
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// ─── GET /api/stats/engineer ────────────────────────────────────────────────
// Engineer portal KPIs: pending calculations, validated drawings, vault docs.
export async function getEngineerStats(req, res) {
  try {
    const [
      pendingTechDrawings,
      pending2DDrawings,
      pendingVerification,
      approvedCAD,
      rejectedCAD,
      vaultDocumentCount,
      productionReady,
    ] = await Promise.all([
      Order.countDocuments({ status: 'ATTENTE_DESSIN_TECH' }),
      Order.countDocuments({ status: 'ATTENTE_DESSIN_2D' }),
      Order.countDocuments({ status: 'ATTENTE_VERIFICATION' }),
      CAD_Submission.countDocuments({ status: 'APPROUVE' }),
      CAD_Submission.countDocuments({ status: 'REJETE' }),
      Order.countDocuments({ 'files.0': { $exists: true } }),
      Order.countDocuments({ status: 'PRET_POUR_PRODUCTION' }),
    ])

    res.json({
      pendingTechDrawings,
      pending2DDrawings,
      pendingVerification,
      approvedCADSubmissions: approvedCAD,
      rejectedCADSubmissions: rejectedCAD,
      ordersWithFiles: vaultDocumentCount,
      productionReady,
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
