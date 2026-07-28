// ─── RMASC FACTORY — Health Controller ──────────────────────────────────
import { testDBConnection } from '../lib/mongoose.js'

const APP_VERSION = '2.6.2'

export async function healthCheck(_req, res) {
  const dbStatus = await testDBConnection()
  res.json({
    status: dbStatus.connected ? 'ok' : 'degraded',
    service: 'RMASC ERP (MongoDB)',
    database: dbStatus.connected ? 'connected' : 'disconnected',
    databaseLatencyMs: dbStatus.latencyMs,
    databaseError: dbStatus.error || null,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  })
}

export async function versionCheck(_req, res) {
  res.json({
    version: APP_VERSION,
    build: new Date().toISOString(),
    service: 'RMASC ERP Backend',
  })
}
