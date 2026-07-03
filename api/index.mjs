// ─── RMASC FACTORY — Vercel Serverless Entry Point ─────────────────────
// Vercel auto-detects the /api directory and serves this function.
// It wraps the full Express app from backend/api.mjs.
// No need for vercel.json rewrites — /api/* maps here automatically.

import app from '../backend/api.mjs'
export default app
