import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

const portalUserSchema = new mongoose.Schema({
  loginId:   { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  name:      { type: String, required: true },
  role:      { type: String, required: true, enum: ['ADMIN','INGENIEUR_1','INGENIEUR_2','VERIFICATEUR','PRODUCTION','MAGASINIER'] },
  canChangePassword: { type: Boolean, default: false },
}, { timestamps: true })

// ─── Pre-save hook: auto-hash password if modified ─────────────────────────
// This ensures passwords are NEVER stored as plain text, regardless of which
// code path saves the document.
portalUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  // Only hash if it's not already bcrypt-hashed
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) return next()
  try {
    this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS)
    next()
  } catch (err) {
    next(err)
  }
})

// ─── Pre-findOneAndUpdate hook: hash password when using findByIdAndUpdate ──
portalUserSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate()
  if (!update || !update.password) return next()
  if (typeof update.password === 'string' &&
      (update.password.startsWith('$2a$') || update.password.startsWith('$2b$') || update.password.startsWith('$2y$'))) {
    return next()
  }
  try {
    if (typeof update.password === 'string') {
      update.password = await bcrypt.hash(update.password, BCRYPT_ROUNDS)
    }
    next()
  } catch (err) {
    next(err)
  }
})

export default mongoose.model('PortalUser', portalUserSchema)
