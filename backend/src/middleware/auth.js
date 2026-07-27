// ─── RMASC FACTORY — Auth Middleware ──────────────────────────────────────
// Accepts JWT from either:
//   1. Authorization: Bearer <token> header (standard)
//   2. ?token=<token> query parameter (for <embed> tags / direct URLs)

import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('  ❌ JWT_SECRET non défini dans les variables d\'environnement.')
  process.exit(1)
}

export function authenticate(req, res, next) {
  // Try Authorization header first (standard)
  const auth = req.headers.authorization
  let token = null
  if (auth?.startsWith('Bearer ')) {
    token = auth.slice(7)
  }
  // Fallback: query parameter ?token=xxx (for <embed> tags, direct links)
  if (!token && req.query?.token) {
    token = req.query.token
  }
  if (!token) return res.status(401).json({ error: 'Authentification requise.' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch { return res.status(401).json({ error: 'Token invalide ou expiré.' }) }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Accès refusé.' })
  next()
}

export function adminGate(req, res, next) {
  authenticate(req, res, () => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès refusé — privilèges administrateur requis.' })
    }
    next()
  })
}
