import mongoose from 'mongoose'

const lineSchema = new mongoose.Schema({
  item:       { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: true },
  quantity:   { type: Number, required: true },
  unitPrice:  Number,
  totalPrice: Number,
}, { timestamps: true })

const documentSchema = new mongoose.Schema({
  documentType:   { type: String, required: true, enum: ['BON_COMMANDE','BON_LIVRAISON','FACTURE','BON_SORTIE','INVENTAIRE'] },
  documentNumber: { type: String, required: true, unique: true },
  title:          { type: String, required: true },
  description:    String,
  supplier:       { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  order:          { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  totalHT:        Number,
  totalTVA:       Number,
  totalTTC:       Number,
  status:         { type: String, default: 'EN_ATTENTE', enum: ['BROUILLON','EN_ATTENTE','VALIDE','ANNULE'] },
  movement:       { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
  lines:          [lineSchema],
}, { timestamps: true })

documentSchema.index({ documentType: 1 })
documentSchema.index({ documentNumber: 1 })

export default mongoose.model('StockDocument', documentSchema)
