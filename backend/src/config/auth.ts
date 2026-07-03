// ─── Auth Configuration ────────────────────────────────────────────────────
// All values loaded from environment variables; defaults provided for local
// development ONLY. In production, every value MUST be set explicitly via env.
//
// NETWORK TOPOLOGY:
//   RMASC backend (this host) ──direct POST──▶ 192.168.0.189:30000
//                                             (Bureau d'étude #1 Electron app)
//   NO cloud proxies. NO external gateways. NO public storage.

export const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.NODE_ENV === 'production' ? '8h' : '365d',

  // Pre-shared API key — sent as X-API-Key header in every sync request
  // so the Electron app can verify the origin.
  webhookApiKey: process.env.WEBHOOK_API_KEY || 'rmasc-webhook-shared-secret',

  // ── Bureau d'étude #1 — Direct local-network target ──────────────────
  // The single authoritative address for the colleague's Electron desktop app.
  // Resolution order: ELECTRON_APP_URL → ELECTRON_SOFTWARE_URL → hardwired fallback.
  //
  // Machine : 192.168.0.189
  // Port    : 30000
  // Endpoint: /api/integration/receiver
  electronSoftwareUrl:
    process.env.ELECTRON_APP_URL ||
    process.env.ELECTRON_SOFTWARE_URL ||
    'http://192.168.0.189:30000/api/integration/receiver',

  // ── CAD approval stamp signing ───────────────────────────────────────
  stampHmacKey: process.env.STAMP_HMAC_KEY || 'rmasc-stamp-signing-key-v1',
} as const
