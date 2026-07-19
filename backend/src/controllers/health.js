// ─── RMASC FACTORY — Health Controller ──────────────────────────────────
import { testDBConnection } from '../lib/mongoose.js'

export async function healthCheck(_req, res) {
  const dbStatus = await testDBConnection()
  res.json({
    status: dbStatus.connected ? 'ok' : 'degraded',
    service: 'RMASC ERP (MongoDB)',
    database: dbStatus.connected ? 'connected' : 'disconnected',
    databaseLatencyMs: dbStatus.latencyMs,
    databaseError: dbStatus.error || null,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  })
}
