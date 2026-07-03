// ─── RMASC FACTORY — Backend Serverless Entry (Vercel) ────────────────
// Vercel calls this file for all /api/* requests.
// It's a pure ESM Express app that connects to Neon via Prisma.

import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis
const prisma = globalForPrisma.__prisma || new PrismaClient({ log: ['error'] })
if (!globalForPrisma.__prisma) globalForPrisma.__prisma = prisma

const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'rmasc-production-secret'

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
    if (!user || user.password !== password) return res.status(401).json({ error: 'Identifiants incorrects.' })
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
    for (const u of defaults) await prisma.portalUser.create({ data: u })
    res.json({ message: 'Utilisateurs créés.' })
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
    if (admin) await prisma.portalUser.update({ where: { id: admin.id }, data: { loginId: req.body.loginId, password: req.body.newPassword } })
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
        profondeurCuvetteMm: d.profondeurCuvetteMm || null, hauteurDernierEtageMm: d.hauteurDernierEtageMm || null,
        contrepoidsPosition: d.contrepoidsPosition || null, positionContrepoids: d.positionContrepoids || null,
        largeurCabineCalculeeMm: d.largeurCabineCalculeeMm || null, profondeurCabineCalculeeMm: d.profondeurCabineCalculeeMm || null,
        lifecycleStage: d.lifecycleStage || 'engineering', engineeredBy: d.engineeredBy || null,
        totalCostDZD: d.totalCostDZD || null, salePriceDZD: d.salePriceDZD || null, marginPct: d.marginPct || null,
        materiauCabine: d.materiauCabine || null, materiauPortes: d.materiauPortes || null, materiauParois: d.materiauParois || null,
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

app.use((err, _req, res, _next) => {
  console.error('[API ERROR]', err)
  res.status(err.statusCode || 500).json({ error: err.message || 'Erreur interne.' })
})

export default app
