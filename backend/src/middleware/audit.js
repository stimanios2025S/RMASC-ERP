// ─── RMASC FACTORY — Audit Logging Middleware ────────────────────────────
// Enregistre chaque action importante dans MongoDB + console.

import { createAuditLog } from '../controllers/audit.js'

const AUDIT_ENABLED = process.env.NODE_ENV !== 'test'

// ─── Middleware Express — journalise automatique chaque requête ──────────
export function auditMiddleware(req, res, next) {
  const start = Date.now()

  const originalJson = res.json.bind(res)
  res.json = function (body) {
    const duration = Date.now() - start

    if (req.method !== 'GET' && res.statusCode < 500 && AUDIT_ENABLED) {
      const action = `${req.method} ${req.path.split('/').slice(0, 4).join('/')}`
      const resource = req.path.split('/')[2] || 'unknown'

      createAuditLog({
        action,
        resource,
        resourceId: req.params?.id || '',
        userId: req.user?.userId || 'anonymous',
        userName: req.user?.name || 'Anonyme',
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
        },
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        statusCode: res.statusCode,
        duration,
      }).catch(() => {})
    }

    return originalJson(body)
  }

  next()
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body
  const cleaned = { ...body }
  delete cleaned.password
  delete cleaned.newPassword
  delete cleaned.currentPassword
  delete cleaned.token
  return cleaned
}
