// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Catalog Model (Administrable Settings)
//  Stores all configurable lists: materials, options, types, steps.
//  The admin can add/remove/modify these from the Settings page.
// ═══════════════════════════════════════════════════════════════════════════

import mongoose from 'mongoose'

const catalogItemSchema = new mongoose.Schema({
  value:     { type: String, required: true },
  label:     { type: String, required: true },
  desc:      String,
  active:    { type: Boolean, default: true },
  order:     { type: Number, default: 0 },
}, { _id: false })

const catalogSchema = new mongoose.Schema({
  // Each key is a catalog category
  category:  { type: String, required: true, unique: true },
  label:     { type: String, required: true },
  items:     [catalogItemSchema],
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.model('Catalog', catalogSchema)
