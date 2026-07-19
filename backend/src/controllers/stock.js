// ─── RMASC FACTORY — Stock Controller ────────────────────────────────────
import mongoose from 'mongoose'
import StockItem from '../models/StockItem.js'
import Supplier from '../models/Supplier.js'
import StockMovement from '../models/StockMovement.js'
import StockDocument from '../models/StockDocument.js'
import { createStockItemSchema, createMovementSchema, createSupplierSchema, createStockDocumentSchema, bonCommandeSchema, imageUploadSchema } from '../schemas/validation.js'

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

// ═══ ITEMS ══════════════════════════════════════════════════════════════
export async function listItems(req, res) {
  try {
    const filter = {}
    if (req.query.category) filter.category = req.query.category
    if (req.query.location) filter.location = req.query.location
    if (req.query.supplierId) filter.supplier = req.query.supplierId
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 100))
    const skip = (page - 1) * limit
    let items = await StockItem.find(filter).populate('supplier', 'name').sort({ name: 1 }).skip(skip).limit(limit).lean()
    if (req.query.lowStock === 'true') items = items.filter(i => i.quantity <= i.alertThreshold)
    res.json(items)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function createItem(req, res) {
  try {
    const parsed = createStockItemSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message })
    if (await StockItem.findOne({ reference: parsed.data.reference })) return res.status(409).json({ error: 'Référence existe déjà.' })
    const item = await StockItem.create(parsed.data)
    res.status(201).json(item)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function getItem(req, res) {
  try {
    const item = await StockItem.findById(req.params.id).populate('supplier')
    if (!item) return res.status(404).json({ error: 'Article introuvable.' })
    const movements = await StockMovement.find({ item: item._id }).sort({ createdAt: -1 }).limit(50)
    res.json({ ...item.toJSON(), movements })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function updateItem(req, res) {
  try { res.json(await StockItem.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(500).json({ error: e.message }) }
}

export async function deleteItem(req, res) {
  try { await StockItem.findByIdAndDelete(req.params.id); res.json({ success: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
}

export async function uploadItemImage(req, res) {
  try {
    const parsed = imageUploadSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'imageBase64 requis.' })
    const dataUrl = `data:${parsed.data.mimeType || 'image/png'};base64,${parsed.data.imageBase64}`
    await StockItem.findByIdAndUpdate(req.params.id, { imageUrl: dataUrl })
    res.json({ imageUrl: dataUrl })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ═══ SUPPLIERS ═════════════════════════════════════════════════════════
export async function listSuppliers(req, res) {
  try {
    const suppliers = await Supplier.aggregate([
      { $lookup: { from: 'stockitems', localField: '_id', foreignField: 'supplier', as: 'items' } },
      { $lookup: { from: 'stockmovements', localField: '_id', foreignField: 'supplier', as: 'movements' } },
      { $addFields: { _count: { items: { $size: '$items' }, movements: { $size: '$movements' } } } },
      { $sort: { name: 1 } },
    ])
    res.json(addIdField(suppliers))
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function createSupplier(req, res) {
  try {
    const parsed = createSupplierSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message })
    res.status(201).json(await Supplier.create(parsed.data))
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function getSupplier(req, res) {
  try {
    const s = await Supplier.findById(req.params.id)
    if (!s) return res.status(404).json({ error: 'Fournisseur introuvable.' })
    const items = await StockItem.find({ supplier: s._id })
    res.json({ ...s.toJSON(), items })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function updateSupplier(req, res) {
  try { res.json(await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true })) }
  catch (e) { res.status(500).json({ error: e.message }) }
}

export async function deleteSupplier(req, res) {
  try { await Supplier.findByIdAndDelete(req.params.id); res.json({ success: true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
}

// ═══ MOVEMENTS ═════════════════════════════════════════════════════════
export async function listMovements(req, res) {
  try {
    const filter = {}
    if (req.query.itemId) filter.item = req.query.itemId
    if (req.query.type) filter.type = req.query.type
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 100))
    const skip = (page - 1) * limit
    res.json(await StockMovement.find(filter).populate('item').populate('order', 'serialNumber').populate('supplier').sort({ createdAt: -1 }).skip(skip).limit(limit))
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function createMovement(req, res) {
  const session = await mongoose.startSession()
  try {
    const parsed = createMovementSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message })
    session.startTransaction()
    const item = await StockItem.findById(parsed.data.itemId).session(session)
    if (!item) { await session.abortTransaction(); session.endSession(); return res.status(404).json({ error: 'Article introuvable.' }) }
    let newQty = item.quantity
    if (parsed.data.type === 'ENTRY') newQty += parsed.data.quantity
    else if (parsed.data.type === 'EXIT') newQty -= parsed.data.quantity
    else if (parsed.data.type === 'ADJUSTMENT') newQty = parsed.data.quantity
    if (newQty < 0) { await session.abortTransaction(); session.endSession(); return res.status(400).json({ error: 'Stock insuffisant.' }) }
    item.quantity = newQty
    await item.save({ session })
    const [movement] = await StockMovement.create([{
      type: parsed.data.type, quantity: parsed.data.quantity, item: parsed.data.itemId,
      order: parsed.data.orderId || undefined, supplier: parsed.data.supplierId || undefined,
      reference: parsed.data.reference || undefined, notes: parsed.data.notes || undefined,
      unitPrice: parsed.data.unitPrice || 0, totalPrice: parsed.data.totalPrice || 0,
      performedBy: parsed.data.performedBy,
    }], { session })
    await session.commitTransaction()
    session.endSession()
    res.status(201).json(await movement.populate(['item', { path: 'order', select: 'serialNumber' }, 'supplier']))
  } catch (e) {
    if (session.inTransaction()) await session.abortTransaction()
    session.endSession()
    res.status(500).json({ error: e.message })
  }
}

// ═══ DOCUMENTS ═════════════════════════════════════════════════════════
export async function listDocuments(req, res) {
  try {
    const filter = {}
    if (req.query.type) filter.documentType = req.query.type
    res.json(await StockDocument.find(filter).populate('supplier').populate('order', 'serialNumber clientName').sort({ createdAt: -1 }).limit(50))
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function createDocument(req, res) {
  try {
    const parsed = createStockDocumentSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message })
    const doc = await StockDocument.create({
      documentType: parsed.data.documentType, documentNumber: parsed.data.documentNumber,
      title: parsed.data.title, description: parsed.data.description,
      supplier: parsed.data.supplierId || undefined,
      totalHT: parsed.data.totalHT, totalTVA: parsed.data.totalTVA, totalTTC: parsed.data.totalTTC,
      status: parsed.data.status,
    })
    res.status(201).json(doc)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function getDocument(req, res) {
  try {
    const doc = await StockDocument.findById(req.params.id).populate('supplier')
    if (!doc) return res.status(404).json({ error: 'Document introuvable.' })
    res.json(doc)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ═══ BON DE COMMANDE ═══════════════════════════════════════════════════
export async function createBonCommande(req, res) {
  try {
    const parsed = bonCommandeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message })
    const lines = parsed.data.lines.map(l => ({
      item: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice || 0, totalPrice: l.totalPrice || 0,
    }))
    const doc = await StockDocument.create({
      documentType: 'BON_COMMANDE', documentNumber: parsed.data.documentNumber,
      title: parsed.data.title, description: parsed.data.description,
      supplier: parsed.data.supplierId || undefined,
      totalHT: parsed.data.totalHT || 0, totalTTC: parsed.data.totalTTC || 0,
      status: 'VALIDE', lines,
    })
    res.status(201).json(await doc.populate(['supplier', { path: 'lines.item' }]))
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ═══ STATS ═════════════════════════════════════════════════════════════
export async function getStockStats(req, res) {
  try {
    const [totalItems, totalSuppliers, recentMovements, allItems, categoryCounts] = await Promise.all([
      StockItem.countDocuments(),
      Supplier.countDocuments(),
      StockMovement.find().populate('item', 'name reference').sort({ createdAt: -1 }).limit(10).lean(),
      StockItem.find().select('quantity alertThreshold').lean(),
      StockItem.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]).option({ allowDiskUse: false }),
    ])
    res.json({
      totalItems,
      lowStockItems: allItems.filter(i => i.quantity <= i.alertThreshold).length,
      totalSuppliers,
      recentMovements: addIdField(recentMovements),
      categoryCounts,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
}
