import mongoose from 'mongoose'

const movementSchema = new mongoose.Schema({
  type:        { type: String, required: true, enum: ['ENTRY','EXIT','ADJUSTMENT','TRANSFER'] },
  quantity:    { type: Number, required: true },
  unitPrice:   Number,
  totalPrice:  Number,
  item:        { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: true },
  order:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  supplier:    { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  document:    { type: mongoose.Schema.Types.ObjectId, ref: 'StockDocument' },
  reference:   String,
  notes:       String,
  performedBy: String,
}, { timestamps: true })

movementSchema.index({ item: 1 })
movementSchema.index({ order: 1 })
movementSchema.index({ createdAt: -1 })

export default mongoose.model('StockMovement', movementSchema)
