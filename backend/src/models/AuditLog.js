// ─── RMASC FACTORY — Audit Log Model ────────────────────────────────────
// Enregistre chaque action importante pour traçabilité.
// Stocké dans MongoDB : collection 'auditlogs'

import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  action:      { type: String, required: true },      // 'CREATE_ORDER', 'UPDATE_STATUS', 'LOGIN', etc.
  resource:    { type: String, required: true },      // 'order', 'stock', 'user', etc.
  resourceId:  { type: String },                       // ID de l'objet concerné
  userId:      { type: String },                       // Qui a fait l'action
  userName:    { type: String },                       // Nom lisible
  details:     { type: mongoose.Schema.Types.Mixed },  // Infos supplémentaires
  ip:          { type: String },                       // Adresse IP
  userAgent:   { type: String },                       // Navigateur
  statusCode:  { type: Number },                       // Code HTTP retourné
  duration:    { type: Number },                       // Temps d'exécution (ms)
}, { timestamps: true })

// Index pour les recherches rapides
auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ userId: 1, createdAt: -1 })
auditLogSchema.index({ resourceId: 1 })

export default mongoose.model('AuditLog', auditLogSchema)
