// ─── RMASC FACTORY — Backend Serverless Entry (Vercel) ────────────────
// Vercel calls this file for all /api/* requests.
// It's a pure ESM Express app that connects to Neon via Prisma.

import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis
const prisma = globalForPrisma.__prisma || new PrismaClient({ log: ['error'] })
if (!globalForPrisma.__prisma) globalForPrisma.__prisma = prisma

const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'rmasc-production-secret'
const BCRYPT_ROUNDS = 12

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '5mb' }))

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

// ── Health ──────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', service: 'RMASC ERP', database: 'connected' }) }
  catch (e) { res.json({ status: 'degraded', database: 'disconnected', error: e.message }) }
})

app.get('/api/auth/dev-login', (_req, res) => {
  res.json({ token: jwt.sign({ role: 'ADMIN', userId: 'admin' }, JWT_SECRET, { expiresIn: '24h' }) })
})

// ── Users ───────────────────────────────────────────────────────────────
app.post('/api/users/login', async (req, res) => {
  try {
    const { loginId, password } = req.body
    if (!loginId || !password) return res.status(400).json({ error: 'Identifiants requis.' })
    const user = await prisma.portalUser.findUnique({ where: { loginId } })
    if (!user) return res.status(401).json({ error: 'Identifiants incorrects.' })
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) return res.status(401).json({ error: 'Identifiants incorrects.' })
    const token = jwt.sign({ userId: user.loginId, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
    res.json({ userId: user.loginId, name: user.name, role: user.role, loggedInAt: new Date().toISOString(), token })
  } catch (e) { res.status(500).json({ error: 'Erreur serveur.' }) }
})

app.post('/api/users/seed', async (_req, res) => {
  try {
    if (await prisma.portalUser.count() > 0) return res.json({ message: 'Déjà initialisé.' })
    const defaults = [
      { loginId: 'admin', password: 'admin123', name: 'Totok Michael', role: 'ADMIN', canChangePassword: true },
      { loginId: 'ingenieur1', password: 'ingenieur1', name: 'Karim Bensalem', role: 'INGENIEUR_1', canChangePassword: false },
      { loginId: 'ingenieur2', password: 'ingenieur2', name: 'Yasmine Hamidi', role: 'INGENIEUR_2', canChangePassword: false },
      { loginId: 'verificateur', password: 'verificateur', name: 'Rachid Imane', role: 'VERIFICATEUR', canChangePassword: false },
      { loginId: 'production', password: 'production', name: 'Said Mansouri', role: 'PRODUCTION', canChangePassword: false },
      { loginId: 'magasinier', password: 'magasinier', name: 'Ahmed Benali', role: 'MAGASINIER', canChangePassword: false },
    ]
    for (const u of defaults) {
      const hashed = await bcrypt.hash(u.password, BCRYPT_ROUNDS)
      await prisma.portalUser.create({ data: { ...u, password: hashed } })
    }
    res.json({ message: 'Utilisateurs créés (bcrypt).' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/users', authenticate, async (_req, res) => {
  try { res.json(await prisma.portalUser.findMany({ select: { id: true, loginId: true, name: true, role: true, canChangePassword: true } })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/users/:id/name', authenticate, async (req, res) => {
  try { await prisma.portalUser.update({ where: { id: req.params.id }, data: { name: req.body.name } }); res.json({ success: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/users/admin', authenticate, async (req, res) => {
  try {
    const admin = await prisma.portalUser.findFirst({ where: { role: 'ADMIN' } })
    if (!admin) return res.status(404).json({ error: 'Admin introuvable.' })
    const updateData = {}
    if (req.body.loginId) updateData.loginId = req.body.loginId
    if (req.body.newPassword) updateData.password = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS)
    await prisma.portalUser.update({ where: { id: admin.id }, data: updateData })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Orders ──────────────────────────────────────────────────────────────
app.get('/api/orders', authenticate, async (_req, res) => {
  try { res.json(await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { cadSubmissions: true } } } })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/orders/:id', authenticate, async (req, res) => {
  try {
    const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: { cadSubmissions: { orderBy: { engineeringType: 'asc' } } } })
    if (!o) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json(o)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/orders/:id/datasheet', authenticate, async (req, res) => {
  try {
    const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: { cadSubmissions: { orderBy: { engineeringType: 'asc' } } } })
    if (!o) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json(o)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/orders/create-and-sync', authenticate, async (req, res) => {
  try {
    const d = req.body
    if (await prisma.order.findUnique({ where: { serialNumber: d.serialNumber } }))
      return res.status(409).json({ error: `Série "${d.serialNumber}" existe déjà.` })
    const order = await prisma.order.create({
      data: {
        clientName: d.clientName, clientPhone: d.clientPhone, clientCity: d.clientCity,
        serialNumber: d.serialNumber, typeMotorisation: d.typeMotorisation,
        largeurGaineMm: d.largeurGaineMm, profondeurGaineMm: d.profondeurGaineMm, hauteurGaineMm: d.hauteurGaineMm,
        clientEmail: d.clientEmail || null, sousTypeElectrique: d.sousTypeElectrique || null,
        vitesseMs: d.vitesseMs || null, nombreEtages: d.nombreEtages || null,
        materiauCabine: d.materiauCabine || null, materiauPortes: d.materiauPortes || null,
        materiauParois: d.materiauParois || null, materiauSol: d.materiauSol || null,
        profondeurCuvetteMm: d.profondeurCuvetteMm || null, hauteurDernierEtageMm: d.hauteurDernierEtageMm || null,
        contrepoidsPosition: d.contrepoidsPosition || null, positionContrepoids: d.positionContrepoids || null,
        largeurCabineCalculeeMm: d.largeurCabineCalculeeMm || null, profondeurCabineCalculeeMm: d.profondeurCabineCalculeeMm || null,
        lifecycleStage: d.lifecycleStage || 'engineering', engineeredBy: d.engineeredBy || null,
        totalCostDZD: d.totalCostDZD || null, salePriceDZD: d.salePriceDZD || null, marginPct: d.marginPct || null,
        typeCabine: d.typeCabine || null, typePorte: d.typePorte || null,
        finitionPorteCabine: d.finitionPorteCabine || null, typeChassisArcade: d.typeChassisArcade || null,
        finitionInterieurCabine: d.finitionInterieurCabine || null, revetementSol: d.revetementSol || null,
        largeurPassageLibreMm: d.largeurPassageLibreMm || null, hauteurUtileCabineMm: d.hauteurUtileCabineMm || null,
        typeSuspensionGuidage: d.typeSuspensionGuidage || null, systemeSurcharge: d.systemeSurcharge || null,
        optPanoramique: !!d.optPanoramique, optSecours: !!d.optSecours, optAnnoncesVocales: !!d.optAnnoncesVocales,
        optCctv: !!d.optCctv, optPortesCoupeFeu: !!d.optPortesCoupeFeu, optPanneauTactile: !!d.optPanneauTactile,
        optVentilation: !!d.optVentilation, optBarreaudage: !!d.optBarreaudage, optAlarme: !!d.optAlarme,
      },
    })
    res.status(201).json({ message: 'Commande créée.', order, sync: { success: true } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/orders/:id/status', authenticate, async (req, res) => {
  try {
    const valid = ['BROUILLON','ATTENTE_DESSIN_TECH','ATTENTE_APPROBATION_ADMIN','ATTENTE_DESSIN_2D','ATTENTE_VERIFICATION','PRET_POUR_PRODUCTION','VALIDEE','ANNULEE']
    if (!valid.includes(req.body.status)) return res.status(400).json({ error: 'Statut invalide.' })
    res.json({ order: await prisma.order.update({ where: { id: req.params.id }, data: { status: req.body.status } }) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/orders/:id/production-phase', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ success: true, message: 'Phase de production synchronisée.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/orders/:id/approve-plan', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'ATTENTE_APPROBATION_ADMIN') return res.status(409).json({ error: `Statut: ${order.status}` })
    await prisma.order.update({ where: { id: req.params.id }, data: { status: 'ATTENTE_DESSIN_2D' } })
    res.json({ message: 'Plan approuvé.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/orders/:id/reject-plan', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'ATTENTE_APPROBATION_ADMIN') return res.status(409).json({ error: 'Pas en attente.' })
    await prisma.order.update({ where: { id: req.params.id }, data: { status: 'ATTENTE_DESSIN_TECH' } })
    res.json({ message: 'Plan rejeté.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/orders/:id', authenticate, async (req, res) => {
  try { res.json({ order: await prisma.order.update({ where: { id: req.params.id }, data: req.body }), message: 'Mis à jour.' }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Stock Management ─────────────────────────────────────────────────────
// Items
app.get('/api/stock/items', authenticate, async (req, res) => {
  try {
    const where = {}
    if (req.query.category) where.category = req.query.category
    if (req.query.location) where.location = req.query.location
    if (req.query.supplierId) where.supplierId = req.query.supplierId
    let items = await prisma.stockItem.findMany({ where, include: { supplier: true, _count: { select: { movements: true } } }, orderBy: { name: 'asc' } })
    if (req.query.lowStock === 'true') items = items.filter(i => i.quantity <= i.alertThreshold)
    res.json(items)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/stock/items', authenticate, async (req, res) => {
  try {
    const existing = await prisma.stockItem.findUnique({ where: { reference: req.body.reference } })
    if (existing) return res.status(409).json({ error: 'Cette référence existe déjà.' })
    const item = await prisma.stockItem.create({ data: req.body, include: { supplier: true } })
    res.status(201).json(item)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/stock/items/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.stockItem.findUnique({ where: { id: req.params.id }, include: { supplier: true, movements: { orderBy: { createdAt: 'desc' }, take: 50 } } })
    if (!item) return res.status(404).json({ error: 'Article introuvable.' })
    res.json(item)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/stock/items/:id', authenticate, async (req, res) => {
  try { res.json(await prisma.stockItem.update({ where: { id: req.params.id }, data: req.body })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/stock/items/:id', authenticate, async (req, res) => {
  try { await prisma.stockItem.delete({ where: { id: req.params.id } }); res.json({ success: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/stock/items/:id/image', authenticate, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 requis.' })
    const mime = (mimeType || 'image/png')
    const dataUrl = `data:${mime};base64,${imageBase64}`
    await prisma.stockItem.update({ where: { id: req.params.id }, data: { imageUrl: dataUrl } })
    res.json({ imageUrl: dataUrl })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Suppliers
app.get('/api/stock/suppliers', authenticate, async (req, res) => {
  try { res.json(await prisma.supplier.findMany({ include: { _count: { select: { items: true, movements: true } } }, orderBy: { name: 'asc' } })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/stock/suppliers', authenticate, async (req, res) => {
  try { res.status(201).json(await prisma.supplier.create({ data: req.body })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/stock/suppliers/:id', authenticate, async (req, res) => {
  try {
    const s = await prisma.supplier.findUnique({ where: { id: req.params.id }, include: { items: true } })
    if (!s) return res.status(404).json({ error: 'Fournisseur introuvable.' })
    res.json(s)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.patch('/api/stock/suppliers/:id', authenticate, async (req, res) => {
  try { res.json(await prisma.supplier.update({ where: { id: req.params.id }, data: req.body })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/stock/suppliers/:id', authenticate, async (req, res) => {
  try { await prisma.supplier.delete({ where: { id: req.params.id } }); res.json({ success: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// Movements
app.get('/api/stock/movements', authenticate, async (req, res) => {
  try {
    const where = {}
    if (req.query.itemId) where.itemId = req.query.itemId
    if (req.query.type) where.type = req.query.type
    res.json(await prisma.stockMovement.findMany({ where, include: { item: true, order: { select: { serialNumber: true } }, supplier: true }, orderBy: { createdAt: 'desc' }, take: 100 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/stock/movements', authenticate, async (req, res) => {
  try {
    const movement = await prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.findUnique({ where: { id: req.body.itemId } })
      if (!item) throw new Error('Article introuvable.')
      let newQty = item.quantity
      if (req.body.type === 'ENTRY') newQty += req.body.quantity
      else if (req.body.type === 'EXIT') newQty -= req.body.quantity
      else if (req.body.type === 'ADJUSTMENT') newQty = req.body.quantity
      if (newQty < 0) throw new Error('Stock insuffisant.')
      await tx.stockItem.update({ where: { id: req.body.itemId }, data: { quantity: newQty } })
      return tx.stockMovement.create({ data: { type: req.body.type, quantity: req.body.quantity, itemId: req.body.itemId, orderId: req.body.orderId || null, supplierId: req.body.supplierId || null, reference: req.body.reference, notes: req.body.notes, unitPrice: req.body.unitPrice, totalPrice: req.body.totalPrice, performedBy: req.body.performedBy }, include: { item: { include: { supplier: true } }, order: { select: { serialNumber: true } }, supplier: true } })
    })
    res.status(201).json(movement)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Documents
app.get('/api/stock/documents', authenticate, async (req, res) => {
  try {
    const where = {}
    if (req.query.type) where.documentType = req.query.type
    res.json(await prisma.stockDocument.findMany({ where, include: { supplier: true, order: { select: { serialNumber: true, clientName: true } } }, orderBy: { createdAt: 'desc' }, take: 50 }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/stock/documents', authenticate, async (req, res) => {
  try {
    const d = await prisma.stockDocument.create({ data: { documentType: req.body.documentType, documentNumber: req.body.documentNumber, title: req.body.title, description: req.body.description, supplierId: req.body.supplierId || null, totalHT: req.body.totalHT, totalTVA: req.body.totalTVA, totalTTC: req.body.totalTTC, status: req.body.status || 'EN_ATTENTE' }, include: { supplier: true } })
    res.status(201).json(d)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/stock/documents/:id', authenticate, async (req, res) => {
  try {
    const d = await prisma.stockDocument.findUnique({ where: { id: req.params.id }, include: { supplier: true } })
    if (!d) return res.status(404).json({ error: 'Document introuvable.' })
    res.json(d)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Bon de Commande
app.post('/api/stock/bon-commande', authenticate, async (req, res) => {
  try {
    const doc = await prisma.$transaction(async (tx) => {
      const d = await tx.stockDocument.create({
        data: {
          documentType: 'BON_COMMANDE', documentNumber: req.body.documentNumber,
          title: req.body.title, description: req.body.description,
          supplierId: req.body.supplierId || null,
          totalHT: req.body.totalHT || 0, totalTTC: req.body.totalTTC || 0,
          status: 'VALIDE',
          lines: { create: (req.body.lines || []).map(l => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice || 0, totalPrice: l.totalPrice || 0 })) },
        },
        include: { supplier: true, lines: { include: { item: true } } },
      })
      return d
    })
    res.status(201).json(doc)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Stock Stats
app.get('/api/stock/stats', authenticate, async (req, res) => {
  try {
    const [totalItems, totalSuppliers, recentMovements, allItems] = await Promise.all([
      prisma.stockItem.count(), prisma.supplier.count(),
      prisma.stockMovement.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { item: true } }),
      prisma.stockItem.findMany({ select: { quantity: true, alertThreshold: true } }),
    ])
    res.json({ totalItems, lowStockItems: allItems.filter(i => i.quantity <= i.alertThreshold).length, totalSuppliers, recentMovements, categoryCounts: await prisma.stockItem.groupBy({ by: ['category'], _count: true }) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[API ERROR]', err)
  res.status(err.statusCode || 500).json({ error: err.message || 'Erreur interne.' })
})

export default app
