import mongoose from 'mongoose'

const cadSchema = new mongoose.Schema({
  order:            { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  engineeringType:  { type: String, required: true, enum: ['DESSIN_TECH_1','DESSIN_TECH_2','MODEL_2D','MODEL_3D'] },
  engineerName:     { type: String, required: true },
  fileHash:         { type: String, required: true, unique: true },
  fileMimeType:     { type: String, required: true },
  fileSizeBytes:    { type: Number, required: true },
  storageKey:       { type: String, required: true, unique: true },
  status:           { type: String, default: 'EN_ATTENTE', enum: ['EN_ATTENTE','APPROUVE','REJETE'] },
  rejectionReason:  String,
  approvedAt:       Date,
  approvalToken:    String,
  approvedBy:       String,
  rejectionLog:     [mongoose.Schema.Types.Mixed],
  externalNotifiedAt: Date,
}, { timestamps: true })

cadSchema.index({ order: 1, engineeringType: 1 }, { unique: true })

export default mongoose.model('CAD_Submission', cadSchema)
