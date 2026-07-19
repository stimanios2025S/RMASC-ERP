// ─── RMASC FACTORY — Audit Log Controller ───────────────────────────────
import AuditLog from '../models/AuditLog.js'

// GET /api/admin/audit-logs
export async function getAuditLogs(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50))
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.action) filter.action = req.query.action
    if (req.query.userId) filter.userId = req.query.userId
    if (req.query.resource) filter.resource = req.query.resource
    if (req.query.days) {
      const since = new Date()
      since.setDate(since.getDate() - parseInt(req.query.days))
      filter.createdAt = { $gte: since }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ])

    // Ajouter id depuis _id
    const items = logs.map(l => ({ ...l, id: l._id?.toString() }))

    res.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// GET /api/admin/audit-logs/actions — Liste des actions disponibles
export async function getAuditActions(_req, res) {
  try {
    const actions = await AuditLog.distinct('action')
    res.json(actions.sort())
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ─── Fonction utilitaire pour créer un log ──────────────────────────────
export async function createAuditLog({
  action, resource, resourceId, userId, userName, details, ip, userAgent, statusCode, duration,
}) {
  try {
    await AuditLog.create({ action, resource, resourceId, userId, userName, details, ip, userAgent, statusCode, duration })
  } catch (err) {
    console.error('[AUDIT] Erreur écriture log:', err.message)
  }
}
