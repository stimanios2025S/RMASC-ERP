import mongoose from 'mongoose'

const stockItemSchema = new mongoose.Schema({
  reference:      { type: String, required: true, unique: true },
  name:           { type: String, required: true },
  description:    String,
  category:       { type: String, required: true },
  unit:           { type: String, default: 'Unité' },
  quantity:       { type: Number, default: 0 },
  alertThreshold: { type: Number, default: 5 },
  unitPrice:      Number,
  imageUrl:       String,
  location:       { type: String, default: 'Stock 1' },
  supplier:       { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
}, { timestamps: true })

stockItemSchema.index({ category: 1 })
stockItemSchema.index({ supplier: 1 })

export default mongoose.model('StockItem', stockItemSchema)
