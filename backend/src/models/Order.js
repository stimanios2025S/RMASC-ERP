import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  clientName:           { type: String, required: true },
  clientEmail:          String,
  clientPhone:          { type: String, required: true },
  clientCity:           { type: String, required: true },
  serialNumber:         { type: String, required: true, unique: true },
  status:               { type: String, default: 'BROUILLON', enum: ['BROUILLON','ATTENTE_DESSIN_TECH','ATTENTE_APPROBATION_ADMIN','ATTENTE_DESSIN_2D','ATTENTE_VERIFICATION','PRET_POUR_PRODUCTION','VALIDEE','ANNULEE'] },

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
}, { timestamps: true })

orderSchema.virtual('cadSubmissions', {
  ref: 'CAD_Submission',
  localField: '_id',
  foreignField: 'order',
})

orderSchema.set('toJSON', { virtuals: true })
orderSchema.set('toObject', { virtuals: true })

export default mongoose.model('Order', orderSchema)
