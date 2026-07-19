// ─── RMASC FACTORY — Auth Middleware ──────────────────────────────────────
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('  ❌ JWT_SECRET non défini dans les variables d\'environnement.')
  process.exit(1)
}

export function authenticate(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentification requise.' })
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET)
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
