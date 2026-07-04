// ─── RMASC FACTORY — Backend API (MongoDB Edition) ─────────────────────
// Complete Express API using Mongoose instead of Prisma.
// Vercel entry: imported by api/index.mjs

import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB, testDBConnection } from './src/lib/mongoose.js'
import PortalUser from './src/models/PortalUser.js'
import Order from './src/models/Order.js'
import CAD_Submission from './src/models/CAD_Submission.js'
import StockItem from './src/models/StockItem.js'
import Supplier from './src/models/Supplier.js'
import StockMovement from './src/models/StockMovement.js'
import StockDocument from './src/models/StockDocument.js'

const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'rmasc-production-secret'
const BCRYPT_ROUNDS = 12

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '5mb' }))

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

// ─── Connect to MongoDB on first request ────────────────────────────────
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try { await connectDB() } catch (e) {
      // If DB is down, health check still works
      if (req.path === '/api/health') return next()
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

app.get('/api/auth/dev-login', (_req, res) => {
  res.json({ token: jwt.sign({ role: 'ADMIN', userId: 'admin' }, JWT_SECRET, { expiresIn: '24h' }) })
})

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
      { loginId: 'admin', password: await bcrypt.hash('admin123', BCRYPT_ROUNDS), name: 'Totok Michael', role: 'ADMIN', canChangePassword: true },
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

app.get('/api/users', authenticate, async (_req, res) => {
  try { res.json(await PortalUser.find().select('loginId name role canChangePassword').sort({ name: 1 })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/users/:id/name', authenticate, async (req, res) => {
  try { res.json(await PortalUser.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true }).select('loginId name role')) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/users/admin', authenticate, async (req, res) => {
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

app.post('/api/orders/create-and-sync', authenticate, async (req, res) => {
  try {
    const d = req.body
    if (await Order.findOne({ serialNumber: d.serialNumber }))
      return res.status(409).json({ error: `Série "${d.serialNumber}" existe déjà.` })

    const order = await Order.create({
      clientName: d.clientName, clientPhone: d.clientPhone, clientCity: d.clientCity,
      serialNumber: d.serialNumber, typeMotorisation: d.typeMotorisation,
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
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ success: true, message: 'Phase synchronisée.' })
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

app.post('/api/orders/:id/approve-plan', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'ATTENTE_APPROBATION_ADMIN') return res.status(409).json({ error: `Statut: ${order.status}` })
    order.status = 'ATTENTE_DESSIN_2D'
    await order.save()
    res.json({ message: 'Plan approuvé.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/orders/:id/reject-plan', authenticate, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'ATTENTE_APPROBATION_ADMIN') return res.status(409).json({ error: 'Pas en attente.' })
    order.status = 'ATTENTE_DESSIN_TECH'
    await order.save()
    res.json({ message: 'Plan rejeté.' })
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
app.post('/api/orders/:id/confirm-delivery', authenticate, async (req, res) => {
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

app.patch('/api/orders/:id', authenticate, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ order, message: 'Mis à jour.' })
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

// ─── Error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[API ERROR]', err)
  res.status(err.statusCode || 500).json({ error: err.message || 'Erreur interne.' })
})

export default app
