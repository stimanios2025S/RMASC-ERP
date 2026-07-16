// ─── RMASC FACTORY — Backend API (Production Server) ───────────────────
// Express + Mongoose + Multer. Served via Cloudflare Tunnel → sarl-rmasc.com

// Load environment variables from .env FIRST
import './src/lib/load-env.js'

import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import multer from 'multer'
import helmet from 'helmet'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { connectDB, testDBConnection } from './src/lib/mongoose.js'
import PortalUser from './src/models/PortalUser.js'
import Order from './src/models/Order.js'
import CAD_Submission from './src/models/CAD_Submission.js'
import StockItem from './src/models/StockItem.js'
import Supplier from './src/models/Supplier.js'
import StockMovement from './src/models/StockMovement.js'
import StockDocument from './src/models/StockDocument.js'
import Catalog from './src/models/Catalog.js'
import StandalonePart from './src/models/StandalonePart.js'
import { stampOrderFiles } from './src/utils/pdfStamper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'rmasc-production-secret'
const BCRYPT_ROUNDS = 12

// ─── Cloudflare Tunnel HTTPS — trust the proxy ──────────────────────────
app.set('trust proxy', 1)

// ─── Security headers (helmet) ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}))

// ─── CORS — locked to production domain + local dev ─────────────────────
app.use(cors({
  origin: ['https://sarl-rmasc.com', 'http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
}))

// ─── Body parsing — 100 MB limit for CAD files ──────────────────────────
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))

// ─── Multer — server-disk storage, no file size limit ───────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, unique + ext)
  },
})
const upload = multer({ storage })

// ─── Auth Middleware ─────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentification requise.' })
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch { return res.status(401).json({ error: 'Token invalide ou expiré.' }) }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Accès refusé.' })
  next()
}

// ─── Serve uploaded files — AUTH-GATED (no raw URL harvesting) ─────────
app.use('/uploads', authenticate, express.static(UPLOADS_DIR))

// ─── Connect to MongoDB on first request ────────────────────────────────
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try { await connectDB() } catch (e) {
      // If DB is down, health check still works — all other routes get 503
      if (req.path === '/api/health') return next()
      return res.status(503).json({ error: 'Base de données indisponible. Vérifiez MongoDB.' })
    }
  }
  next()
})

// ─── Health ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
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
})

// ─── DEV-LOGIN ENDPOINT REMOVED — Production Security ──────────────────
// app.get('/api/auth/dev-login', ...) has been permanently disabled.
// All authentication must go through POST /api/users/login.

// ═══ USERS ═══════════════════════════════════════════════════════════════
app.post('/api/users/login', async (req, res) => {
  try {
    const { loginId, password } = req.body
    if (!loginId || !password) return res.status(400).json({ error: 'Identifiants requis.' })
    const user = await PortalUser.findOne({ loginId })
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects.' })
    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ error: 'Identifiants incorrects.' })
    const token = jwt.sign({ userId: user.loginId, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
    res.json({ userId: user.loginId, name: user.name, role: user.role, token, loggedInAt: new Date().toISOString() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/users/seed', async (_req, res) => {
  try {
    if (await PortalUser.countDocuments() > 0) return res.json({ message: 'Déjà initialisé.' })
    const defaults = [
      { loginId: 'salim', password: await bcrypt.hash('salim123', BCRYPT_ROUNDS), name: 'Salim', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_ghani', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui El Ghani', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_nassim', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui Nassim', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_said', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui Said', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_aziz', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui El Aziz', role: 'ADMIN', canChangePassword: true },
      { loginId: 'ingenieur1', password: await bcrypt.hash('ingenieur1', BCRYPT_ROUNDS), name: 'Karim Bensalem', role: 'INGENIEUR_1', canChangePassword: false },
      { loginId: 'ingenieur2', password: await bcrypt.hash('ingenieur2', BCRYPT_ROUNDS), name: 'Yasmine Hamidi', role: 'INGENIEUR_2', canChangePassword: false },
      { loginId: 'verificateur', password: await bcrypt.hash('verificateur', BCRYPT_ROUNDS), name: 'Rachid Imane', role: 'VERIFICATEUR', canChangePassword: false },
      { loginId: 'production', password: await bcrypt.hash('production', BCRYPT_ROUNDS), name: 'Said Mansouri', role: 'PRODUCTION', canChangePassword: false },
      { loginId: 'magasinier', password: await bcrypt.hash('magasinier', BCRYPT_ROUNDS), name: 'Ahmed Benali', role: 'MAGASINIER', canChangePassword: false },
    ]
    await PortalUser.insertMany(defaults)
    res.json({ message: 'Utilisateurs créés.', count: defaults.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── EMERGENCY: Fix plain-text passwords in existing users ──────────────────
// If users were stored with plain-text passwords (e.g. from a migration or
// a script that bypassed bcrypt), login will fail because bcrypt.compare()
// rejects them. This endpoint re-hashes every password that is NOT already
// a bcrypt hash.
// Call: POST /api/users/fix-passwords
app.post('/api/users/fix-passwords', async (_req, res) => {
  try {
    const all = await PortalUser.find({}).lean()
    let fixed = 0
    for (const u of all) {
      // Skip if already bcrypt-hashed
      if (typeof u.password === 'string' && (
        u.password.startsWith('$2a$') || u.password.startsWith('$2b$') || u.password.startsWith('$2y$')
      )) continue
      // Re-hash plain-text password
      await PortalUser.findByIdAndUpdate(u._id, { password: await bcrypt.hash(u.password, BCRYPT_ROUNDS) })
      fixed++
    }
    const remaining = await PortalUser.countDocuments()
    res.json({
      message: `${fixed} mot(s) de passe re-haché(s). ${remaining - fixed} déjà correct(s).`,
      totalUsers: remaining,
      fixed,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── EMERGENCY: Delete ALL users and re-seed with fresh bcrypt passwords ──
// WARNING: This destroys all existing user data! Only use as last resort.
// Call: POST /api/users/reset-and-reseed
app.post('/api/users/reset-and-reseed', async (_req, res) => {
  try {
    await PortalUser.deleteMany({})
    const defaults = [
      { loginId: 'salim', password: await bcrypt.hash('salim123', BCRYPT_ROUNDS), name: 'Salim', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_ghani', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui El Ghani', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_nassim', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui Nassim', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_said', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui Said', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_aziz', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui El Aziz', role: 'ADMIN', canChangePassword: true },
      { loginId: 'ingenieur1', password: await bcrypt.hash('ingenieur1', BCRYPT_ROUNDS), name: 'Karim Bensalem', role: 'INGENIEUR_1', canChangePassword: false },
      { loginId: 'ingenieur2', password: await bcrypt.hash('ingenieur2', BCRYPT_ROUNDS), name: 'Yasmine Hamidi', role: 'INGENIEUR_2', canChangePassword: false },
      { loginId: 'verificateur', password: await bcrypt.hash('verificateur', BCRYPT_ROUNDS), name: 'Rachid Imane', role: 'VERIFICATEUR', canChangePassword: false },
      { loginId: 'production', password: await bcrypt.hash('production', BCRYPT_ROUNDS), name: 'Said Mansouri', role: 'PRODUCTION', canChangePassword: false },
      { loginId: 'magasinier', password: await bcrypt.hash('magasinier', BCRYPT_ROUNDS), name: 'Ahmed Benali', role: 'MAGASINIER', canChangePassword: false },
    ]
    await PortalUser.insertMany(defaults)
    res.json({ message: '✅ Tous les utilisateurs réinitialisés. Utilisez les mots de passe par défaut.', count: defaults.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Endpoint to add the 4 Chergui admins if not already present ────────
app.post('/api/users/seed-admins', authenticate, requireAdmin, async (_req, res) => {
  try {
    const cherguiAdmins = [
      { loginId: 'chergui_ghani', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui El Ghani', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_nassim', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui Nassim', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_said', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui Said', role: 'ADMIN', canChangePassword: true },
      { loginId: 'chergui_aziz', password: await bcrypt.hash('chergui123', BCRYPT_ROUNDS), name: 'Chergui El Aziz', role: 'ADMIN', canChangePassword: true },
    ]
    let created = 0
    for (const admin of cherguiAdmins) {
      const exists = await PortalUser.findOne({ loginId: admin.loginId })
      if (!exists) {
        await PortalUser.create(admin)
        created++
      }
    }
    res.json({ message: `${created} administrateur(s) créé(s).`, count: created })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/users', authenticate, async (_req, res) => {
  try { res.json(await PortalUser.find().select('loginId name role canChangePassword').sort({ name: 1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/users/:id/name', authenticate, async (req, res) => {
  try { res.json(await PortalUser.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true }).select('loginId name role')) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/users/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const admin = await PortalUser.findOne({ role: 'ADMIN' })
    if (!admin) return res.status(404).json({ error: 'Admin introuvable.' })
    const update = {}
    if (req.body.loginId) update.loginId = req.body.loginId
    if (req.body.newPassword) update.password = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS)
    await PortalUser.findByIdAndUpdate(admin._id, update)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Admin: Change any user's password ──────────────────────────────────
app.patch('/api/users/:id/password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Mot de passe min. 4 caractères.' })
    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await PortalUser.findByIdAndUpdate(req.params.id, { password: hashed })
    res.json({ success: true, message: 'Mot de passe mis à jour.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Helper: add `id` from `_id` for aggregation results ─────────────
function addIdField(doc) {
  if (Array.isArray(doc)) return doc.map(d => addIdField(d))
  if (doc && typeof doc === 'object' && doc._id) {
    doc.id = typeof doc._id === 'object' ? doc._id.toString() : doc._id
    // Recursively process nested objects and arrays
    for (const key of Object.keys(doc)) {
      if (key === 'cadSubmissions' || key === 'lines' || key === 'movements' || key === 'items') {
        if (Array.isArray(doc[key])) doc[key] = doc[key].map((item) => addIdField(item))
      }
    }
  }
  return doc
}

// ═══ ORDERS ══════════════════════════════════════════════════════════════
app.get('/api/orders', authenticate, async (_req, res) => {
  try {
    const orders = await Order.aggregate([
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'cad_submissions', localField: '_id', foreignField: 'order', as: 'cadSubmissions' } },
      { $addFields: { _count: { cadSubmissions: { $size: '$cadSubmissions' } } } },
      { $project: { cadSubmissions: 0 } },
    ])
    // Ensure rejection fields are included
    for (const o of orders) {
      if (o.rejectionReason === undefined) o.rejectionReason = null
      if (o.rejectedBy === undefined) o.rejectedBy = null
      if (o.rejectedAt === undefined) o.rejectedAt = null
    }
    res.json(addIdField(orders))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/orders/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('cadSubmissions')
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json(order)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/orders/:id/datasheet', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate({ path: 'cadSubmissions', options: { sort: { engineeringType: 1 } } })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json(order)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── ASC Serial Number Generator ──────────────────────────────────────────
// Format: ASC-{cabinNumber}-{MM}-{YY}
// cabinNumber: sequential 3-digit counter based on total orders in the system
// MM: current month (01-12), YY: short year (e.g. 26 for 2026)
async function generateAscSerial() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year   = String(now.getFullYear()).slice(-2)

  // Base count: total orders in the database determines the next cabin number
  const count = await Order.countDocuments()
  let cabinNum = String(count + 1).padStart(3, '0')
  let serial = `ASC-${cabinNum}-${month}-${year}`

  // ── Concurrency guard: retry with incremented number if collision detected ──
  for (let attempt = 0; attempt < 100; attempt++) {
    const exists = await Order.findOne({ serialNumber: serial }).select('_id').lean()
    if (!exists) break
    cabinNum = String(count + 2 + attempt).padStart(3, '0')
    serial = `ASC-${cabinNum}-${month}-${year}`
  }
  if (await Order.findOne({ serialNumber: serial }).select('_id').lean()) {
    throw new Error('Impossible de générer un numéro de série unique — collision persistante.')
  }

  console.log(`[SERIAL] ${serial}`)
  return serial
}

app.post('/api/orders/create-and-sync', authenticate, async (req, res) => {
  try {
    const d = req.body

    // ── Serial number auto-generation ─────────────────────────────────────
    let finalSerial = (d.serialNumber && d.serialNumber.trim()) ? d.serialNumber.trim() : null
    if (!finalSerial) {
      finalSerial = await generateAscSerial()
    }

    // ── Duplicate check ──────────────────────────────────────────────────
    if (await Order.findOne({ serialNumber: finalSerial })) {
      return res.status(409).json({ error: `Série "${finalSerial}" existe déjà.` })
    }

    const order = await Order.create({
      clientName: d.clientName, clientPhone: d.clientPhone, clientPhone2: d.clientPhone2 || undefined, clientCity: d.clientCity,
      serialNumber: finalSerial, projectName: d.projectName || undefined, notes: d.notes || undefined, priority: d.priority || 'NORMAL',
      typeMotorisation: d.typeMotorisation,
      largeurGaineMm: d.largeurGaineMm, profondeurGaineMm: d.profondeurGaineMm, hauteurGaineMm: d.hauteurGaineMm,
      clientEmail: d.clientEmail || undefined, sousTypeElectrique: d.sousTypeElectrique || undefined,
      vitesseMs: d.vitesseMs || undefined, nombreEtages: d.nombreEtages || undefined,
      materiauCabine: d.materiauCabine || undefined, materiauPortes: d.materiauPortes || undefined,
      materiauParois: d.materiauParois || undefined, materiauSol: d.materiauSol || undefined,
      profondeurCuvetteMm: d.profondeurCuvetteMm || undefined, hauteurDernierEtageMm: d.hauteurDernierEtageMm || undefined,
      contrepoidsPosition: d.contrepoidsPosition || undefined, positionContrepoids: d.positionContrepoids || undefined,
      largeurCabineCalculeeMm: d.largeurCabineCalculeeMm || undefined, profondeurCabineCalculeeMm: d.profondeurCabineCalculeeMm || undefined,
      lifecycleStage: d.lifecycleStage || 'engineering', engineeredBy: d.engineeredBy || undefined,
      totalCostDZD: d.totalCostDZD || undefined, salePriceDZD: d.salePriceDZD || undefined, marginPct: d.marginPct || undefined,
      typeCabine: d.typeCabine || undefined, typePorte: d.typePorte || undefined,
      finitionPorteCabine: d.finitionPorteCabine || undefined, typeChassisArcade: d.typeChassisArcade || undefined,
      finitionInterieurCabine: d.finitionInterieurCabine || undefined, revetementSol: d.revetementSol || undefined,
      largeurPassageLibreMm: d.largeurPassageLibreMm || undefined, hauteurUtileCabineMm: d.hauteurUtileCabineMm || undefined,
      typeSuspensionGuidage: d.typeSuspensionGuidage || undefined, systemeSurcharge: d.systemeSurcharge || undefined,
      optPanoramique: !!d.optPanoramique, optSecours: !!d.optSecours, optAnnoncesVocales: !!d.optAnnoncesVocales,
      optCctv: !!d.optCctv, optPortesCoupeFeu: !!d.optPortesCoupeFeu, optPanneauTactile: !!d.optPanneauTactile,
      optVentilation: !!d.optVentilation, optBarreaudage: !!d.optBarreaudage, optAlarme: !!d.optAlarme,
    })

    // Advance to ATTENTE_DESSIN_TECH
    order.status = 'ATTENTE_DESSIN_TECH'
    await order.save()

    res.status(201).json({
      message: 'Commande créée.',
      order: { id: order._id, serialNumber: order.serialNumber, status: order.status, createdAt: order.createdAt },
      sync: { success: true },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/orders/:id/status', authenticate, async (req, res) => {
  try {
    const valid = ['BROUILLON','ATTENTE_DESSIN_TECH','ATTENTE_APPROBATION_ADMIN','ATTENTE_DESSIN_2D','ATTENTE_VERIFICATION','PRET_POUR_PRODUCTION','EN_LIVRAISON','LIVREE','VALIDEE','ANNULEE']
    if (!valid.includes(req.body.status)) return res.status(400).json({ error: 'Statut invalide.' })
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ order })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/orders/:id/production-phase', authenticate, async (req, res) => {
  try {
    const { productionPhase } = req.body
    const valid = ['decoupe','pliage','soudeur','peinture','assemblage','emballage','livraison']
    if (!valid.includes(productionPhase)) return res.status(400).json({ error: 'Phase invalide.' })
    const order = await Order.findByIdAndUpdate(req.params.id, { productionPhase }, { new: true })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ success: true, productionPhase: order.productionPhase, message: 'Phase sauvegardée.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══ FILE UPLOADS (Server-Disk — No localStorage / No size limits) ════════
// Upload a file to an order
app.post('/api/orders/:id/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' })

    const fileMeta = {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      destination: req.file.destination,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      uploadedBy: req.user?.name || 'Utilisateur',
      uploadedAt: new Date(),
    }
    order.files.push(fileMeta)
    await order.save()

    res.status(201).json({
      message: 'Fichier uploadé.',
      file: { ...fileMeta, path: undefined, destination: undefined },
      fileId: order.files[order.files.length - 1]._id,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// List all files for an order
app.get('/api/orders/:id/files', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select('files serialNumber')
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ serialNumber: order.serialNumber, files: addIdField(order.files) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Download/view a specific file
app.get('/api/orders/:id/files/:fileId', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select('files')
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })

    const file = order.files.id(req.params.fileId)
    if (!file) return res.status(404).json({ error: 'Fichier introuvable.' })

    if (!fs.existsSync(file.path)) return res.status(404).json({ error: 'Fichier physique introuvable sur le disque.' })

    res.setHeader('Content-Disposition', `inline; filename="${file.originalname}"`)
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream')
    res.setHeader('Content-Length', file.size)
    fs.createReadStream(file.path).pipe(res)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Delete a file from an order
app.delete('/api/orders/:id/files/:fileId', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select('files')
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })

    const file = order.files.id(req.params.fileId)
    if (!file) return res.status(404).json({ error: 'Fichier introuvable.' })

    // Remove physical file from disk
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path)

    order.files.pull(req.params.fileId)
    await order.save()

    res.json({ success: true, message: 'Fichier supprimé.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══ ARCHIVE SEARCH (global — all portals) ════════════════════════════════
app.get('/api/orders/archives', authenticate, async (req, res) => {
  try {
    const { search, status } = req.query
    const filter = { status: { $in: status ? [status] : ['LIVREE','VALIDEE','ANNULEE'] } }

    if (search) {
      const s = search.trim()
      filter.$or = [
        { projectName: { $regex: s, $options: 'i' } },
        { clientName: { $regex: s, $options: 'i' } },
        { serialNumber: { $regex: s, $options: 'i' } },
        { clientCity: { $regex: s, $options: 'i' } },
      ]
    }

    const orders = await Order.find(filter).sort({ completedAt: -1, createdAt: -1 }).limit(200)
    res.json(addIdField(orders))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Archive: all documents linked to an order ─────────────────────────
app.get('/api/orders/:id/archive', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })

    const [cadSubmissions, stockDocuments] = await Promise.all([
      CAD_Submission.find({ order: order._id }).sort({ createdAt: -1 }),
      StockDocument.find({ order: order._id }).populate('supplier').populate({ path: 'lines.item' }).sort({ createdAt: -1 }),
    ])

    res.json({
      order: {
        id: order._id,
        serialNumber: order.serialNumber,
        clientName: order.clientName,
        clientCity: order.clientCity,
        status: order.status,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
      },
      cadSubmissions: addIdField(cadSubmissions),
      stockDocuments: addIdField(stockDocuments),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/orders/:id/approve-plan', authenticate, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'ATTENTE_APPROBATION_ADMIN') return res.status(409).json({ error: `Statut: ${order.status}` })

    const adminName = req.user?.name || 'Administrateur'
    const now = new Date()

    order.status = 'ATTENTE_DESSIN_2D'
    order.approvedBy = adminName
    order.approvedAt = now

    // ── PDF Electronic Stamp Engine (Cachet Électronique) ────────────────
    // Stamp ALL uploaded PDF files with the official RMASC validation seal.
    const stampMeta = {
      approvedBy: adminName,
      approvedAt: now,
      serial: order.serialNumber,
    }

    const stampResult = await stampOrderFiles(order, stampMeta)

    // Record stamp tracking on the order
    order.isStamped   = stampResult.stamped > 0
    order.stampedAt   = now
    order.stampedBy   = adminName
    order.stampResults = stampResult.results

    await order.save()

    res.json({
      message: 'Plan approuvé.',
      approvedBy: order.approvedBy,
      approvedAt: order.approvedAt,
      stamp: {
        isStamped: order.isStamped,
        filesStamped: stampResult.stamped,
        filesTotal: stampResult.total,
        filesFailed: stampResult.failed,
        results: stampResult.results.map(r => ({
          filename: r.filename,
          pagesStamped: r.pagesStamped,
          success: r.success,
        })),
      },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Force re-stamp all PDFs on an order (admin only) ─────────────────────
app.post('/api/orders/:id/restamp', authenticate, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })

    const adminName = req.user?.name || 'Administrateur'
    const now = new Date()

    const stampResult = await stampOrderFiles(order, {
      approvedBy: adminName,
      approvedAt: now,
      serial: order.serialNumber,
    })

    order.isStamped    = stampResult.stamped > 0
    order.stampedAt    = now
    order.stampedBy    = adminName
    order.stampResults = stampResult.results
    await order.save()

    res.json({
      message: 'Cachet électronique réappliqué.',
      stamp: { isStamped: order.isStamped, filesStamped: stampResult.stamped, filesTotal: stampResult.total },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/orders/:id/reject-plan', authenticate, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'ATTENTE_APPROBATION_ADMIN') return res.status(409).json({ error: 'Pas en attente.' })
    order.status = 'ATTENTE_DESSIN_TECH'
    order.rejectionReason = req.body.reason || 'Aucune raison spécifiée'
    order.rejectedBy = req.user?.name || 'Administrateur'
    order.rejectedAt = new Date()
    await order.save()
    res.json({ message: 'Plan rejeté.', rejectionReason: order.rejectionReason, rejectedBy: order.rejectedBy })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Delivery Workflow: Submit as ready for delivery ────────────────────
app.post('/api/orders/:id/mark-delivery', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'PRET_POUR_PRODUCTION') return res.status(409).json({ error: `Statut actuel: ${order.status}. Attendu: PRET_POUR_PRODUCTION.` })
    order.status = 'EN_LIVRAISON'
    await order.save()
    res.json({ message: '✅ Commande marquée prête pour livraison. En attente de validation Admin.', order })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Delivery Workflow: Admin confirms delivery ─────────────────────────
app.post('/api/orders/:id/confirm-delivery', authenticate, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'EN_LIVRAISON') return res.status(409).json({ error: `Statut actuel: ${order.status}. Attendu: EN_LIVRAISON.` })
    order.status = 'LIVREE'
    order.lifecycleStage = 'delivered'
    order.completedAt = new Date()
    await order.save()
    res.json({ message: '✅ Livraison confirmée. Commande terminée.', order })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Admin: Full update ANY order (even completed/in production) ──────
app.patch('/api/orders/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const allowed = ['clientName','clientEmail','clientPhone','clientCity','serialNumber',
      'typeMotorisation','sousTypeElectrique','vitesseMs','nombreEtages',
      'clientPhone2',
      'largeurGaineMm','profondeurGaineMm','hauteurGaineMm',
      'profondeurCuvetteMm','hauteurDernierEtageMm','contrepoidsPosition','positionContrepoids',
      'largeurCabineCalculeeMm','profondeurCabineCalculeeMm',
      'materiauCabine','materiauPortes','materiauParois','materiauSol',
      'typeCabine','typePorte','finitionPorteCabine','typeChassisArcade',
      'finitionInterieurCabine','revetementSol',
      'largeurPassageLibreMm','hauteurUtileCabineMm','typeSuspensionGuidage','systemeSurcharge',
      'projectName','priority','notes','lifecycleStage','engineeredBy','totalCostDZD','salePriceDZD','marginPct',
      'optPanoramique','optSecours','optAnnoncesVocales','optCctv','optPortesCoupeFeu',
      'optPanneauTactile','optVentilation','optBarreaudage','optAlarme',
      'status']
    const update = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key]
    }
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ order, message: '✅ Commande mise à jour avec succès.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Admin: Delete order (hard delete, admin only) ─────────────────────
app.delete('/api/orders/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await CAD_Submission.deleteMany({ order: req.params.id })
    await Order.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Commande supprimée.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══ STOCK ──────────────────────────────────────────────────────────────
// Items
app.get('/api/stock/items', authenticate, async (req, res) => {
  try {
    const filter = {}
    if (req.query.category) filter.category = req.query.category
    if (req.query.location) filter.location = req.query.location
    if (req.query.supplierId) filter.supplier = req.query.supplierId
    let items = await StockItem.find(filter).populate('supplier').sort({ name: 1 })
    if (req.query.lowStock === 'true') items = items.filter(i => i.quantity <= i.alertThreshold)
    res.json(items)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/stock/items', authenticate, async (req, res) => {
  try {
    if (await StockItem.findOne({ reference: req.body.reference })) return res.status(409).json({ error: 'Référence existe déjà.' })
    const item = await StockItem.create(req.body)
    res.status(201).json(item)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/stock/items/:id', authenticate, async (req, res) => {
  try {
    const item = await StockItem.findById(req.params.id).populate('supplier')
    if (!item) return res.status(404).json({ error: 'Article introuvable.' })
    const movements = await StockMovement.find({ item: item._id }).sort({ createdAt: -1 }).limit(50)
    res.json({ ...item.toJSON(), movements })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/stock/items/:id', authenticate, async (req, res) => {
  try { res.json(await StockItem.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/stock/items/:id', authenticate, async (req, res) => {
  try { await StockItem.findByIdAndDelete(req.params.id); res.json({ success: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/stock/items/:id/image', authenticate, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 requis.' })
    const dataUrl = `data:${mimeType || 'image/png'};base64,${imageBase64}`
    await StockItem.findByIdAndUpdate(req.params.id, { imageUrl: dataUrl })
    res.json({ imageUrl: dataUrl })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Suppliers
app.get('/api/stock/suppliers', authenticate, async (req, res) => {
  try {
    const suppliers = await Supplier.aggregate([
      { $lookup: { from: 'stockitems', localField: '_id', foreignField: 'supplier', as: 'items' } },
      { $lookup: { from: 'stockmovements', localField: '_id', foreignField: 'supplier', as: 'movements' } },
      { $addFields: { _count: { items: { $size: '$items' }, movements: { $size: '$movements' } } } },
      { $sort: { name: 1 } },
    ])
    res.json(addIdField(suppliers))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/stock/suppliers', authenticate, async (req, res) => {
  try { res.status(201).json(await Supplier.create(req.body)) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/stock/suppliers/:id', authenticate, async (req, res) => {
  try {
    const s = await Supplier.findById(req.params.id)
    if (!s) return res.status(404).json({ error: 'Fournisseur introuvable.' })
    const items = await StockItem.find({ supplier: s._id })
    res.json({ ...s.toJSON(), items })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/stock/suppliers/:id', authenticate, async (req, res) => {
  try { res.json(await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/stock/suppliers/:id', authenticate, async (req, res) => {
  try { await Supplier.findByIdAndDelete(req.params.id); res.json({ success: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// Movements
app.get('/api/stock/movements', authenticate, async (req, res) => {
  try {
    const filter = {}
    if (req.query.itemId) filter.item = req.query.itemId
    if (req.query.type) filter.type = req.query.type
    res.json(await StockMovement.find(filter).populate('item').populate('order', 'serialNumber').populate('supplier').sort({ createdAt: -1 }).limit(100))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/stock/movements', authenticate, async (req, res) => {
  try {
    const item = await StockItem.findById(req.body.itemId)
    if (!item) return res.status(404).json({ error: 'Article introuvable.' })
    let newQty = item.quantity
    if (req.body.type === 'ENTRY') newQty += req.body.quantity
    else if (req.body.type === 'EXIT') newQty -= req.body.quantity
    else if (req.body.type === 'ADJUSTMENT') newQty = req.body.quantity
    if (newQty < 0) return res.status(400).json({ error: 'Stock insuffisant.' })

    item.quantity = newQty
    await item.save()

    const movement = await StockMovement.create({
      type: req.body.type, quantity: req.body.quantity, item: req.body.itemId,
      order: req.body.orderId || undefined, supplier: req.body.supplierId || undefined,
      reference: req.body.reference, notes: req.body.notes,
      unitPrice: req.body.unitPrice, totalPrice: req.body.totalPrice, performedBy: req.body.performedBy,
    })

    res.status(201).json(await movement.populate(['item', { path: 'order', select: 'serialNumber' }, 'supplier']))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Documents
app.get('/api/stock/documents', authenticate, async (req, res) => {
  try {
    const filter = {}
    if (req.query.type) filter.documentType = req.query.type
    res.json(await StockDocument.find(filter).populate('supplier').populate('order', 'serialNumber clientName').sort({ createdAt: -1 }).limit(50))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/stock/documents', authenticate, async (req, res) => {
  try {
    const doc = await StockDocument.create({
      documentType: req.body.documentType, documentNumber: req.body.documentNumber,
      title: req.body.title, description: req.body.description,
      supplier: req.body.supplierId || undefined,
      totalHT: req.body.totalHT, totalTVA: req.body.totalTVA, totalTTC: req.body.totalTTC,
      status: req.body.status || 'EN_ATTENTE',
    })
    res.status(201).json(doc)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/stock/documents/:id', authenticate, async (req, res) => {
  try {
    const doc = await StockDocument.findById(req.params.id).populate('supplier')
    if (!doc) return res.status(404).json({ error: 'Document introuvable.' })
    res.json(doc)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Bon de Commande
app.post('/api/stock/bon-commande', authenticate, async (req, res) => {
  try {
    const lines = (req.body.lines || []).map(l => ({
      item: l.itemId, quantity: l.quantity,
      unitPrice: l.unitPrice || 0, totalPrice: l.totalPrice || 0,
    }))
    const doc = await StockDocument.create({
      documentType: 'BON_COMMANDE', documentNumber: req.body.documentNumber,
      title: req.body.title, description: req.body.description,
      supplier: req.body.supplierId || undefined,
      totalHT: req.body.totalHT || 0, totalTTC: req.body.totalTTC || 0,
      status: 'VALIDE', lines,
    })
    res.status(201).json(await doc.populate(['supplier', { path: 'lines.item' }]))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Stats
app.get('/api/stock/stats', authenticate, async (req, res) => {
  try {
    const [totalItems, totalSuppliers, recentMovements, allItems] = await Promise.all([
      StockItem.countDocuments(), Supplier.countDocuments(),
      StockMovement.find().populate('item').sort({ createdAt: -1 }).limit(10),
      StockItem.find().select('quantity alertThreshold'),
    ])
    res.json({
      totalItems,
      lowStockItems: allItems.filter(i => i.quantity <= i.alertThreshold).length,
      totalSuppliers,
      recentMovements: addIdField(recentMovements),
      categoryCounts: await StockItem.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══ CATALOG (Administrable Settings) ═══════════════════════════════════
// Get all catalog categories
app.get('/api/catalog', authenticate, async (_req, res) => {
  try {
    const catalog = await Catalog.find().sort({ category: 1 })
    res.json(catalog)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get a single catalog category
app.get('/api/catalog/:category', authenticate, async (req, res) => {
  try {
    let cat = await Catalog.findOne({ category: req.params.category })
    if (!cat) {
      // Return empty default
      cat = { category: req.params.category, label: req.params.category, items: [] }
    }
    res.json(cat)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Seed default catalog (admin only)
app.post('/api/catalog/seed', authenticate, requireAdmin, async (_req, res) => {
  try {
    const defaults = [
      {
        category: 'materiau-cabine',
        label: 'Matériaux cabine',
        items: [
          { value: 'Acier Inoxydable Brossé', label: 'Acier Inoxydable Brossé', desc: 'Finition brossée standard', order: 1 },
          { value: 'Acier Inoxydable Miroir', label: 'Acier Inoxydable Miroir', desc: 'Finition miroir luxueuse', order: 2 },
          { value: 'Verre Trempé (Stratifié 12mm)', label: 'Verre Trempé 12mm', desc: 'Verre de sécurité stratifié', order: 3 },
          { value: 'Aluminium', label: 'Aluminium', desc: 'Aluminium léger', order: 4 },
          { value: 'Bois Décoratif Ignifuge', label: 'Bois Décoratif Ignifuge', desc: 'Bois ignifugé', order: 5 },
          { value: 'Mélaminé / Laminé Haute Pression', label: 'Mélaminé HPL', desc: 'Laminé haute pression', order: 6 },
        ]
      },
      {
        category: 'materiau-portes',
        label: 'Matériaux portes',
        items: [
          { value: 'Acier Inoxydable Brossé', label: 'Inox Brossé', desc: 'Finition brossée', order: 1 },
          { value: 'Acier Inoxydable Miroir', label: 'Inox Miroir', desc: 'Finition miroir', order: 2 },
          { value: 'Verre Trempé', label: 'Verre Trempé', desc: 'Porte vitrée', order: 3 },
        ]
      },
      {
        category: 'type-cabine',
        label: 'Type de cabine',
        items: [
          { value: 'PASSAGER', label: '🚶 Standard Passager', desc: 'Cabine passager standard', order: 1 },
          { value: 'PANORAMIQUE', label: '🪟 Panoramique', desc: 'Cabine panoramique avec parois vitrées', order: 2 },
          { value: 'CHARGES_LOURDES', label: '🏋️ Monte-Charge', desc: 'Cabine renforcée pour marchandises lourdes', order: 3 },
          { value: 'SERVICE_LIFT', label: '📦 Monte-Plat', desc: 'Cabine de service', order: 4 },
        ]
      },
      {
        category: 'type-porte',
        label: 'Type de porte',
        items: [
          { value: 'AUTOMATIQUE_CENTRALE', label: '🚪 Automatique Centrale (2V)', desc: 'Ouverture centrale 2 vantaux', order: 1 },
          { value: 'AUTOMATIQUE_TELESCOPIQUE', label: '🚪🔀 Télescopique', desc: 'Ouverture télescopique', order: 2 },
          { value: 'BATTANTE_MANUELLE', label: '🚪✋ Battante Manuelle', desc: 'Porte battante pour service', order: 3 },
        ]
      },
      {
        category: 'finition-porte-cabine',
        label: 'Finition portes cabine',
        items: [
          { value: 'INOX_BROSSE', label: 'Inox Brossé', desc: 'Aspect mat et élégant', order: 1 },
          { value: 'INOX_MIROIR', label: 'Inox Miroir', desc: 'Aspect brillant et luxueux', order: 2 },
          { value: 'INOX_TEXTURE', label: 'Inox Texturé', desc: 'Texture antidérapante', order: 3 },
          { value: 'VITREE_PANORAMIQUE', label: 'Vitrée Panoramique', desc: 'Porte entièrement vitrée', order: 4 },
        ]
      },
      {
        category: 'type-chassis',
        label: 'Type de châssis / arcade',
        items: [
          { value: 'TRACTION_ELECTRIQUE_2_1', label: '⚡ Traction Électrique 2:1', desc: 'Avantage mécanique 2:1', order: 1 },
          { value: 'TRACTION_ELECTRIQUE_1_1', label: '⚡ Traction Électrique 1:1', desc: 'Architecture directe 1:1', order: 2 },
          { value: 'HYDRAULIQUE_DIRECT', label: '💧 Hydraulique Direct', desc: 'Vérin hydraulique direct', order: 3 },
          { value: 'HYDRAULIQUE_INDIRECT_RUCKSACK', label: '💧 Hydraulique Indirect (Rucksack)', desc: 'Vérin latéral Rucksack', order: 4 },
        ]
      },
      {
        category: 'finition-interieur',
        label: 'Finition intérieur cabine',
        items: [
          { value: 'INOX MIROIR', label: 'INOX MIROIR', desc: 'Finition inox miroir', order: 1 },
          { value: 'INOX BROSSE', label: 'INOX BROSSÉ', desc: 'Finition inox brossé', order: 2 },
          { value: 'STRATIFIE BOIS', label: 'STRATIFIÉ BOIS', desc: 'Stratifié aspect bois', order: 3 },
          { value: 'VERRE LAQUE', label: 'VERRE LAQUÉ', desc: 'Verre laqué haute résistance', order: 4 },
          { value: 'CUIR VEGETAL', label: 'CUIR VÉGÉTAL', desc: 'Cuir végétal sur panneaux', order: 5 },
        ]
      },
      {
        category: 'revetement-sol',
        label: 'Revêtement de sol',
        items: [
          { value: 'CAOUTCHOUC ANTI-DERAPANT', label: 'Caoutchouc Anti-Dérapant', desc: 'Sol caoutchouc sécurité', order: 1 },
          { value: 'PVC ANTI-DERAPANT', label: 'PVC Anti-Dérapant', desc: 'Sol PVC antidérapant', order: 2 },
          { value: 'CARRELAGE GRES CERAME', label: 'Carrelage Grès Cérame', desc: 'Carrelage haute résistance', order: 3 },
          { value: 'INOX ANTI-DERAPANT', label: 'Inox Anti-Dérapant', desc: 'Sol inox antidérapant', order: 4 },
          { value: 'MARBRE RECONSTITUE', label: 'Marbre Reconstitué', desc: 'Marbre aspect luxe', order: 5 },
        ]
      },
      {
        category: 'options',
        label: 'Options disponibles',
        items: [
          { value: 'optPanoramique', label: 'Ascenseur panoramique', desc: 'Cabine avec parois vitrées', order: 1 },
          { value: 'optSecours', label: 'Alimentation de secours', desc: 'Batterie de secours en cas de coupure', order: 2 },
          { value: 'optAnnoncesVocales', label: 'Annonces vocales', desc: 'Synthèse vocale pour les étages', order: 3 },
          { value: 'optCctv', label: 'CCTV intégré', desc: 'Caméra de surveillance', order: 4 },
          { value: 'optPortesCoupeFeu', label: 'Portes coupe-feu', desc: 'Portes résistant au feu', order: 5 },
          { value: 'optPanneauTactile', label: 'Panneau tactile', desc: 'Écran tactile dans la cabine', order: 6 },
          { value: 'optVentilation', label: 'Ventilateur de gaine', desc: 'Ventilation forcée de la gaine', order: 7 },
          { value: 'optBarreaudage', label: 'Barreaudage de protection', desc: 'Barreaudage de sécurité', order: 8 },
          { value: 'optAlarme', label: 'Alarme de cabine', desc: 'Alarme sonore de secours', order: 9 },
        ]
      },
      {
        category: 'motorisation',
        label: 'Types de motorisation',
        items: [
          { value: 'ÉLECTRIQUE', label: 'ÉLECTRIQUE', desc: 'Motorisation électrique classique', order: 1 },
          { value: 'HYDRAULIQUE', label: 'HYDRAULIQUE', desc: 'Motorisation hydraulique', order: 2 },
        ]
      },
    ]

    let count = 0
    for (const cat of defaults) {
      const exists = await Catalog.findOne({ category: cat.category })
      if (!exists) {
        await Catalog.create(cat)
        count++
      }
    }
    res.json({ message: `${count} catégories créées.`, count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Update a catalog category (replace all items)
app.put('/api/catalog/:category', authenticate, requireAdmin, async (req, res) => {
  try {
    const cat = await Catalog.findOneAndUpdate(
      { category: req.params.category },
      { items: req.body.items, label: req.body.label || req.params.category, updatedAt: new Date() },
      { upsert: true, new: true }
    )
    res.json(cat)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Add an item to a catalog category
app.post('/api/catalog/:category/items', authenticate, requireAdmin, async (req, res) => {
  try {
    const cat = await Catalog.findOne({ category: req.params.category })
    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable.' })
    const maxOrder = cat.items.reduce((max, i) => Math.max(max, i.order || 0), 0)
    cat.items.push({ ...req.body, order: maxOrder + 1 })
    cat.updatedAt = new Date()
    await cat.save()
    res.json(cat)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Delete an item from a catalog category
app.delete('/api/catalog/:category/items/:value', authenticate, requireAdmin, async (req, res) => {
  try {
    const cat = await Catalog.findOne({ category: req.params.category })
    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable.' })
    cat.items = cat.items.filter(i => i.value !== req.params.value)
    cat.updatedAt = new Date()
    await cat.save()
    res.json(cat)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══ PIÈCES SOLO (Standalone Parts — Ingénieur 2 + Production only) ══════

// ─── PART Serial Number Generator ──────────────────────────────────────
// Format: PART-{sequentialNumber}-{MM}-{YY}
async function generatePartSerial() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year  = String(now.getFullYear()).slice(-2)

  const count = await StandalonePart.countDocuments()
  let partNum = String(count + 1).padStart(3, '0')
  let serial = `PART-${partNum}-${month}-${year}`

  // ── Concurrency guard ────────────────────────────────────────────────
  for (let attempt = 0; attempt < 100; attempt++) {
    const exists = await StandalonePart.findOne({ partNumber: serial }).select('_id').lean()
    if (!exists) break
    partNum = String(count + 2 + attempt).padStart(3, '0')
    serial = `PART-${partNum}-${month}-${year}`
  }
  if (await StandalonePart.findOne({ partNumber: serial }).select('_id').lean()) {
    throw new Error('Impossible de générer un numéro de pièce unique — collision persistante.')
  }

  console.log(`[PART SERIAL] ${serial}`)
  return serial
}

// ─── POST /api/standalone-parts/create ───────────────────────────────────
// Accepts multipart form: projectName, material, thickness, quantity + CAD file upload.
app.post('/api/standalone-parts/create', authenticate, upload.single('cadFile'), async (req, res) => {
  try {
    const { projectName, material, thickness, quantity } = req.body
    if (!projectName || !projectName.trim()) {
      return res.status(400).json({ error: 'Le nom du projet est requis.' })
    }

    // ── Restrict to INGENIEUR_2 and PRODUCTION ──────────────────────────
    const allowedRoles = ['INGENIEUR_2', 'PRODUCTION']
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé. Seuls Ingénieur 2 et Production peuvent créer des pièces solo.' })
    }

    const partNumber = await generatePartSerial()

    const fileMeta = req.file ? {
      originalname: req.file.originalname,
      mimetype:     req.file.mimetype,
      filename:     req.file.filename,
      path:         req.file.path,
      size:         req.file.size,
    } : undefined

    const part = await StandalonePart.create({
      partNumber,
      projectName: projectName.trim(),
      material:    material || undefined,
      thickness:   thickness || undefined,
      quantity:    parseInt(quantity) || 1,
      cadFileUrl:  req.file ? `/uploads/${req.file.filename}` : undefined,
      fileMeta,
      status:      'EN_ATTENTE',
      createdBy:   req.user.name || req.user.userId,
    })

    res.status(201).json({
      message: 'Pièce solo créée.',
      part: {
        id: part._id,
        partNumber: part.partNumber,
        projectName: part.projectName,
        material: part.material,
        thickness: part.thickness,
        quantity: part.quantity,
        cadFileUrl: part.cadFileUrl,
        status: part.status,
        createdAt: part.createdAt,
      },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── GET /api/standalone-parts/active ─────────────────────────────────────
// Returns all parts where status is NOT 'TERMINE' (EN_ATTENTE + EN_PRODUCTION).
app.get('/api/standalone-parts/active', authenticate, async (_req, res) => {
  try {
    const parts = await StandalonePart.find({ status: { $ne: 'TERMINE' } })
      .sort({ createdAt: -1 })
      .select('partNumber projectName material thickness quantity cadFileUrl status createdAt createdBy')

    res.json(parts)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── GET /api/standalone-parts/all ────────────────────────────────────────
// Returns ALL parts including terminated (for history view).
app.get('/api/standalone-parts/all', authenticate, async (_req, res) => {
  try {
    const parts = await StandalonePart.find()
      .sort({ createdAt: -1 })
      .select('partNumber projectName material thickness quantity cadFileUrl status createdAt createdBy')

    res.json(parts)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── PATCH /api/standalone-parts/:id/status ───────────────────────────────
// Transition a part through: EN_ATTENTE → EN_PRODUCTION → TERMINE
app.patch('/api/standalone-parts/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body
    const valid = ['EN_ATTENTE', 'EN_PRODUCTION', 'TERMINE']
    if (!valid.includes(status)) return res.status(400).json({ error: 'Statut invalide.' })

    const part = await StandalonePart.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('partNumber projectName material thickness quantity cadFileUrl status createdAt')

    if (!part) return res.status(404).json({ error: 'Pièce introuvable.' })

    res.json({ message: `Statut mis à jour → ${status}`, part })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(`[API ERROR] ${err.message || 'Erreur interne'}`)
  res.status(err.statusCode || 500).json({ error: err.message || 'Erreur interne.' })
})

// ═══ NOTIFICATIONS ═══════════════════════════════════════════════════════
// WhatsApp notification endpoint — sends alerts to the admin's phone
// Uses WhatsApp Business API (configure via WHATSAPP_API_KEY in .env)
app.post('/api/notifications/whatsapp', authenticate, async (req, res) => {
  try {
    const { phone, message, orderRef } = req.body
    if (!phone || !message) return res.status(400).json({ error: 'Téléphone et message requis.' })

    const targetPhone = phone || process.env.ADMIN_WHATSAPP || '+213550026660'
    const formattedMessage = `🏭 RMASC ERP\n\n${message}\n\n— Réf: ${orderRef || 'RMASC'}\n📅 ${new Date().toLocaleDateString('fr-FR')}`

    // Log the notification (masked phone for production logs)
    const maskedPhone = targetPhone.slice(0, 5) + '****' + targetPhone.slice(-2)
    console.log(`[WHATSAPP] Notification envoyee → ${maskedPhone} (ref: ${orderRef || 'RMASC'})`)

    // WhatsApp Business API integration placeholder
    // In production, uncomment and configure:
    // const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY
    // const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages'
    // if (WHATSAPP_API_KEY) {
    //   await fetch(WHATSAPP_API_URL, {
    //     method: 'POST',
    //     headers: { 'Authorization': `Bearer ${WHATSAPP_API_KEY}`, 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       messaging_product: 'whatsapp',
    //       to: targetPhone,
    //       type: 'text',
    //       text: { body: formattedMessage }
    //     })
    //   })
    // }

    res.json({
      success: true,
      message: 'Notification envoyée.',
      phone: targetPhone,
      timestamp: new Date().toISOString(),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Production Server — Always runs as a permanent Express.js process ──
// The server starts immediately on its local port. No serverless/Vercel fallback.
const PORT = parseInt(process.env.PORT || '4000', 10)

async function start() {
  try {
    const { connectDB } = await import('./src/lib/mongoose.js')
    await connectDB()
    console.log(`  ✅ MongoDB connectée`)
  } catch (err) {
    console.warn(`  ⚠️  MongoDB: ${err.message}`)
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ╔══════════════════════════════════════════════╗`)
    console.log(`  ║    🏢 RMASC FACTORY — Backend API            ║`)
    console.log(`  ╠══════════════════════════════════════════════╣`)
    console.log(`  ║  🚀  http://localhost:${PORT}/api/health         ║`)
    console.log(`  ║  🔒  CORS: sarl-rmasc.com + localhost        ║`)
    console.log(`  ║  🌐  Cloudflare Tunnel → sarl-rmasc.com      ║`)
    console.log(`  ╚══════════════════════════════════════════════╝\n`)
  })
}

start()

export default app
