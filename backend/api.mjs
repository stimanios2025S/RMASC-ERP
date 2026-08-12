// ─── RMASC FACTORY — Backend API (Production Server) ───────────────────
// Express + Mongoose + Multer. Served via Cloudflare Tunnel → sarl-rmasc.com

import './src/lib/load-env.js'

import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import multer from 'multer'
import helmet from 'helmet'
import compression from 'compression'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { connectDB, testDBConnection } from './src/lib/mongoose.js'
import { authenticate, requireAdmin } from './src/middleware/auth.js'
import { rateLimitLogin, rateLimitApi } from './src/middleware/rateLimit.js'
import { auditMiddleware } from './src/middleware/audit.js'
import { healthCheck, versionCheck } from './src/controllers/health.js'
import {
  login, seedUsers, fixPasswords, resetAndReseed, seedAdmins,
  listUsers, updateUserName, changeAdminCredentials, changeUserPassword,
  ensureProduction2, ensureProduction2User, rotateCredentials,
} from './src/controllers/users.js'
import {
  listOrders, getOrder, getOrderDatasheet, createOrder, updateOrderStatus,
  updateProductionPhase, uploadFile, listFiles, downloadFile, deleteFile,
  searchArchives, getOrderArchive, approvePlan, restampOrder, rejectPlan,
  refuseVerification, markDelivery, confirmDelivery, updateOrder, deleteOrder, deleteAllOrders, exportOrders,
} from './src/controllers/orders.js'
import {
  listItems, createItem, getItem, updateItem, deleteItem, uploadItemImage,
  listSuppliers, createSupplier, getSupplier, updateSupplier, deleteSupplier,
  listMovements, createMovement, listDocuments, createDocument, getDocument,
  createBonCommande, getStockStats,
} from './src/controllers/stock.js'
import {
  listCatalog, getCatalogCategory, seedCatalog, updateCatalogCategory,
  addCatalogItem, deleteCatalogItem,
} from './src/controllers/catalog.js'
import {
  createPart, listActiveParts, listAllParts, updatePartStatus, deletePart,
} from './src/controllers/parts.js'
import {
  createLaserFile, listLaserFiles, getLaserFile, approveLaserFile,
  replaceLaserFile, deleteLaserFile,
} from './src/controllers/laserFiles.js'
import { sendWhatsApp } from './src/controllers/notifications.js'
import { subscribe, sendEvent, issueSSEToken } from './src/controllers/realtime.js'
import { getAuditLogs, getAuditActions } from './src/controllers/audit.js'
import {
  getDashboardStats, getOrderMetrics, getStockKPIs, getInvoicingStats, getEngineerStats, getOrderTrends,
} from './src/controllers/stats.js'
import { loadOrder, validateStatusTransition } from './src/middleware/statusValidation.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ─── JWT_SECRET validation ───────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('  ❌ JWT_SECRET non défini dans les variables d\'environnement.')
  process.exit(1)
}

// ═══ MIDDLEWARE ═════════════════════════════════════════════════════════
app.set('trust proxy', 1)
app.use(compression({ threshold: 512, level: 6 }))
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }))
app.use(cors({ origin: ['https://sarl-rmasc.com', 'https://erp.rmasc-dz.com', 'https://192.168.1.95', 'http://192.168.1.95', 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:4000', 'http://localhost:4001'], credentials: true }))
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))
app.use(auditMiddleware)
app.use('/api', rateLimitApi)

// ─── No-cache headers for ALL API responses (prevents Cloudflare/browser cache desync) ──
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Surrogate-Control', 'no-store')
  next()
})

// ─── Request timeout (20s) — SSE EXCLUDED (long-lived stream) ────────────
// Les connexions SSE (/api/realtime/subscribe) restent ouvertes indéfiniment
// (temps réel). Un timeout ici tenterait d'écrire une réponse APRÈS les headers
// SSE déjà envoyés → ERR_HTTP_HEADERS_SENT en boucle → étouffe le backend
// → Cloudflare Tunnel ne reçoit plus de réponse → 502 Bad Gateway.
app.use((req, res, next) => {
  if (req.path === '/api/realtime/subscribe' || req.headers.accept === 'text/event-stream') return next()
  res.setTimeout(20000, () => {
    console.warn(`  ⏰ Timeout: ${req.method} ${req.path}`)
    if (res.headersSent) return res.end() // sécurité: ne jamais réécrire après envoi
    res.status(504).json({ error: 'La requête a expiré. Veuillez réessayer.' })
  })
  next()
})

// ═══ MULTER CONFIG ═════════════════════════════════════════════════════
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const MULTER_MAX_SIZE_MB = parseInt(process.env.UPLOADS_MAX_SIZE_MB || '50', 10)
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/vnd.dxf', 'image/vnd.dwg', 'image/svg+xml', 'application/dwg', 'application/x-dwg', 'application/octet-stream', 'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/msword', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, unique + path.extname(safeName) || '')
  },
})
const upload = multer({ storage, limits: { fileSize: MULTER_MAX_SIZE_MB * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  ALLOWED_MIME_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new Error(`Type non autorisé: ${file.mimetype}`))
}})

// ═══ LAZY DB CONNECTION ════════════════════════════════════════════════
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try { await connectDB() } catch {
      if (req.path === '/api/health') return next()
      return res.status(503).json({ error: 'Base de données indisponible.' })
    }
  }
  next()
})

// ═══ ROUTES ════════════════════════════════════════════════════════════

// Health
app.get('/api/health', healthCheck)
app.get('/api/version', versionCheck)

// Users
app.post('/api/users/login', rateLimitLogin, login)
app.post('/api/users/seed', authenticate, requireAdmin, seedUsers)
app.post('/api/users/fix-passwords', authenticate, requireAdmin, fixPasswords)
app.post('/api/users/reset-and-reseed', authenticate, requireAdmin, resetAndReseed)
app.post('/api/users/seed-admins', authenticate, requireAdmin, seedAdmins)
app.post('/api/users/ensure-production2', authenticate, requireAdmin, ensureProduction2)
app.get('/api/users', authenticate, listUsers)
app.patch('/api/users/:id/name', authenticate, updateUserName)
app.put('/api/users/admin', authenticate, requireAdmin, changeAdminCredentials)
app.patch('/api/users/:id/password', authenticate, requireAdmin, changeUserPassword)

// Orders
app.get('/api/orders', authenticate, listOrders)
app.get('/api/orders/archives', authenticate, searchArchives)
app.get('/api/orders/:id', authenticate, getOrder)
app.get('/api/orders/:id/datasheet', authenticate, getOrderDatasheet)
app.get('/api/orders/:id/archive', authenticate, getOrderArchive)
app.get('/api/orders/:id/files', authenticate, listFiles)
app.get('/api/orders/:id/files/:fileId', authenticate, downloadFile)
app.post('/api/orders/create-and-sync', authenticate, createOrder)
app.patch('/api/orders/:id', authenticate, requireAdmin, updateOrder)
app.patch('/api/orders/:id/status', authenticate, loadOrder, validateStatusTransition, updateOrderStatus)
app.patch('/api/orders/:id/production-phase', authenticate, updateProductionPhase)
app.post('/api/orders/:id/upload', authenticate, upload.single('file'), uploadFile)
app.delete('/api/orders/:id/files/:fileId', authenticate, deleteFile)
app.post('/api/orders/:id/approve-plan', authenticate, requireAdmin, loadOrder, approvePlan)
app.post('/api/orders/:id/reject-plan', authenticate, requireAdmin, loadOrder, rejectPlan)
app.post('/api/orders/:id/refuse-verification', authenticate, loadOrder, refuseVerification) // Vérificateur/Admin — motif obligatoire
app.post('/api/orders/:id/restamp', authenticate, requireAdmin, restampOrder)
app.post('/api/orders/:id/mark-delivery', authenticate, loadOrder, markDelivery)
app.post('/api/orders/:id/confirm-delivery', authenticate, requireAdmin, loadOrder, confirmDelivery)
app.delete('/api/orders/admin/cleanup-all', authenticate, requireAdmin, deleteAllOrders)
app.delete('/api/orders/:id', authenticate, requireAdmin, deleteOrder)
app.get('/api/orders/export/csv', authenticate, exportOrders)

// Stock — Items
app.get('/api/stock/items', authenticate, listItems)
app.post('/api/stock/items', authenticate, createItem)
app.get('/api/stock/items/:id', authenticate, getItem)
app.patch('/api/stock/items/:id', authenticate, updateItem)
app.delete('/api/stock/items/:id', authenticate, deleteItem)
app.post('/api/stock/items/:id/image', authenticate, uploadItemImage)

// Stock — Suppliers
app.get('/api/stock/suppliers', authenticate, listSuppliers)
app.post('/api/stock/suppliers', authenticate, createSupplier)
app.get('/api/stock/suppliers/:id', authenticate, getSupplier)
app.patch('/api/stock/suppliers/:id', authenticate, updateSupplier)
app.delete('/api/stock/suppliers/:id', authenticate, deleteSupplier)

// Stock — Movements
app.get('/api/stock/movements', authenticate, listMovements)
app.post('/api/stock/movements', authenticate, createMovement)

// Stock — Documents
app.get('/api/stock/documents', authenticate, listDocuments)
app.post('/api/stock/documents', authenticate, createDocument)
app.get('/api/stock/documents/:id', authenticate, getDocument)
app.post('/api/stock/bon-commande', authenticate, createBonCommande)

// Stock — Stats
app.get('/api/stock/stats', authenticate, getStockStats)

// Catalog
app.get('/api/catalog', authenticate, listCatalog)
app.get('/api/catalog/:category', authenticate, getCatalogCategory)
app.post('/api/catalog/seed', authenticate, requireAdmin, seedCatalog)
app.put('/api/catalog/:category', authenticate, requireAdmin, updateCatalogCategory)
app.post('/api/catalog/:category/items', authenticate, requireAdmin, addCatalogItem)
app.delete('/api/catalog/:category/items/:value', authenticate, requireAdmin, deleteCatalogItem)

// Standalone Parts
app.post('/api/standalone-parts/create', authenticate, upload.single('cadFile'), createPart)
app.get('/api/standalone-parts/active', authenticate, listActiveParts)
app.get('/api/standalone-parts/all', authenticate, listAllParts)
app.patch('/api/standalone-parts/:id/status', authenticate, updatePartStatus)
app.delete('/api/standalone-parts/:id', authenticate, deletePart)

// Laser Files — Technical File Management & Digital Stamping
app.post('/api/laser-files/create', authenticate, upload.single('pdfFile'), createLaserFile)
app.get('/api/laser-files', authenticate, listLaserFiles)
app.get('/api/laser-files/:id', authenticate, getLaserFile)
app.post('/api/laser-files/:id/approve', authenticate, approveLaserFile)
app.post('/api/laser-files/:id/replace', authenticate, upload.single('pdfFile'), replaceLaserFile)
app.delete('/api/laser-files/:id', authenticate, deleteLaserFile)

// ═══ Serve uploaded files (for standalone parts CAD files) ═══════════════
app.get('/api/uploads/:filename', authenticate, (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier introuvable.' })
  }
  // ETag + 1h cache so repeat downloads don't re-transfer the whole file
  const stat = fs.statSync(filePath)
  const etag = `"${stat.mtimeMs}-${stat.size}"`
  if (req.headers['if-none-match'] === etag) return res.status(304).end()
  res.setHeader('ETag', etag)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`)
  res.sendFile(filePath)
})
app.post('/api/notifications/whatsapp', authenticate, sendWhatsApp)

// Real-time SSE
app.get('/api/realtime/subscribe', authenticate, subscribe)
app.post('/api/realtime/broadcast', authenticate, requireAdmin, sendEvent)
app.post('/api/realtime/token', authenticate, issueSSEToken) // short-lived SSE token (15 min)

// Audit Logs (admin only)
app.get('/api/admin/audit-logs', authenticate, requireAdmin, getAuditLogs)
app.get('/api/admin/audit-logs/actions', authenticate, requireAdmin, getAuditActions)

// ═══ STATS (live aggregation pipelines) ════════════════════════════════════
app.get('/api/stats/dashboard', authenticate, getDashboardStats)
app.get('/api/stats/orders', authenticate, getOrderMetrics)
app.get('/api/stats/stock', authenticate, getStockKPIs)
app.get('/api/stats/invoicing', authenticate, getInvoicingStats)
app.get('/api/stats/engineer', authenticate, getEngineerStats)
app.get('/api/stats/trends', authenticate, getOrderTrends)

// ═══ VAULT FILES (backend-persisted) ═══════════════════════════════════════
app.get('/api/vault/files', authenticate, async (req, res) => {
  try {
    const filter = {}
    if (req.query.orderId) filter.order = req.query.orderId
    const submissions = await (await import('./src/models/CAD_Submission.js')).default
      .find(filter).populate('order', 'serialNumber clientName').sort({ createdAt: -1 }).lean()
    res.json(submissions.map(s => ({
      id: s._id.toString(),
      orderId: s.order?._id?.toString(),
      orderSerial: s.order?.serialNumber,
      orderClient: s.order?.clientName,
      engineeringType: s.engineeringType,
      engineerName: s.engineerName,
      fileMimeType: s.fileMimeType,
      fileSizeBytes: s.fileSizeBytes,
      status: s.status,
      createdAt: s.createdAt,
      approvedAt: s.approvedAt,
      approvedBy: s.approvedBy,
    })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══ SERVE FRONTEND BUILD (dist/) ═══════════════════════════════════════
const distPath = path.resolve(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  // sw.js MUST NEVER be cached — otherwise service worker updates break
  app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('Surrogate-Control', 'no-store')
    res.sendFile(path.join(distPath, 'sw.js'))
  })

  // Static assets with fingerprint hash: cache forever (immutable)
  // Everything else (HTML, non-fingerprinted): no cache
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.includes('/assets/') && /[a-fA-F0-9]{8,}/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else {
        res.setHeader('Cache-Control', 'no-store, must-revalidate, private')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
      }
    }
  }))

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Route API introuvable.' })
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// ═══ SENTRY ERROR REPORTING ═══════════════════════════════════════════
const SENTRY_DSN = process.env.SENTRY_DSN || 'https://1d656a08e00f5e785cf080aa537baebb@o4511808265977856.ingest.de.sentry.io/4511812636704848'

function reportToSentry(error, req = {}) {
  if (!SENTRY_DSN) return
  const dsnUrl = new URL(SENTRY_DSN)
  const sentryUrl = `${dsnUrl.protocol}//${dsnUrl.host}/api/${dsnUrl.pathname.split('/').pop()}/envelope/`

  const envelope = JSON.stringify({
    event_id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    sent_at: new Date().toISOString(),
    sdk: { name: 'rmasc-erp', version: '1.0.0' },
    dsn: SENTRY_DSN,
  }) + '\n' + JSON.stringify({ type: 'event' }) + '\n' + JSON.stringify({
    event_id: Date.now().toString(36),
    timestamp: new Date().toISOString(),
    level: 'error',
    platform: 'node',
    server_name: process.env.HOSTNAME || 'rmasc-server',
    environment: process.env.NODE_ENV || 'production',
    exception: {
      values: [{ type: error.name || 'Error', value: error.message || 'Unknown error', stacktrace: { frames: (error.stack || '').split('\n').map(line => ({ filename: line })) } }],
    },
    request: {
      url: req.originalUrl || req.url || '',
      method: req.method || 'GET',
      headers: req.headers || {},
    },
  }) + '\n'

  fetch(sentryUrl, { method: 'POST', body: envelope, headers: { 'Content-Type': 'application/x-sentry-envelope' } })
    .then(r => { if (!r.ok) console.warn('  ⚠️  Sentry report failed'); else console.log('  📤 Error sent to Sentry') })
    .catch(() => {})
}

// ═══ ERROR HANDLER ═════════════════════════════════════════════════════
app.use((err, _req, res, _next) => {
  console.error(`[API ERROR] ${err.message || 'Erreur interne'}`)
  reportToSentry(err, _req)
  if (res.headersSent) return res.end() // réponse déjà partie (ex: SSE) → fermer proprement, pas de 2e envoi
  res.status(err.statusCode || 500).json({ error: err.message || 'Erreur interne.' })
})

// ═══ STARTUP ═══════════════════════════════════════════════════════════
const PORT = parseInt(process.env.PORT || '4000', 10)

async function start() {
  try {
    const { connectDB } = await import('./src/lib/mongoose.js')
    await connectDB()
    console.log(`  ✅ MongoDB connectée`)
    // Rotation des identifiants (v2.8.0) : 1ère exécution = FORCÉE pour tous
    // les comptes (corrige le bug où seuls les MDP encore par défaut passaient),
    // puis seuls les comptes restés sur un ancien défaut sont rotés.
    try {
      const { created, rotated, kept, forceAll } = await rotateCredentials()
      console.log(`  🔐 Identifiants: ${forceAll ? 'ROTATION FORCÉE (tous les comptes)' : 'rotation incrémentale'} — ${rotated} roté(s), ${created} créé(s), ${kept} inchangé(s)`)
      console.log(`     👉 Utilisez les NOUVEAUX identifiants (voir la liste fournie par l'administrateur)`)
    } catch (e) { console.warn(`  ⚠️  Rotation des identifiants: ${e.message}`) }
  } catch (err) {
    console.warn(`  ⚠️  MongoDB: ${err.message}`)
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ╔══════════════════════════════════════════════╗`)
    console.log(`  ║    🏢 RMASC FACTORY — Backend API            ║`)
    console.log(`  ╠══════════════════════════════════════════════╣`)
    console.log(`  ║  🚀  http://localhost:${PORT}/api/health         ║`)
    console.log(`  ║  🔒  CORS: sarl-rmasc.com + localhost        ║`)
    console.log(`  ╚══════════════════════════════════════════════╝\n`)
  })

  const shutdown = async (signal) => {
    console.log(`\n  🛑 Signal ${signal} reçu — Arrêt gracieux...`)
    server.close(async () => {
      try {
        const { disconnectDB } = await import('./src/lib/mongoose.js')
        await disconnectDB()
      } catch {}
      console.log(`  ✅ Arrêt terminé`)
      process.exit(0)
    })
    setTimeout(() => { console.error(`  ❌ Arrêt forcé après 10s`); process.exit(1) }, 10000)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('uncaughtException', (err) => {
    console.error(`  ❌ Erreur non gérée: ${err.message}`)
    console.error(err.stack)
    reportToSentry(err)
  })
  process.on('unhandledRejection', (reason) => {
    console.error(`  ❌ Promise rejetée non gérée:`, reason)
    reportToSentry(reason instanceof Error ? reason : new Error(String(reason)))
  })
}

const isMainModule = process.argv[1] && (process.argv[1].includes('api.mjs') || process.argv[1].includes('api'))
if (isMainModule) start()

export default app
