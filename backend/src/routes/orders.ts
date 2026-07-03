// ─── Orders Routes ─────────────────────────────────────────────────────────
import { Router } from 'express'
import type { Request, Response } from 'express'
import * as ordersController from '../controllers/orders.controller.js'
import * as createAndSyncController from '../controllers/create-and-sync.controller.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

// ─── Combined create + PDF + sync endpoint ─────────────────────────────────
router.post('/create-and-sync', authenticate, requireAdmin, createAndSyncController.createAndSync)

// ─── PLM Workflow: Advance order status ────────────────────────────────────
router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const validStatuses: string[] = [
      'ATTENTE_DESSIN_TECH', 'ATTENTE_APPROBATION_ADMIN', 'ATTENTE_DESSIN_2D',
      'ATTENTE_VERIFICATION', 'PRET_POUR_PRODUCTION', 'VALIDEE', 'ANNULEE', 'BROUILLON',
    ]
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Statut invalide: ' + req.body.status })
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    })
    res.json({ order })
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Commande introuvable.' })
    res.status(500).json({ error: err?.message || 'Erreur serveur' })
  }
})

// ─── PLM Workflow: Admin approve Plan d'Installation ───────────────────────
router.post('/:id/approve-plan', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'ATTENTE_APPROBATION_ADMIN') {
      return res.status(409).json({ error: 'Le plan n\'est pas en attente d\'approbation. Statut actuel: ' + order.status })
    }
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'ATTENTE_DESSIN_2D' },
    })
    res.json({ order: updated, message: 'Plan d\'Installation approuvé. Passage au Dessin 2D Cabine.' })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur serveur' })
  }
})

// ─── PLM Workflow: Admin reject Plan d'Installation ────────────────────────
router.post('/:id/reject-plan', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { reason } = req.body
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'ATTENTE_APPROBATION_ADMIN') {
      return res.status(409).json({ error: 'Le plan n\'est pas en attente d\'approbation.' })
    }
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: 'ATTENTE_DESSIN_TECH',
      },
    })
    res.json({ order: updated, message: `Plan rejeté. Motif: ${reason || 'Non spécifié'}. Retour à l\'Ingénieur 1.` })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur serveur' })
  }
})

// ─── PLM Workflow: Submit to production (Chief Verifier) ──────────────────
router.post('/:id/submit-production', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    if (order.status !== 'ATTENTE_VERIFICATION') {
      return res.status(409).json({ error: 'La commande n\'est pas en attente de vérification finale.' })
    }
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'PRET_POUR_PRODUCTION' },
    })
    res.json({ order: updated, message: '✅ Commande verifiée et soumise à la production.' })
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur serveur' })
  }
})

// ─── Datasheet: full order with all fields for Fiche Technique ───────────
router.get('/:id/datasheet', authenticate, async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { cadSubmissions: { orderBy: { engineeringType: 'asc' } } },
    })
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' })
    res.json(order)
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur serveur' })
  }
})

// ─── Admin-only order management ───────────────────────────────────────────
router.post('/',      authenticate, requireAdmin, ordersController.create)
router.patch('/:id',  authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { clientName, clientCity } = req.body
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { ...(clientName && { clientName }), ...(clientCity && { clientCity }) },
    })
    res.json({ order, message: 'Commande mise à jour.' })
  } catch (err: any) {
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Commande introuvable.' })
    res.status(500).json({ error: err?.message || 'Erreur serveur' })
  }
})
router.get('/',       authenticate, ordersController.list)
router.get('/:id',    authenticate, ordersController.getById)

export default router
