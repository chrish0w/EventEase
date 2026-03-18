const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  message: String,
}, { timestamps: true });

joinRequestSchema.index({ userId: 1, clubId: 1 }, { unique: true });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
