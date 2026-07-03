// ─── Stock Controller ────────────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express'
import * as stockService from '../services/stock.service.js'

// ─── Items ──────────────────────────────────────────────────────────────────
export async function createItem(req: Request, res: Response, next: NextFunction) {
  try { const item = await stockService.createItem(req.body); res.status(201).json(item) }
  catch (e) { next(e) }
}

export async function listItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, lowStock, location, supplierId } = req.query
    const items = await stockService.listItems(category as string, lowStock === 'true', location as string, supplierId as string)
    res.json(items)
  } catch (e) { next(e) }
}

export async function getItem(req: Request, res: Response, next: NextFunction) {
  try { const item = await stockService.getItem(req.params.id); res.json(item) }
  catch (e) { next(e) }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  try { const item = await stockService.updateItem(req.params.id, req.body); res.json(item) }
  catch (e) { next(e) }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  try { await stockService.deleteItem(req.params.id); res.json({ success: true }) }
  catch (e) { next(e) }
}

// ─── Suppliers ──────────────────────────────────────────────────────────────
export async function createSupplier(req: Request, res: Response, next: NextFunction) {
  try { const s = await stockService.createSupplier(req.body); res.status(201).json(s) }
  catch (e) { next(e) }
}

export async function listSuppliers(req: Request, res: Response, next: NextFunction) {
  try { const suppliers = await stockService.listSuppliers(); res.json(suppliers) }
  catch (e) { next(e) }
}

export async function getSupplier(req: Request, res: Response, next: NextFunction) {
  try { const s = await stockService.getSupplier(req.params.id); res.json(s) }
  catch (e) { next(e) }
}

export async function updateSupplier(req: Request, res: Response, next: NextFunction) {
  try { const s = await stockService.updateSupplier(req.params.id, req.body); res.json(s) }
  catch (e) { next(e) }
}

export async function deleteSupplier(req: Request, res: Response, next: NextFunction) {
  try { await stockService.deleteSupplier(req.params.id); res.json({ success: true }) }
  catch (e) { next(e) }
}

// ─── Movements ──────────────────────────────────────────────────────────────
export async function createMovement(req: Request, res: Response, next: NextFunction) {
  try { const m = await stockService.createMovement(req.body); res.status(201).json(m) }
  catch (e) { next(e) }
}

export async function listMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const { itemId, type } = req.query
    const movements = await stockService.listMovements(itemId as string, type as string)
    res.json(movements)
  } catch (e) { next(e) }
}

// ─── Documents ──────────────────────────────────────────────────────────────
export async function createDocument(req: Request, res: Response, next: NextFunction) {
  try { const d = await stockService.createDocument(req.body); res.status(201).json(d) }
  catch (e) { next(e) }
}

export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const { type } = req.query
    const docs = await stockService.listDocuments(type as string)
    res.json(docs)
  } catch (e) { next(e) }
}

export async function getDocument(req: Request, res: Response, next: NextFunction) {
  try { const d = await stockService.getDocument(req.params.id); res.json(d) }
  catch (e) { next(e) }
}

// ─── Bon de Commande ──────────────────────────────────────────────────────
export async function createBonCommande(req: Request, res: Response, next: NextFunction) {
  try { const d = await stockService.createBonCommande(req.body); res.status(201).json(d) }
  catch (e) { next(e) }
}

// ─── Stats ──────────────────────────────────────────────────────────────────
export async function getStockStats(req: Request, res: Response, next: NextFunction) {
  try { const stats = await stockService.getStockStats(); res.json(stats) }
  catch (e) { next(e) }
}

// ─── Image Upload (serverless-compatible: stores as base64 data URL) ──────
export async function uploadItemImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { imageBase64, mimeType } = req.body
    if (!imageBase64) { res.status(400).json({ error: 'imageBase64 requis.' }); return }

    const mime = (mimeType || 'image/png')
    const dataUrl = `data:${mime};base64,${imageBase64}`
    await stockService.updateItem(id, { imageUrl: dataUrl })
    res.json({ imageUrl: dataUrl })
  } catch (e) { next(e) }
}
