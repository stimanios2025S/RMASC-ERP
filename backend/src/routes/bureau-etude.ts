// ─── Bureau d'étude Routes ─────────────────────────────────────────────────
import { Router } from 'express'
import * as bureauController from '../controllers/bureau-etude.controller.js'
import { authenticate, requireAdmin, requireWebhookKey } from '../middleware/auth.js'

const router = Router()

// ─── Webhook endpoint (called by the external engineering software) ────────
// Protected by shared API key, not user JWT.
router.post('/submit-cad', requireWebhookKey, bureauController.submitCad)

// ─── Admin review endpoints ────────────────────────────────────────────────
router.get('/stream-cad/:id', authenticate, bureauController.streamCad)
router.post('/approve/:cadId', authenticate, requireAdmin, bureauController.approveCad)
router.post('/reject/:cadId',  authenticate, requireAdmin, bureauController.rejectCad)
router.get('/submissions/:orderId', authenticate, bureauController.listSubmissions)

export default router
