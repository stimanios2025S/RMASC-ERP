// ─── RMASC FACTORY — Standalone Parts Controller ─────────────────────────
import StandalonePart from '../models/StandalonePart.js'
import { createPartSchema, updatePartStatusSchema } from '../schemas/validation.js'

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
    const allowedRoles = ['INGENIEUR_2', 'PRODUCTION']
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
      cadFileUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
      fileMeta, status: 'EN_ATTENTE', createdBy: req.user.name || req.user.userId,
    })
    res.status(201).json({
      message: 'Pièce solo créée.',
      part: { id: part._id, partNumber: part.partNumber, projectName: part.projectName, material: part.material, thickness: part.thickness, quantity: part.quantity, cadFileUrl: part.cadFileUrl, status: part.status, createdAt: part.createdAt },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function listActiveParts(_req, res) {
  try {
    const parts = await StandalonePart.find({ status: { $ne: 'TERMINE' } })
      .sort({ createdAt: -1 }).select('partNumber projectName material thickness quantity cadFileUrl status createdAt createdBy')
    res.json(parts)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function listAllParts(_req, res) {
  try {
    const parts = await StandalonePart.find().sort({ createdAt: -1 })
      .select('partNumber projectName material thickness quantity cadFileUrl status createdAt createdBy')
    res.json(parts)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

export async function updatePartStatus(req, res) {
  try {
    const parsed = updatePartStatusSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Statut invalide.' })
    const part = await StandalonePart.findByIdAndUpdate(req.params.id, { status: parsed.data.status }, { new: true })
      .select('partNumber projectName material thickness quantity cadFileUrl status createdAt')
    if (!part) return res.status(404).json({ error: 'Pièce introuvable.' })
    res.json({ message: `Statut mis à jour → ${parsed.data.status}`, part })
  } catch (e) { res.status(500).json({ error: e.message }) }
}
