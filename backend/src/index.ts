// ─── RMASC FACTORY — Backend API Entry Point (Production Ready) ──────────
// Architecture:
//   1. Starts Express immediately (listens on 0.0.0.0:4000)
//   2. Health endpoint works EVEN if database is down
//   3. Database seeding runs in background — never blocks startup
//   4. Every DB error is caught — server never freezes

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { errorHandler } from './middleware/error.js'
import { prisma, testDatabaseConnection } from './lib/prisma.js'

// ├── Routes
import authRouter from './routes/auth.js'
import ordersRouter from './routes/orders.js'
import bureauEtudeRouter from './routes/bureau-etude.js'
import stockRouter from './routes/stock.js'
import usersRouter from './routes/users.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '4000', 10)

// ══════════════════════════════════════════════════════════════════════════
//  MIDDLEWARE
// ══════════════════════════════════════════════════════════════════════════

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === 'null') return callback(null, true)
    return callback(null, true) // Allow all origins in LAN production
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-RMASC-Source', 'X-RMASC-Target', 'X-RMASC-Delivery'],
}))
app.options('*', cors())
app.use(helmet())
app.use(express.json({ limit: '5mb' }))

// ══════════════════════════════════════════════════════════════════════════
//  HEALTH CHECK — works even without database
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/health', async (_req, res) => {
  const dbStatus = await testDatabaseConnection()
  res.json({
    status: dbStatus.connected ? 'ok' : 'degraded',
    service: 'RMASC ERP API',
    version: '1.0.0',
    database: dbStatus.connected ? 'connected' : 'disconnected',
    databaseLatencyMs: dbStatus.latencyMs,
    databaseError: dbStatus.error || null,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  })
})

// ══════════════════════════════════════════════════════════════════════════
//  STATIC FILES
// ══════════════════════════════════════════════════════════════════════════

const staticOptions = { dotfiles: 'deny', index: false, maxAge: '1h' }
const pdfHeaders = (res: any, filePath: string) => {
  if (filePath.endsWith('.pdf')) { res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', 'inline'); res.setHeader('X-Content-Type-Options', 'nosniff') }
}

const fichesPath = path.resolve(__dirname, '../public/documents/fiches')
app.use('/documents/fiches', express.static(fichesPath, { ...staticOptions, setHeaders: pdfHeaders }))

const stockDocsPath = path.resolve(__dirname, '../public/documents/stock')
app.use('/documents/stock', express.static(stockDocsPath, { ...staticOptions, setHeaders: pdfHeaders }))

const updatesPath = path.resolve(__dirname, '../public/updates')
if (!fs.existsSync(updatesPath)) fs.mkdirSync(updatesPath, { recursive: true })
app.use('/api/updates', express.static(updatesPath, { dotfiles: 'deny', index: false }))

app.get('/api/updates/latest.yml', (_req, res) => {
  const p = path.join(updatesPath, 'latest.yml')
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'No updates' })
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.sendFile(p)
})

app.get('/api/updates/check', (_req, res) => {
  const p = path.join(updatesPath, 'latest.yml')
  if (!fs.existsSync(p)) return res.json({ updateAvailable: false })
  const yml = fs.readFileSync(p, 'utf8')
  const v = yml.match(/^version:\s*(.+)/m)
  res.json({ updateAvailable: true, version: v ? v[1].trim() : 'unknown' })
})

const imagesPath = path.resolve(__dirname, '../public/images')
app.use('/images', express.static(imagesPath, { dotfiles: 'deny', index: false }))

// ══════════════════════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════════════════════

app.use('/api/auth', authRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/bureau-etude', bureauEtudeRouter)
app.use('/api/stock', stockRouter)
app.use('/api/users', usersRouter)

// ══════════════════════════════════════════════════════════════════════════
//  ERROR HANDLER (must be last)
// ══════════════════════════════════════════════════════════════════════════

app.use(errorHandler)

// ══════════════════════════════════════════════════════════════════════════
//  STARTUP — non-blocking, never hangs
// ══════════════════════════════════════════════════════════════════════════

async function startup() {
  // ── Test DB connection and log result ─────────────────────────────────
  const dbTest = await testDatabaseConnection()
  if (dbTest.connected) {
    console.log(`  ✅ Base de données connectée (${dbTest.latencyMs}ms)`)

    // ── Seed default users in background ────────────────────────────────
    seedDefaultUsers().catch(err => console.warn('  ⚠️  Seed ignoré:', err.message))
  } else {
    console.warn(`  ⚠️  Base de données indisponible: ${dbTest.error}`)
    console.warn('  ⚠️  L\'API fonctionne mais les données ne sont pas accessibles.')
    console.warn('  ⚠️  Vérifiez DATABASE_URL dans backend/.env')
  }

  // ── Print server info ────────────────────────────────────────────────
  console.log(`\n  🏢 RMASC FACTORY API — prête sur http://localhost:${PORT}`)
  console.log(`  📡 LAN: http://0.0.0.0:${PORT}`)
  console.log(`  🩺 Health: http://localhost:${PORT}/api/health`)
  console.log(`  🔒 CORS: Toutes origines autorisées\n`)
}

async function seedDefaultUsers() {
  try {
    const count = await prisma.portalUser.count()
    if (count > 0) return
    const defaults = [
      { loginId: 'admin', password: 'admin123', name: 'Totok Michael', role: 'ADMIN', canChangePassword: true },
      { loginId: 'ingenieur1', password: 'ingenieur1', name: 'Karim Bensalem', role: 'INGENIEUR_1', canChangePassword: false },
      { loginId: 'ingenieur2', password: 'ingenieur2', name: 'Yasmine Hamidi', role: 'INGENIEUR_2', canChangePassword: false },
      { loginId: 'verificateur', password: 'verificateur', name: 'Rachid Imane', role: 'VERIFICATEUR', canChangePassword: false },
      { loginId: 'production', password: 'production', name: 'Said Mansouri', role: 'PRODUCTION', canChangePassword: false },
      { loginId: 'magasinier', password: 'magasinier', name: 'Ahmed Benali', role: 'MAGASINIER', canChangePassword: false },
    ]
    for (const u of defaults) await prisma.portalUser.create({ data: u })
    console.log(`  👥 ${defaults.length} utilisateurs par défaut créés`)
  } catch (err: any) {
    console.warn(`  ⚠️  Seed ignoré: ${err.message}`)
  }
}

// ─── START THE SERVER IMMEDIATELY (never blocks on DB) ────────────────────
app.listen(PORT, '0.0.0.0', () => {
  startup()
})

export default app
