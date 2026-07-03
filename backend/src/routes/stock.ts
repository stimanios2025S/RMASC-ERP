// ─── Stock Routes ──────────────────────────────────────────────────────────
import { Router } from 'express'
import * as ctrl from '../controllers/stock.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// ── Items ──────────────────────────────────────────────────────────────────
router.get('/items',           authenticate, ctrl.listItems)
router.post('/items',          authenticate, ctrl.createItem)
router.get('/items/:id',       authenticate, ctrl.getItem)
router.patch('/items/:id',     authenticate, ctrl.updateItem)
router.delete('/items/:id',    authenticate, ctrl.deleteItem)
router.post('/items/:id/image', authenticate, ctrl.uploadItemImage)

// ── Suppliers ──────────────────────────────────────────────────────────────
router.get('/suppliers',       authenticate, ctrl.listSuppliers)
router.post('/suppliers',      authenticate, ctrl.createSupplier)
router.get('/suppliers/:id',   authenticate, ctrl.getSupplier)
router.patch('/suppliers/:id', authenticate, ctrl.updateSupplier)
router.delete('/suppliers/:id',authenticate, ctrl.deleteSupplier)

// ── Movements ──────────────────────────────────────────────────────────────
router.get('/movements',       authenticate, ctrl.listMovements)
router.post('/movements',      authenticate, ctrl.createMovement)

// ── Documents ──────────────────────────────────────────────────────────────
router.get('/documents',       authenticate, ctrl.listDocuments)
router.post('/documents',      authenticate, ctrl.createDocument)
router.get('/documents/:id',   authenticate, ctrl.getDocument)

// ── Bon de Commande ────────────────────────────────────────────────────────
router.post('/bon-commande',   authenticate, ctrl.createBonCommande)

// ── Stats ──────────────────────────────────────────────────────────────────
router.get('/stats',           authenticate, ctrl.getStockStats)

export default router
