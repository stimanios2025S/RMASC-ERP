// ─── RMASC FACTORY — Backend Entry Point ───────────────────────────────
// Starts Express as a permanent server on port 4000.
// Served via Cloudflare Tunnel → https://sarl-rmasc.com

import './lib/load-env.js'
import app from '../api.mjs'
import { connectDB } from './lib/mongoose.js'

const PORT = parseInt(process.env.PORT || '4000', 10)

// ─── Global crash handlers (prevents PM2 infinite restart loop) ──────────
process.on('uncaughtException', (err) => {
  console.error('  ❌ [UNCAUGHT EXCEPTION]', err.message)
  console.error(err.stack)
})

process.on('unhandledRejection', (reason) => {
  console.error('  ❌ [UNHANDLED REJECTION]', reason)
})

async function startup() {
  console.log(`\n  🏢 RMASC FACTORY — Démarrage...\n`)

  // Connect to MongoDB
  try {
    await connectDB()
    console.log(`  ✅ MongoDB prête`)
  } catch (err) {
    console.warn(`  ⚠️  MongoDB indisponible: ${err.message}`)
    console.warn(`  ⚠️  Vérifiez MONGODB_URI dans backend/.env`)
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🚀 API: http://localhost:${PORT}/api/health`)
    console.log(`  🔒 CORS: Toutes origines autorisées\n`)
  })
}

startup().catch(err => {
  console.error('❌ Erreur fatale:', err.message)
  // Do NOT process.exit(1) — that causes PM2 infinite restart loop.
  // API stays up via lazy DB retry middleware in api.mjs.
})
