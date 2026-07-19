// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Database Reset Controller
//  ADMIN-ONLY — Wipes test/seed orders, parts, movements & audit logs.
//  PRESERVES : Users, Stock items, Suppliers, Catalog, Indexes
// ═══════════════════════════════════════════════════════════════════════════

import Order from '../models/Order.js'
import CAD_Submission from '../models/CAD_Submission.js'
import StandalonePart from '../models/StandalonePart.js'
import StockMovement from '../models/StockMovement.js'
import StockDocument from '../models/StockDocument.js'
import AuditLog from '../models/AuditLog.js'

export async function resetAllData(req, res) {
  try {
    const results = {}

    // 1. Orders + their CAD submissions
    const orderCount = await Order.countDocuments()
    if (orderCount > 0) {
      const allOrders = await Order.find().select('_id')
      const orderIds = allOrders.map(o => o._id)
      const cadDeleted = await CAD_Submission.deleteMany({ order: { $in: orderIds } })
      const ordersDeleted = await Order.deleteMany({})
      results.orders = { deleted: ordersDeleted.deletedCount }
      results.cadSubmissions = { deleted: cadDeleted.deletedCount }
    } else {
      results.orders = { deleted: 0 }
      results.cadSubmissions = { deleted: 0 }
    }

    // 2. Standalone parts
    const partsDeleted = await StandalonePart.deleteMany({})
    results.standaloneParts = { deleted: partsDeleted.deletedCount }

    // 3. Stock movements (keep items & suppliers)
    const movementsDeleted = await StockMovement.deleteMany({})
    results.stockMovements = { deleted: movementsDeleted.deletedCount }

    // 4. Stock documents
    const docsDeleted = await StockDocument.deleteMany({})
    results.stockDocuments = { deleted: docsDeleted.deletedCount }

    // 5. Audit logs
    const auditDeleted = await AuditLog.deleteMany({})
    results.auditLogs = { deleted: auditDeleted.deletedCount }

    // 6. Uploaded files on disk
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir)
      let deletedFiles = 0
      for (const f of files) {
        const fPath = path.join(uploadsDir, f)
        if (fs.statSync(fPath).isFile()) {
          fs.unlinkSync(fPath)
          deletedFiles++
        }
      }
      results.uploadedFiles = { deleted: deletedFiles }
    } else {
      results.uploadedFiles = { deleted: 0 }
    }

    // Summary
    const totalDeleted =
      (results.orders?.deleted || 0) +
      (results.cadSubmissions?.deleted || 0) +
      (results.standaloneParts?.deleted || 0) +
      (results.stockMovements?.deleted || 0) +
      (results.stockDocuments?.deleted || 0) +
      (results.auditLogs?.deleted || 0) +
      (results.uploadedFiles?.deleted || 0)

    console.log(`  🧹 Reset DB: ${totalDeleted} documents supprimés`)

    res.json({
      success: true,
      message: `${totalDeleted} éléments supprimés. Comptes utilisateurs, articles, fournisseurs et catalogue conservés.`,
      details: results,
      preserved: ['Utilisateurs', 'Articles stock', 'Fournisseurs', 'Catalogue', 'Indexes MongoDB'],
    })
  } catch (err) {
    console.error('  ❌ Reset error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
}
