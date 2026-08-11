// ─── RMASC FACTORY — Standalone Parts Controller ─────────────────────────
import path from 'path'
import fs from 'fs'
import StandalonePart from '../models/StandalonePart.js'
import { createPartSchema, updatePartStatusSchema } from '../schemas/validation.js'
import { notifyPartCreated, notifyPartStatusChanged } from './realtime.js'

const UPLOADS_DIR = path.resolve(process.argv[1] ? path.dirname(process.argv[1]) : '.', '..', 'uploads')

// ─── Garde-fou atelier : chaque atelier ne voit/touche que SES pièces ────
// PRODUCTION (Atelier 1) gère les pièces ATELIER_1 + legacy (champ absent),
// PRODUCTION_2 (Atelier 2) ne gère que les pièces ATELIER_2.
function canManagePart(user, part) {
  if (user?.role === 'ADMIN' || user?.role === 'INGENIEUR_2') return true
  if (user?.role === 'PRODUCTION')   return part.atelier !== 'ATELIER_2'
  if (user?.role === 'PRODUCTION_2') return part.atelier === 'ATELIER_2'
  return false
}

// Filtre Mongo par rôle (null = champ absent → legacy = Atelier 1)
function atelierFilter(role) {
  if (role === 'PRODUCTION')   return { atelier: { $in: ['ATELIER_1', null] } }
  if (role === 'PRODUCTION_2') return { atelier: 'ATELIER_2' }
  return {}
}

async function generatePartSerial() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear()).slice(-2)
  const count = await StandalonePart.countDocuments()
  let partNum = String(count + 1).padStart(3, '0')
  let serial = `PART-${partNum}-${month}-${year}`
  for (let attempt = 0; attempt < 100; attempt++) {
    const exists = await StandalonePart.findOne({ partNumber: serial }).select('_id').lean()
    if (!exists) break
    partNum = String(count + 2 + attempt).padStart(3, '0')
    serial = `PART-${partNum}-${month}-${year}`
  }
  if (await StandalonePart.findOne({ partNumber: serial }).select('_id').lean()) {
    throw new Error('Impossible de générer un numéro de pièce unique.')
  }
  return serial
}

export async function createPart(req, res) {
  try {
    const parsed = createPartSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message })
    const allowedRoles = ['INGENIEUR_2', 'PRODUCTION', 'PRODUCTION_2']
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé. Seuls Ingénieur 2 et Production peuvent créer des pièces solo.' })
    }
    const partNumber = await generatePartSerial()
    const fileMeta = req.file ? {
      originalname: req.file.originalname, mimetype: req.file.mimetype,
      filename: req.file.filename, path: req.file.path, size: req.file.size,
    } : undefined
    const part = await StandalonePart.create({
      partNumber, projectName: parsed.data.projectName.trim(),
      material: parsed.data.material || undefined, thickness: parsed.data.thickness || undefined,
      quantity: parseInt(parsed.data.quantity) || 1,
      cadFileUrl: req.file ? `/api/uploads/${req.file.filename}` : undefined,
      fileMeta, status: 'EN_ATTENTE',
      atelier: parsed.data.atelier || 'ATELIER_1', // atelier choisi par l'Ingénieur 2
      createdBy: req.user.name || req.user.userId,
    })
    // ⚡ Notify Production in real-time (SSE) — new solo part available
    notifyPartCreated(part)
    res.status(201).json({
      message: 'Pièce solo créée.',
      part: { id: part._id, partNumber: part.partNumber, projectName: part.projectName, material: part.material, thickness: part.thickness, quantity: part.quantity, cadFileUrl: part.cadFileUrl, status: part.status, createdAt: part.createdAt },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function listActiveParts(_req, res) {
  try {
    const parts = await StandalonePart.find({ status: { $ne: 'TERMINE' }, ...atelierFilter(_req.user?.role) })
      .sort({ createdAt: -1 }).select('partNumber projectName material thickness quantity cadFileUrl fileMeta status createdAt createdBy atelier')
    res.json(parts)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function listAllParts(_req, res) {
  try {
    const parts = await StandalonePart.find(atelierFilter(_req.user?.role)).sort({ createdAt: -1 })
      .select('partNumber projectName material thickness quantity cadFileUrl fileMeta status createdAt createdBy atelier')
    res.json(parts)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function updatePartStatus(req, res) {
  try {
    const parsed = updatePartStatusSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Statut invalide.' })
    // Garde-fou atelier : chaque atelier ne fait avancer QUE ses propres pièces
    if (req.user?.role === 'PRODUCTION' || req.user?.role === 'PRODUCTION_2') {
      const existing = await StandalonePart.findById(req.params.id).select('atelier').lean()
      if (!existing) return res.status(404).json({ error: 'Pièce introuvable.' })
      if (!canManagePart(req.user, existing)) {
        return res.status(403).json({ error: 'Accès refusé. Cette pièce est destinée à l\'autre atelier.' })
      }
    }
    const part = await StandalonePart.findByIdAndUpdate(req.params.id, { status: parsed.data.status }, { new: true })
      .select('partNumber projectName material thickness quantity cadFileUrl status createdAt atelier')
    if (!part) return res.status(404).json({ error: 'Pièce introuvable.' })
    // ⚡ Notify Ingénieur 2 in real-time (SSE) — part started / finished
    notifyPartStatusChanged(part, req.user?.name || 'Production')
    res.json({ message: `Statut mis à jour → ${parsed.data.status}`, part })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function deletePart(req, res) {
  try {
    if (req.user?.role === 'PRODUCTION' || req.user?.role === 'PRODUCTION_2') {
      const existing = await StandalonePart.findById(req.params.id).select('atelier').lean()
      if (!existing) return res.status(404).json({ error: 'Pièce introuvable.' })
      if (!canManagePart(req.user, existing)) {
        return res.status(403).json({ error: 'Accès refusé. Cette pièce est destinée à l\'autre atelier.' })
      }
    }
    const part = await StandalonePart.findByIdAndDelete(req.params.id)
    if (!part) return res.status(404).json({ error: 'Pièce introuvable.' })
    res.json({ message: `Pièce ${part.partNumber} supprimée.`, partNumber: part.partNumber })
  } catch (e) { res.status(500).json({ error: e.message }) }
}
