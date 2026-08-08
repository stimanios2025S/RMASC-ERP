// ─── RMASC FACTORY — Fichiers Laser (Technical File Management) ──────────
// Fichiers de découpe laser liés à une commande / fiche technique.
// Pipeline : Ingénieur 2 soumet (EN_ATTENTE) → Production approuve & tamponne
// (APPROVED_LASER). Le tamponnage incruste public/cachet.png.png (coin bas
// droit) dans une COPIE du PDF — l'original reste intact.
// Visible par : INGENIEUR_2 (soumission + suivi) + PRODUCTION (approbation).

import mongoose from 'mongoose'

const laserFileSchema = new mongoose.Schema({
  // ── Liaison commande / fiche technique ───────────────────────────────
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderSerial: String,   // snapshot du serialNumber (affichage sans populate)
  orderClient: String,   // snapshot du clientName
  projectName: { type: String, required: true },

  // ── Métadonnées de découpe ───────────────────────────────────────────
  material:  String,                       // e.g. "Acier", "Inox", "Aluminium"
  thickness: String,                       // e.g. "2mm", "3mm", "5mm"
  quantity:  { type: Number, default: 1 },

  // ── Cycle de vie ─────────────────────────────────────────────────────
  status: {
    type: String,
    default: 'EN_ATTENTE',
    enum: ['EN_ATTENTE', 'APPROVED_LASER'],
  },

  // ── Fichiers (original + copie tamponnée) ────────────────────────────
  originalFile: {
    originalname: String,
    mimetype:     String,
    filename:     String,
    path:         String,
    size:         Number,
  },
  stampedFile: {
    originalname: String,
    mimetype:     String,
    filename:     String,
    path:         String,
    size:         Number,
  },

  // ── Traçabilité ──────────────────────────────────────────────────────
  createdBy:  String,   // qui a soumis le fichier
  approvedBy: String,   // qui a approuvé & tamponné
  approvedAt: Date,
  stampedAt:  Date,
}, { timestamps: true })

export default mongoose.model('LaserFile', laserFileSchema)
