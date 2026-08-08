// ─── RMASC FACTORY — Health Controller ──────────────────────────────────
import { testDBConnection } from '../lib/mongoose.js'

const APP_VERSION = '2.6.2'

// Cache the DB ping result for 5s — /api/health is polled often (deploy
// script, load balancers) and each call used to do a real MongoDB ping().
let cachedResult = null
let cacheExpires = 0

export async function healthCheck(_req, res) {
  const now = Date.now()
  if (!cachedResult || now > cacheExpires) {
    const dbStatus = await testDBConnection()
    cachedResult = {
      status: dbStatus.connected ? 'ok' : 'degraded',
      service: 'RMASC ERP (MongoDB)',
      database: dbStatus.connected ? 'connected' : 'disconnected',
      databaseLatencyMs: dbStatus.latencyMs,
      databaseError: dbStatus.error || null,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    }
    cacheExpires = now + 5000
  }
  res.json(cachedResult)
}

export async function versionCheck(_req, res) {
  res.json({
    version: APP_VERSION,
    build: new Date().toISOString(),
    service: 'RMASC ERP Backend',
  })
}
