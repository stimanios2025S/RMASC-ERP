// ═══════════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Vercel Serverless Entry (MongoDB pooled)
//  Caches the Express app & database connection across function invocations.
//  Vercel reuses the warm container — minimizing Atlas connection churn.
// ═══════════════════════════════════════════════════════════════════════════════

// Prevent ESM re-evaluation on hot reloads
import app from '../backend/api.mjs'

// Vercel expects a default export that is the Express app (or any request handler).
// Express apps are already compatible — Vercel calls app(req, res).
export default app
