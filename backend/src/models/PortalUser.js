import mongoose from 'mongoose'

const portalUserSchema = new mongoose.Schema({
  loginId:   { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  name:      { type: String, required: true },
  role:      { type: String, required: true, enum: ['ADMIN','INGENIEUR_1','INGENIEUR_2','VERIFICATEUR','PRODUCTION','MAGASINIER'] },
  canChangePassword: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('PortalUser', portalUserSchema)
