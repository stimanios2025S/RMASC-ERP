// ─── Users Routes ──────────────────────────────────────────────────────────
import { Router } from 'express'
import * as ctrl from '../controllers/users.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// ── Auth ──────────────────────────────────────────────────────────────────
router.post('/login', ctrl.login)

// ── Admin only ───────────────────────────────────────────────────────────
router.get('/',          authenticate, ctrl.listUsers)
router.patch('/:id/name', authenticate, ctrl.updateUserName)
router.put('/admin',     authenticate, ctrl.updateAdminCredentials)

// ── First-time seed ──────────────────────────────────────────────────────
router.post('/seed',     ctrl.seedUsers)

export default router
