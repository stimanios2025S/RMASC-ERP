// ─── RMASC FACTORY — Rate Limiting Middleware ────────────────────────────
// Protège les endpoints d'auth contre le brute-force.
// Utilise express-rate-limit (npm) si installé, sinon fallback mémoire simple.

let rateLimitLogin = (_req, _res, next) => next()

// Tentative de chargement dynamique de express-rate-limit
try {
  // Note: en module ESM, on utilise createRequire ou dynamic import
  // Si le package est installé, il sera utilisé
  const { default: rateLimit } = await import('express-rate-limit').catch(() => ({ default: null }))
  if (rateLimit) {
    rateLimitLogin = rateLimit({
      windowMs: 60_000,
      max: 5,
      message: { error: 'Trop de tentatives. Réessayez dans 60 secondes.' },
      standardHeaders: true,
      legacyHeaders: false,
    })
  } else {
    throw new Error('not found')
  }
} catch {
  // Fallback: rate limiter manuel en mémoire
  const store = new Map()
  rateLimitLogin = (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown'
    const now = Date.now()
    let data = store.get(ip)
    if (!data || now - data.windowStart > 60_000) {
      data = { windowStart: now, count: 0 }
      store.set(ip, data)
    }
    data.count++
    if (data.count > 5) {
      const retryAfter = Math.ceil((60_000 - (now - data.windowStart)) / 1000)
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${retryAfter} secondes.` })
    }
    next()
  }
  // Nettoyage des entrées périmées toutes les 5 minutes
  setInterval(() => {
    const now = Date.now()
    for (const [ip, data] of store) {
      if (now - data.windowStart > 120_000) store.delete(ip)
    }
  }, 300_000)
}

export { rateLimitLogin }
