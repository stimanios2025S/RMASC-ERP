// ─── Authentication & Authorization Middleware ─────────────────────────────
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AUTH_CONFIG } from '../config/auth.js'
import type { JwtPayload } from '../types/index.js'

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

// ─── Verify JWT token — required for all protected routes ──────────────────
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentification requise. Token manquant.' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, AUTH_CONFIG.jwtSecret) as JwtPayload
    req.user = payload
    next()
  } catch (verifyErr) {
    // Log the exact reason so we can diagnose: expiry, wrong secret, malformed.
    const reason = verifyErr instanceof Error ? verifyErr.message : String(verifyErr)
    console.warn(`[AUTH] ⚠️  Token rejeté: ${reason} (${token.slice(0, 20)}...)`)
    res.status(401).json({ error: 'Token invalide ou expiré.' })
  }
}

// ─── Role guard — restricts to ADMIN only ──────────────────────────────────
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Accès refusé. Privilèges administrateur requis.' })
    return
  }
  next()
}

// ─── API Key guard — for the external engineering platform webhook ─────────
export function requireWebhookKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key']
  if (!apiKey || apiKey !== AUTH_CONFIG.webhookApiKey) {
    res.status(403).json({ error: 'Clé API webhook invalide.' })
    return
  }
  next()
}
