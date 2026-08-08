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
})

// ─── API générale rate limiter: 1000 requêtes par minute ────────────────
// 1000/min avoids false blocks with multiple open tabs polling + SSE.
export const rateLimitApi = rateLimit({
  windowMs: 60_000,
  max: 1000,
  message: { error: 'Trop de requêtes. Réessayez dans 60 secondes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
