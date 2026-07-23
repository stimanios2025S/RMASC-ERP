import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  clientName:           { type: String, required: true },
  clientEmail:          String,
  clientPhone:          { type: String, required: true },
  clientPhone2:         String,
  clientCity:           { type: String, required: true },
  serialNumber:         { type: String, required: true, unique: true },
  projectName:          String,
  status:               { type: String, default: 'BROUILLON', enum: ['BROUILLON','ATTENTE_DESSIN_TECH','ATTENTE_APPROBATION_ADMIN','ATTENTE_DESSIN_2D','ATTENTE_VERIFICATION','PRET_POUR_PRODUCTION','EN_LIVRAISON','LIVREE','VALIDEE','ANNULEE'] },

  typeMotorisation:     { type: String, required: true },
  sousTypeElectrique:   String,
  vitesseMs:            String,
  nombreEtages:         String,

  largeurGaineMm:       { type: String, required: true },
  profondeurGaineMm:    { type: String, required: true },
  hauteurGaineMm:       { type: String, required: true },

  materiauCabine:       String,
  materiauPortes:       String,
  materiauParois:       String,
  materiauSol:          String,

  typeCabine:           String,
  typePorte:            String,
  finitionPorteCabine:  String,
  typeChassisArcade:    String,
  finitionInterieurCabine: String,
  revetementSol:        String,

  profondeurCuvetteMm:     String,
  hauteurDernierEtageMm:   String,
  contrepoidsPosition:     String,
  positionContrepoids:     String,
  largeurCabineCalculeeMm: String,
  profondeurCabineCalculeeMm: String,

  lifecycleStage:       String,
  engineeredBy:         String,
  totalCostDZD:         Number,
  salePriceDZD:         Number,
  marginPct:            Number,
  completedAt:          Date,

  largeurPassageLibreMm:   String,
  hauteurUtileCabineMm:    String,
  typeSuspensionGuidage:   String,
  systemeSurcharge:        String,

  optPanoramique:     { type: Boolean, default: false },
  optSecours:         { type: Boolean, default: false },
  optAnnoncesVocales: { type: Boolean, default: false },
  optCctv:            { type: Boolean, default: false },
  optPortesCoupeFeu:  { type: Boolean, default: false },
  optPanneauTactile:  { type: Boolean, default: false },
  optVentilation:     { type: Boolean, default: false },
  optBarreaudage:     { type: Boolean, default: false },
  optAlarme:          { type: Boolean, default: false },

  // ── Priorité & contrôle Admin ─────────────────────────────────────────
  priority:           { type: String, default: 'NORMAL', enum: ['URGENT','HAUTE','NORMAL','BASSE'] },
  notes:              String,
  serialNumberLocked: { type: Boolean, default: false },
  // ── Approval / Rejection tracking ─────────────────────────────────────
  approvedBy:         String,   // Admin name who approved the tech draw
  approvedAt:         Date,     // When the plan was approved
  rejectionReason:    String,   // Why the plan was rejected (shown to engineers)
  rejectedBy:         String,   // Who rejected
  rejectedAt:         Date,     // When rejected

  // ── PDF Electronic Stamp tracking ─────────────────────────────────────
  isStamped:          { type: Boolean, default: false }, // All PDFs stamped with electronic seal
  stampedAt:          Date,     // When the stamp was applied
  stampedBy:          String,   // Who applied the electronic stamp
  stampResults:       [mongoose.Schema.Types.Mixed], // Per-file stamp results [{fileId, filename, success, pagesStamped}]

  // ── Production tracking (persisted to DB, syncs across all browsers) ───
  productionPhase:    { type: String, default: 'decoupe', enum: ['decoupe','pliage','soudeur','peinture','assemblage','emballage','livraison'] },

  // ── Server-disk file storage ──────────────────────────────────────────
  files: [{
    fieldname:   String,
    originalname:String,
    encoding:    String,
    mimetype:    String,
    destination: String,
    filename:    String,
    path:        String,
    size:        Number,
    uploadedBy:  String,
    uploadedAt:  { type: Date, default: Date.now },
  }],
}, { timestamps: true })

orderSchema.virtual('cadSubmissions', {
  ref: 'CAD_Submission',
  localField: '_id',
  foreignField: 'order',
})

// ─── Performance indexes for common queries ──────────────────────────────
// NOTE: serialNumber has unique:true inline (auto-indexed) — do NOT duplicate.
orderSchema.index({ status: 1, createdAt: -1 })   // Status filters + sort
orderSchema.index({ createdAt: -1 })               // Recent orders
orderSchema.index({ clientName: 1 })               // Search by client

export default mongoose.model('Order', orderSchema)
