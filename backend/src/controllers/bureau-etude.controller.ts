// ─── Bureau d'étude Controller ─────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express'
import { submitCadSchema, rejectCadSchema } from '../schemas/bureau-etude.schema.js'
import * as bureauService from '../services/bureau-etude.service.js'

// POST /api/bureau-etude/submit-cad
export async function submitCad(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = submitCadSchema.parse(req.body)
    const submission = await bureauService.submitCad(parsed)
    res.status(201).json({
      message: 'Fichier CAD soumis avec succès. En attente d\'approbation.',
      submission,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/bureau-etude/stream-cad/:id
export async function streamCad(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const viewportData = await bureauService.streamCad(req.params.id)

    // Security: set headers that explicitly block download and caching
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'inline',                        // NOT attachment
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-RMASC-Secure-Viewer': 'true',                        // Custom header for the frontend verifier
    })

    res.json({ viewport: viewportData })
  } catch (err) {
    next(err)
  }
}

// POST /api/bureau-etude/approve/:cadId
export async function approveCad(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.user?.sub || req.body.adminId || 'admin-default'
    const submission = await bureauService.approveCad(req.params.cadId, adminId)
    res.json({
      message: 'Plan approuvé. Le tampon électronique a été appliqué.',
      submission,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/bureau-etude/reject/:cadId
export async function rejectCad(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = rejectCadSchema.parse(req.body)
    const adminId = req.user?.sub || parsed.adminId
    const submission = await bureauService.rejectCad(req.params.cadId, parsed.motifRejet, adminId)
    res.json({
      message: 'Plan rejeté. Le rapport a été envoyé à l\'ingénieur.',
      submission,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/bureau-etude/submissions/:orderId
export async function listSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const submissions = await bureauService.listSubmissionsByOrder(req.params.orderId)
    res.json({ submissions })
  } catch (err) {
    next(err)
  }
}
