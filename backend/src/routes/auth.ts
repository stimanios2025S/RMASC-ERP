// ─── Auth Routes ────────────────────────────────────────────────────────────
// JWT authentication for the RMASC desktop application.
// Since this is a local desktop app with its own backend, we use a simple
// dev-login that always works. No external auth provider needed.

import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { AUTH_CONFIG } from '../config/auth.js'

const router = Router()

// POST /api/auth/dev-login
// Returns a signed JWT. Always available — this is a local desktop application
// where the backend and frontend run on the same machine. No OAuth needed.
router.post('/dev-login', (_req, res) => {
  const token = jwt.sign(
    { sub: 'admin-001', role: 'ADMIN' },
    AUTH_CONFIG.jwtSecret,
    { expiresIn: AUTH_CONFIG.jwtExpiresIn },
  )

  res.json({
    token,
    user: { id: 'admin-001', name: 'Totok Michael', role: 'ADMIN' },
  })
})

export default router
