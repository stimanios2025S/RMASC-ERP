// ─── RMASC FACTORY — Pièces Solo (Standalone Parts) ────────────────────────
// One-off custom manufacturing tasks decoupled from full elevator projects.
// Accessible by: INGENIEUR_2 (2D CAD workstation) + PRODUCTION (shop floor).

import mongoose from 'mongoose'

const standalonePartSchema = new mongoose.Schema({
  partNumber:  { type: String, required: true, unique: true },               // Auto-generated: PART-XXX-MM-YY
  projectName: { type: String, required: true },
  quantity:    { type: Number, required: true, default: 1 },
  material:    { type: String },                                              // e.g. "Acier", "Inox", "Aluminium"
  thickness:   { type: String },                                              // e.g. "2mm", "3mm", "5mm"
  cadFileUrl:  { type: String },                                              // Disk path to uploaded DXF/DWG/PDF

  status: {
    type: String,
    default: 'EN_ATTENTE',
    enum: ['EN_ATTENTE', 'EN_PRODUCTION', 'TERMINE'],
  },

  // ── File metadata (mirroring the Order file pattern) ──────────────────
  fileMeta: {
    originalname: String,
    mimetype:     String,
    filename:     String,
    path:         String,
    size:         Number,
  },

  createdBy: String,  // User who submitted the part
}, { timestamps: true })

export default mongoose.model('StandalonePart', standalonePartSchema)
