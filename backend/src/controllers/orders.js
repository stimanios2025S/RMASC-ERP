// ─── RMASC FACTORY — Orders Controller ───────────────────────────────────
import mongoose from 'mongoose'
import path from 'path'
import fs from 'fs'
import Order from '../models/Order.js'
import CAD_Submission from '../models/CAD_Submission.js'
import StockDocument from '../models/StockDocument.js'
import { stampOrderFiles } from '../utils/pdfStamper.js'
import { createOrderSchema, updateOrderSchema, updateStatusSchema, updateProductionPhaseSchema } from '../schemas/validation.js'
import { notifyOrderCreated, notifyOrderStatusChanged, notifyOrderApproval, notifyFileUploaded } from './realtime.js'

const UPLOADS_DIR = path.resolve(process.argv[1] ? path.dirname(process.argv[1]) : '.', '..', 'uploads')

// ─── Helper: add `id` from `_id` for aggregation results ─────────────
function addIdField(doc) {
  if (Array.isArray(doc)) return doc.map(d => addIdField(d))
  if (doc && typeof doc === 'object' && doc._id) {
    doc.id = typeof doc._id === 'object' ? doc._id.toString() : doc._id
    for (const key of ['cadSubmissions', 'lines', 'movements', 'items']) {
      if (Array.isArray(doc[key])) doc[key] = doc[key].map(item => addIdField(item))
    }
  }
  return doc
}

// ─── ASC Serial Number Generator ──────────────────────────────────────────
async function generateAscSerial() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear()).slice(-2)
  const count = await Order.countDocuments()
  let cabinNum = String(count + 1).padStart(3, '0')
  let serial = `ASC-${cabinNum}-${month}-${year}`
  for (let attempt = 0; attempt < 100; attempt++) {
    const exists = await Order.findOne({ serialNumber: serial }).select('_id').lean()
    if (!exists) break
    cabinNum = String(count + 2 + attempt).padStart(3, '0')
    serial = `ASC-${cabinNum}-${month}-${year}`
  }
  if (await Order.findOne({ serialNumber: serial }).select('_id').lean()) {
    throw new Error('Impossible de générer un numéro de série unique — collision persistante.')
  }
  return serial
}

// GET /api/orders
export async function listOrders(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 100))
    const skip = (page - 1) * limit
    const orders = await Order.aggregate([
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $lookup: { from: 'cad_submissions', localField: '_id', foreignField: 'order', as: 'cadSubmissions' } },
      { $addFields: { _count: { $size: '$cadSubmissions' } } },
      { $project: { cadSubmissions: 0 } },
    ]).option({ allowDiskUse: false }).hint({ createdAt: -1 })
    for (const o of orders) {
      if (o.rejectionReason === undefined) o.rejectionReason = null
      if (o.rejectedBy === undefined) o.rejectedBy = null
      if (o.rejectedAt === undefined) o.rejectedAt = null
    }
    res.json(addIdField(orders))
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// GET /api/orders/:id
export async function getOrder(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID de commande invalide.' })
    }
    const order = await Order.findById(req.params.id).populate('cadSubmissions').lean()
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    order.id = order._id.toString()
    if (order.cadSubmissions) {
      order.cadSubmissions = order.cadSubmissions.map(sub => ({
        ...sub, id: sub._id ? sub._id.toString() : sub.id,
      }))
    }
    res.json(order)
  } catch (e) {
    console.error('[getOrder]', e.message)
    res.status(500).json({ error: 'Erreur lors de la récupération de la commande.' })
  }
}

// GET /api/orders/:id/datasheet
export async function getOrderDatasheet(req, res) {
  try {
    // Validate MongoDB ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID de commande invalide.' })
    }
    const order = await Order.findById(req.params.id)
      .populate({ path: 'cadSubmissions', options: { sort: { engineeringType: 1 } } })
      .lean() // Use lean() for better performance and to avoid circular references
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    // Ensure id field is present for frontend
    order.id = order._id.toString()
    if (order.cadSubmissions) {
      order.cadSubmissions = order.cadSubmissions.map(sub => ({
        ...sub, id: sub._id ? sub._id.toString() : sub.id,
      }))
    }
    res.json(order)
  } catch (e) {
    console.error('[getOrderDatasheet]', e.message)
    res.status(500).json({ error: 'Erreur lors de la récupération des données de la commande.' })
  }
}

// POST /api/orders/create-and-sync
export async function createOrder(req, res) {
  try {
    const parsed = createOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      const missing = parsed.error.errors.map(e => e.path.join('.')).join(', ')
      return res.status(400).json({ error: `Champs invalides: ${missing}` })
    }
    const d = parsed.data
    let finalSerial = d.serialNumber?.trim() || null
    if (!finalSerial) finalSerial = await generateAscSerial()
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
    order.status = 'ATTENTE_DESSIN_TECH'
    await order.save()
    res.status(201).json({
      message: 'Commande créée.',
      order: { id: order._id, serialNumber: order.serialNumber, status: order.status, createdAt: order.createdAt },
      sync: { success: true },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// PATCH /api/orders/:id/status
export async function updateOrderStatus(req, res) {
  try {
    const parsed = updateStatusSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Statut invalide.' })
    const order = await Order.findByIdAndUpdate(req.params.id, { status: parsed.data.status }, { new: true })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ order })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// PATCH /api/orders/:id/production-phase
export async function updateProductionPhase(req, res) {
  try {
    const parsed = updateProductionPhaseSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Phase invalide.' })
    const order = await Order.findByIdAndUpdate(req.params.id, { productionPhase: parsed.data.productionPhase }, { new: true })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ success: true, productionPhase: order.productionPhase, message: 'Phase sauvegardée.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// POST /api/orders/:id/upload
export async function uploadFile(req, res) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' })
    const relPath = path.relative(UPLOADS_DIR, req.file.path)
    const fileMeta = {
      fieldname: req.file.fieldname, originalname: req.file.originalname,
      encoding: req.file.encoding, mimetype: req.file.mimetype,
      destination: UPLOADS_DIR, filename: req.file.filename,
      path: relPath, size: req.file.size,
      uploadedBy: req.user?.name || 'Utilisateur', uploadedAt: new Date(),
    }
    order.files.push(fileMeta)
    await order.save()
    res.status(201).json({
      message: 'Fichier uploadé.',
      file: { ...fileMeta, path: undefined, destination: undefined },
      fileId: order.files[order.files.length - 1]._id,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// GET /api/orders/:id/files
export async function listFiles(req, res) {
  try {
    const order = await Order.findById(req.params.id).select('files serialNumber')
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ serialNumber: order.serialNumber, files: addIdField(order.files) })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// GET /api/orders/:id/files/:fileId
export async function downloadFile(req, res) {
  try {
    const order = await Order.findById(req.params.id).select('files')
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    const file = order.files.id(req.params.fileId)
    if (!file) return res.status(404).json({ error: 'Fichier introuvable.' })
    const absPath = path.isAbsolute(file.path) ? file.path : path.join(UPLOADS_DIR, file.path)
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'Fichier physique introuvable sur le disque.' })
    res.setHeader('Content-Disposition', `inline; filename="${file.originalname}"`)
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream')
    res.setHeader('Content-Length', file.size)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    fs.createReadStream(absPath).pipe(res)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// DELETE /api/orders/:id/files/:fileId
export async function deleteFile(req, res) {
  try {
    const order = await Order.findById(req.params.id).select('files')
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    const file = order.files.id(req.params.fileId)
    if (!file) return res.status(404).json({ error: 'Fichier introuvable.' })
    const absPath = path.isAbsolute(file.path) ? file.path : path.join(UPLOADS_DIR, file.path)
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath)
    order.files.pull(req.params.fileId)
    await order.save()
    res.json({ success: true, message: 'Fichier supprimé.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// GET /api/orders/archives
export async function searchArchives(req, res) {
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
}

// GET /api/orders/:id/archive
export async function getOrderArchive(req, res) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    const [cadSubmissions, stockDocuments] = await Promise.all([
      CAD_Submission.find({ order: order._id }).sort({ createdAt: -1 }),
      StockDocument.find({ order: order._id }).populate('supplier').populate({ path: 'lines.item' }).sort({ createdAt: -1 }),
    ])
    res.json({
      order: { id: order._id, serialNumber: order.serialNumber, clientName: order.clientName, clientCity: order.clientCity, status: order.status, createdAt: order.createdAt, completedAt: order.completedAt },
      cadSubmissions: addIdField(cadSubmissions),
      stockDocuments: addIdField(stockDocuments),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// POST /api/orders/:id/approve-plan
export async function approvePlan(req, res) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'ATTENTE_APPROBATION_ADMIN') return res.status(409).json({ error: `Statut: ${order.status}` })
    const adminName = req.user?.name || 'Administrateur'
    const now = new Date()
    order.status = 'ATTENTE_DESSIN_2D'
    order.approvedBy = adminName
    order.approvedAt = now
    const stampResult = await stampOrderFiles(order, { approvedBy: adminName, approvedAt: now, serial: order.serialNumber })
    order.isStamped = stampResult.stamped > 0
    order.stampedAt = now
    order.stampedBy = adminName
    order.stampResults = stampResult.results
    await order.save()
    res.json({
      message: 'Plan approuvé.', approvedBy: order.approvedBy, approvedAt: order.approvedAt,
      stamp: { isStamped: order.isStamped, filesStamped: stampResult.stamped, filesTotal: stampResult.total, filesFailed: stampResult.failed,
        results: stampResult.results.map(r => ({ filename: r.filename, pagesStamped: r.pagesStamped, success: r.success })) },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// POST /api/orders/:id/restamp
export async function restampOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    const adminName = req.user?.name || 'Administrateur'
    const now = new Date()
    const stampResult = await stampOrderFiles(order, { approvedBy: adminName, approvedAt: now, serial: order.serialNumber })
    order.isStamped = stampResult.stamped > 0
    order.stampedAt = now
    order.stampedBy = adminName
    order.stampResults = stampResult.results
    await order.save()
    res.json({ message: 'Cachet électronique réappliqué.', stamp: { isStamped: order.isStamped, filesStamped: stampResult.stamped, filesTotal: stampResult.total } })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// POST /api/orders/:id/reject-plan
export async function rejectPlan(req, res) {
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
}

// POST /api/orders/:id/mark-delivery
export async function markDelivery(req, res) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'PRET_POUR_PRODUCTION') return res.status(409).json({ error: `Statut actuel: ${order.status}` })
    order.status = 'EN_LIVRAISON'
    await order.save()
    res.json({ message: '✅ Commande marquée prête pour livraison.', order })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// POST /api/orders/:id/confirm-delivery
export async function confirmDelivery(req, res) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'EN_LIVRAISON') return res.status(409).json({ error: `Statut actuel: ${order.status}` })
    order.status = 'LIVREE'
    order.lifecycleStage = 'delivered'
    order.completedAt = new Date()
    await order.save()
    res.json({ message: '✅ Livraison confirmée. Commande terminée.', order })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// PATCH /api/orders/:id (admin full update)
export async function updateOrder(req, res) {
  try {
    const parsed = updateOrderSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Données invalides.' })
    const allowed = ['clientName','clientEmail','clientPhone','clientCity','serialNumber',
      'typeMotorisation','sousTypeElectrique','vitesseMs','nombreEtages','clientPhone2',
      'largeurGaineMm','profondeurGaineMm','hauteurGaineMm','profondeurCuvetteMm','hauteurDernierEtageMm',
      'contrepoidsPosition','positionContrepoids','largeurCabineCalculeeMm','profondeurCabineCalculeeMm',
      'materiauCabine','materiauPortes','materiauParois','materiauSol',
      'typeCabine','typePorte','finitionPorteCabine','typeChassisArcade',
      'finitionInterieurCabine','revetementSol','largeurPassageLibreMm','hauteurUtileCabineMm',
      'typeSuspensionGuidage','systemeSurcharge','projectName','priority','notes',
      'lifecycleStage','engineeredBy','totalCostDZD','salePriceDZD','marginPct',
      'optPanoramique','optSecours','optAnnoncesVocales','optCctv','optPortesCoupeFeu',
      'optPanneauTactile','optVentilation','optBarreaudage','optAlarme','status']
    const update = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key]
    }
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json({ order, message: '✅ Commande mise à jour avec succès.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// DELETE /api/orders/:id
export async function deleteOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id).select('files')
    if (order) {
      for (const file of (order.files || [])) {
        if (file.path) {
          const absPath = path.isAbsolute(file.path) ? file.path : path.join(UPLOADS_DIR, file.path)
          if (fs.existsSync(absPath)) try { fs.unlinkSync(absPath) } catch {}
        }
      }
    }
    await CAD_Submission.deleteMany({ order: req.params.id })
    await Order.findByIdAndDelete(req.params.id)
    res.json({ success: true, message: 'Commande et fichiers supprimés.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
}
