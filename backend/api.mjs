// ─── RMASC FACTORY — Backend API (Production Server) ───────────────────
// Express + Mongoose + Multer. Served via Cloudflare Tunnel → sarl-rmasc.com

import './src/lib/load-env.js'

import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import multer from 'multer'
import helmet from 'helmet'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { connectDB, testDBConnection } from './src/lib/mongoose.js'
import { authenticate, requireAdmin } from './src/middleware/auth.js'
import { rateLimitLogin } from './src/middleware/rateLimit.js'
import { auditMiddleware } from './src/middleware/audit.js'
import { healthCheck } from './src/controllers/health.js'
import {
  login, seedUsers, fixPasswords, resetAndReseed, seedAdmins,
  listUsers, updateUserName, changeAdminCredentials, changeUserPassword,
} from './src/controllers/users.js'
import {
  listOrders, getOrder, getOrderDatasheet, createOrder, updateOrderStatus,
  updateProductionPhase, uploadFile, listFiles, downloadFile, deleteFile,
  searchArchives, getOrderArchive, approvePlan, restampOrder, rejectPlan,
  markDelivery, confirmDelivery, updateOrder, deleteOrder,
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
  createPart, listActiveParts, listAllParts, updatePartStatus,
} from './src/controllers/parts.js'
import { sendWhatsApp } from './src/controllers/notifications.js'
import { subscribe, sendEvent } from './src/controllers/realtime.js'
import { getAuditLogs, getAuditActions } from './src/controllers/audit.js'
import { resetAllData } from './src/controllers/reset.js'

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
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }))
app.use(cors({ origin: ['https://sarl-rmasc.com', 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:4000', 'http://localhost:4001'], credentials: true }))
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))
app.use(auditMiddleware)

// ─── Serve static files (SPA frontend) ────────────────────────────────────
// Cherche le dossier dist dans l'ordre
let SPA_DIR = null
const CANDIDATES = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', '..', 'rmasc-dashboard'),
  path.join('/home/sarlrmasc', 'rmasc-dashboard'),
  path.join('/home/sarlrmasc', 'rmasc-erp', 'dist'),
]
for (const dir of CANDIDATES) {
  const indexFile = path.join(dir, 'index.html')
  if (fs.existsSync(dir) && fs.existsSync(indexFile)) {
    console.log(`  📁 Frontend statique: ${dir}`)
    SPA_DIR = dir
    break
  }
}
if (!SPA_DIR) {
  console.warn(`  ⚠️  Aucun dossier frontend trouvé (dist ou rmasc-dashboard)`)
}

// ─── SPA middleware (tout ce qui n'est pas /api/ ou /uploads/ sert index.html) ──
// Ce middleware doit être placé APRÈS toutes les routes API
// mais AVANT le error handler

// ─── Request timeout (30s) ──────────────────────────────────────────────
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    console.warn(`  ⏰ Timeout: ${req.method} ${req.path}`)
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

// ═══ SERVE UPLOADS (auth-gated) ════════════════════════════════════════
app.use('/uploads', authenticate, express.static(UPLOADS_DIR))

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

// Users
app.post('/api/users/login', rateLimitLogin, login)
app.post('/api/users/seed', authenticate, requireAdmin, seedUsers)
app.post('/api/users/fix-passwords', authenticate, requireAdmin, fixPasswords)
app.post('/api/users/reset-and-reseed', authenticate, requireAdmin, resetAndReseed)
app.post('/api/users/seed-admins', authenticate, requireAdmin, seedAdmins)
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
app.patch('/api/orders/:id/status', authenticate, updateOrderStatus)
app.patch('/api/orders/:id/production-phase', authenticate, updateProductionPhase)
app.post('/api/orders/:id/upload', authenticate, upload.single('file'), uploadFile)
app.delete('/api/orders/:id/files/:fileId', authenticate, deleteFile)
app.post('/api/orders/:id/approve-plan', authenticate, requireAdmin, approvePlan)
app.post('/api/orders/:id/reject-plan', authenticate, requireAdmin, rejectPlan)
app.post('/api/orders/:id/restamp', authenticate, requireAdmin, restampOrder)
app.post('/api/orders/:id/mark-delivery', authenticate, markDelivery)
app.post('/api/orders/:id/confirm-delivery', authenticate, requireAdmin, confirmDelivery)
app.delete('/api/orders/:id', authenticate, requireAdmin, deleteOrder)

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

// Notifications
app.post('/api/notifications/whatsapp', authenticate, sendWhatsApp)

// Real-time SSE
app.get('/api/realtime/subscribe', authenticate, subscribe)
app.post('/api/realtime/broadcast', authenticate, requireAdmin, sendEvent)

// Audit Logs (admin only)
app.get('/api/admin/audit-logs', authenticate, requireAdmin, getAuditLogs)
app.get('/api/admin/audit-logs/actions', authenticate, requireAdmin, getAuditActions)

// ═══ DATA RESET (admin only) ═══════════════════════════════════════════
app.post('/api/admin/reset-data', authenticate, requireAdmin, resetAllData)

// ═══ SPA FALLBACK — sert le frontend React ═══════════════════════════════
// Toute requête non-API sera servie par index.html (SPA routing)
if (SPA_DIR) {
  // 1. Servir les fichiers statiques (CSS, JS, images)
  app.use(express.static(SPA_DIR, { index: 'index.html' }))
  // 2. Fallback SPA — toutes les autres routes → index.html
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    if (req.path.startsWith('/uploads/')) return next()
    res.sendFile(path.join(SPA_DIR, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
  console.log(`  🏠 SPA prêt — toutes les routes non-API servent index.html`)
}

// ═══ ERROR HANDLER ═════════════════════════════════════════════════════
app.use((err, _req, res, _next) => {
  console.error(`[API ERROR] ${err.message || 'Erreur interne'}`)
  res.status(err.statusCode || 500).json({ error: err.message || 'Erreur interne.' })
})

// ═══ STARTUP ═══════════════════════════════════════════════════════════
const PORT = parseInt(process.env.PORT || '4000', 10)

async function start() {
  try {
    const { connectDB } = await import('./src/lib/mongoose.js')
    await connectDB()
    console.log(`  ✅ MongoDB connectée`)
  } catch (err) {
    console.warn(`  ⚠️  MongoDB: ${err.message}`)
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ╔══════════════════════════════════════════════╗`)
    console.log(`  ║    🏢 RMASC FACTORY — Backend API            ║`)
    console.log(`  ╠══════════════════════════════════════════════╣`)
    console.log(`  ║  🚀  http://localhost:${PORT}/api/health         ║`)
    console.log(`  ║  🔒  CORS: sarl-rmasc.com + localhost        ║`)
    console.log(`  ║  🌐  Cloudflare Tunnel → sarl-rmasc.com      ║`)
    console.log(`  ╚══════════════════════════════════════════════╝\n`)
  })

  // ─── Graceful Shutdown ──────────────────────────────────────────────
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
    setTimeout(() => {
      console.error(`  ❌ Arrêt forcé après 10s`)
      process.exit(1)
    }, 10000)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('uncaughtException', (err) => {
    console.error(`  ❌ Erreur non gérée: ${err.message}`)
    console.error(err.stack)
  })
  process.on('unhandledRejection', (reason) => {
    console.error(`  ❌ Promise rejetée non gérée:`, reason)
  })
}

const isMainModule = process.argv[1] && (process.argv[1].includes('api.mjs') || process.argv[1].includes('api'))
if (isMainModule) start()

export default app
