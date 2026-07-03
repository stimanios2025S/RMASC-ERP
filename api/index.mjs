// ─── RMASC FACTORY — Vercel Serverless Entry Point ─────────────────────
// This file is the single entry point for all /api/* requests on Vercel.
// It imports the full Express application from backend/api.mjs
// and exports it as a serverless function handler.
//
// Vercel auto-detects the /api/ directory — no vercel.json rewrites needed.

import app from '../backend/api.mjs'
export default app
