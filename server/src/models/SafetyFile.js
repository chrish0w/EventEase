const mongoose = require('mongoose');

const safetyFileSchema = new mongoose.Schema({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true, default: 'application/pdf' },
  size: { type: Number, required: true },
  data: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUsedAt: Date,
}, { timestamps: true });

safetyFileSchema.index({ clubId: 1, createdAt: -1 });

module.exports = mongoose.model('SafetyFile', safetyFileSchema);
