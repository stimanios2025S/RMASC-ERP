// ─── RMASC FACTORY — Rate Limiting Middleware ────────────────────────────
// Protège les endpoints d'auth contre le brute-force.
// Utilise express-rate-limit si installé, sinon fallback mémoire simple.

import rateLimit from 'express-rate-limit'

// ─── Login rate limiter: 5 tentatives par minute ────────────────────────
export const rateLimitLogin = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { error: 'Trop de tentatives. Réessayez dans 60 secondes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection?.remoteAddress || 'unknown'
  },
})

// ─── API générale rate limiter: 200 requêtes par minute ─────────────────
export const rateLimitApi = rateLimit({
  windowMs: 60_000,
  max: 200,
  message: { error: 'Trop de requêtes. Réessayez dans 60 secondes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
