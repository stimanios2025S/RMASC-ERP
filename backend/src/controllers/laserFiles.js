// ─── RMASC FACTORY — Laser Files Controller (Technical File Management) ──
// Pipeline de fichiers de découpe laser avec tamponnage numérique :
//   Ingénieur 2  →  upload PDF (EN_ATTENTE) + métadonnées (matériau,
//                   épaisseur, quantité, commande/fiche technique)
//   Production   →  aperçu navigateur + "Approuver & Tamponner" :
//                   incruste public/cachet.png.png en bas à droite de CHAQUE
//                   page (copie aplatie, original intact) → APPROVED_LASER
// Modifier un PDF approuvé → retour EN_ATTENTE (approbation invalidée).
// Supprimer → purge des fichiers disque + base (visible pour les deux rôles).

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import LaserFile from '../models/LaserFile.js'
import { createLaserFileSchema } from '../schemas/validation.js'
import {
  notifyLaserCreated, notifyLaserApproved, notifyLaserReplaced, notifyLaserDeleted,
} from './realtime.js'

// Module ESM ("type": "module") → __dirname n'existe pas nativement
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Même dossier uploads que api.mjs (racine projet /uploads)
const UPLOADS_DIR = path.resolve(process.argv[1] ? path.dirname(process.argv[1]) : '.', '..', 'uploads')

const ALLOWED_ROLES = ['INGENIEUR_2', 'PRODUCTION', 'ADMIN']
const APPROVAL_ROLES = ['PRODUCTION', 'ADMIN']

// ─── Localisation du cachet (robuste : double extension réelle du fichier) ──
function findStamp() {
  const candidates = [
    // Racine projet /public (là où vit réellement cachet.png.png)
    path.resolve(__dirname, '..', '..', '..', 'public', 'cachet.png.png'),
    path.resolve(__dirname, '..', '..', '..', 'public', 'cachet.png'),
    // Dist build (copie Vite)
    path.resolve(__dirname, '..', '..', '..', 'dist', 'cachet.png.png'),
    path.resolve(__dirname, '..', '..', '..', 'dist', 'cachet.png'),
    // Backend public (si un jour déplacé)
    path.resolve(__dirname, '..', '..', 'public', 'cachet.png.png'),
    path.resolve(__dirname, '..', '..', 'public', 'cachet.png'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

// ─── Moteur de tamponnage (pdf-lib) : cachet bas-droite sur chaque page ──
// Le PDF est ré-écrit avec l'image incrustée directement dans le flux de
// page → résultat aplati, original intact. Ajoute une ligne de traçabilité
// (qui + quand) au-dessus du cachet.
async function stampPdf(originalPath, stampPath, outputPath, approvedBy) {
  const pdfBytes = await fs.promises.readFile(originalPath)
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })

  const stampBytes = await fs.promises.readFile(stampPath)
  let stampImage
  try {
    stampImage = await pdfDoc.embedPng(stampBytes)
  } catch {
    stampImage = await pdfDoc.embedJpg(stampBytes)
  }

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pages = pdfDoc.getPages()

  const margin = 24
  const targetWidth = 150 // px de base — adapté à chaque page si besoin

  for (const page of pages) {
    const { width, height } = page.getSize()
    const aspect = stampImage.height / stampImage.width
    const w = Math.min(targetWidth, width * 0.35)
    const h = w * aspect
    const x = width - w - margin
    const y = margin

    // Cachet (coin bas droit)
    page.drawImage(stampImage, { x, y, width: w, height: h })

    // Traçabilité au-dessus du cachet
    const label = `APPROUVÉ — ${approvedBy} — ${new Date().toLocaleDateString('fr-FR')}`
    const labelWidth = font.widthOfTextAtSize(label, 7)
    page.drawText(label, {
      x: x + w - labelWidth,
      y: Math.min(y + h + 8, height - 10),
      size: 7,
      font,
      color: rgb(0.8, 0.12, 0.12),
    })
  }

  const outBytes = await pdfDoc.save()
  await fs.promises.writeFile(outputPath, outBytes)
}

// ─── Sérialisation propre pour le frontend ────────────────────────────────
function toJson(l) {
  return {
    id: l._id.toString(),
    orderId: l.orderId ? l.orderId.toString() : null,
    orderSerial: l.orderSerial || null,
    orderClient: l.orderClient || null,
    projectName: l.projectName,
    material: l.material || null,
    thickness: l.thickness || null,
    quantity: l.quantity,
    status: l.status,
    originalFile: l.originalFile ? {
      originalname: l.originalFile.originalname,
      mimetype: l.originalFile.mimetype,
      filename: l.originalFile.filename,
      size: l.originalFile.size,
    } : null,
    stampedFile: l.stampedFile ? {
      originalname: l.stampedFile.originalname,
      mimetype: l.stampedFile.mimetype,
      filename: l.stampedFile.filename,
      size: l.stampedFile.size,
    } : null,
    fileUrl: l.originalFile ? `/api/uploads/${l.originalFile.filename}` : null,
    stampedFileUrl: l.stampedFile ? `/api/uploads/${l.stampedFile.filename}` : null,
    createdBy: l.createdBy || null,
    approvedBy: l.approvedBy || null,
    approvedAt: l.approvedAt || null,
    stampedAt: l.stampedAt || null,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }
}

// ─── POST /api/laser-files/create — Ingénieur 2 soumet un fichier ───────
export async function createLaserFile(req, res) {
  try {
    if (!ALLOWED_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé. Rôles autorisés : Ingénieur 2, Production, Admin.' })
    }
    const parsed = createLaserFileSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message })
    if (!req.file) return res.status(400).json({ error: 'Fichier PDF requis.' })
    if (req.file.mimetype !== 'application/pdf') {
      // Nettoie le fichier refusé pour ne pas polluer le disque
      try { fs.unlinkSync(req.file.path) } catch {}
      return res.status(400).json({ error: 'Seuls les fichiers PDF sont acceptés pour la découpe laser.' })
    }

    const laser = await LaserFile.create({
      orderId: parsed.data.orderId || undefined,
      orderSerial: parsed.data.orderSerial || undefined,
      orderClient: parsed.data.orderClient || undefined,
      projectName: parsed.data.projectName.trim(),
      material: parsed.data.material || undefined,
      thickness: parsed.data.thickness || undefined,
      quantity: parseInt(parsed.data.quantity) || 1,
      originalFile: {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
      },
      status: 'EN_ATTENTE',
      createdBy: req.user.name || req.user.userId,
    })

    // ⚡ Notifie Production en temps réel (SSE)
    notifyLaserCreated(laser)
    res.status(201).json({ message: 'Fichier laser soumis — en attente d\'approbation.', file: toJson(laser) })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ─── GET /api/laser-files — liste complète (les deux rôles) ─────────────
export async function listLaserFiles(_req, res) {
  try {
    if (!ALLOWED_ROLES.includes(_req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé.' })
    }
    const files = await LaserFile.find().sort({ createdAt: -1 }).lean()
    res.json(files.map(toJson))
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ─── GET /api/laser-files/:id — détail ──────────────────────────────────
export async function getLaserFile(req, res) {
  try {
    if (!ALLOWED_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé.' })
    }
    const laser = await LaserFile.findById(req.params.id).lean()
    if (!laser) return res.status(404).json({ error: 'Fichier laser introuvable.' })
    res.json(toJson(laser))
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ─── POST /api/laser-files/:id/approve — Approuver & Tamponner ──────────
export async function approveLaserFile(req, res) {
  try {
    if (!APPROVAL_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé. Seule la Production (ou Admin) peut approuver et tamponner.' })
    }
    const laser = await LaserFile.findById(req.params.id)
    if (!laser) return res.status(404).json({ error: 'Fichier laser introuvable.' })
    if (laser.status === 'APPROVED_LASER') {
      return res.status(400).json({ error: 'Ce fichier est déjà approuvé et tamponné.' })
    }

    const stampPath = findStamp()
    if (!stampPath) {
      return res.status(500).json({ error: 'Cachet introuvable sur le serveur (public/cachet.png.png manquant).' })
    }
    const originalPath = laser.originalFile?.path
    if (!originalPath || !fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Fichier PDF original introuvable sur le disque.' })
    }

    const stampedFilename = `stamped-${laser.originalFile.filename}`
    const stampedPath = path.join(UPLOADS_DIR, stampedFilename)
    await stampPdf(originalPath, stampPath, stampedPath, req.user.name || req.user.userId)

    const cleanBase = path.basename(laser.originalFile.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')
    laser.stampedFile = {
      originalname: `TAMPONNE_${cleanBase}`,
      mimetype: 'application/pdf',
      filename: stampedFilename,
      path: stampedPath,
      size: fs.statSync(stampedPath).size,
    }
    laser.status = 'APPROVED_LASER'
    laser.approvedBy = req.user.name || req.user.userId
    laser.approvedAt = new Date()
    laser.stampedAt = new Date()
    await laser.save()

    // ⚡ Notifie Ingénieur 2 en temps réel (SSE) — le fichier tamponné apparaît
    notifyLaserApproved(laser)
    res.json({ message: 'Fichier approuvé & tamponné ✅', file: toJson(laser) })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ─── POST /api/laser-files/:id/replace — remplacer le fichier ───────────
// Remplacer un PDF approuvé → statut EN_ATTENTE (approbation invalidée).
export async function replaceLaserFile(req, res) {
  try {
    if (!ALLOWED_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé.' })
    }
    const laser = await LaserFile.findById(req.params.id)
    if (!laser) return res.status(404).json({ error: 'Fichier laser introuvable.' })
    if (!req.file) return res.status(400).json({ error: 'Fichier PDF requis.' })
    if (req.file.mimetype !== 'application/pdf') {
      try { fs.unlinkSync(req.file.path) } catch {}
      return res.status(400).json({ error: 'Seuls les fichiers PDF sont acceptés.' })
    }

    // Supprime les anciens fichiers (original + version tamponnée)
    try { if (laser.originalFile?.path && fs.existsSync(laser.originalFile.path)) fs.unlinkSync(laser.originalFile.path) } catch {}
    try { if (laser.stampedFile?.path && fs.existsSync(laser.stampedFile.path)) fs.unlinkSync(laser.stampedFile.path) } catch {}

    laser.originalFile = {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
    }
    laser.stampedFile = undefined
    laser.status = 'EN_ATTENTE'
    laser.approvedBy = undefined
    laser.approvedAt = undefined
    laser.stampedAt = undefined

    // Met à jour aussi les métadonnées si fournies
    const parsed = createLaserFileSchema.safeParse(req.body)
    if (parsed.success) {
      if (parsed.data.projectName) laser.projectName = parsed.data.projectName.trim()
      if (parsed.data.material !== undefined) laser.material = parsed.data.material || undefined
      if (parsed.data.thickness !== undefined) laser.thickness = parsed.data.thickness || undefined
      if (parsed.data.quantity) laser.quantity = parseInt(parsed.data.quantity) || 1
      if (parsed.data.orderId) {
        laser.orderId = parsed.data.orderId
        laser.orderSerial = parsed.data.orderSerial || undefined
        laser.orderClient = parsed.data.orderClient || undefined
      }
    }
    await laser.save()

    // ⚡ Notifie les deux rôles (SSE) — retour En Attente
    notifyLaserReplaced(laser)
    res.json({ message: 'Fichier remplacé — approbation invalidée, retour en En Attente.', file: toJson(laser) })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ─── DELETE /api/laser-files/:id — suppression définitive (les deux rôles) ─
export async function deleteLaserFile(req, res) {
  try {
    if (!ALLOWED_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé.' })
    }
    const laser = await LaserFile.findById(req.params.id)
    if (!laser) return res.status(404).json({ error: 'Fichier laser introuvable.' })

    // Purge des fichiers disque
    try { if (laser.originalFile?.path && fs.existsSync(laser.originalFile.path)) fs.unlinkSync(laser.originalFile.path) } catch {}
    try { if (laser.stampedFile?.path && fs.existsSync(laser.stampedFile.path)) fs.unlinkSync(laser.stampedFile.path) } catch {}

    await LaserFile.findByIdAndDelete(req.params.id)

    // ⚡ Notifie les deux rôles (SSE) — disparaît des deux listes
    notifyLaserDeleted(laser)
    res.json({ message: 'Fichier laser supprimé (pour tous les utilisateurs).' })
  } catch (e) { res.status(500).json({ error: e.message }) }
}
