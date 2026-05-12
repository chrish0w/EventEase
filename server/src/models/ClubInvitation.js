const mongoose = require('mongoose');

const clubInvitationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, trim: true },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  role: { type: String, enum: ['president', 'committee', 'user'], required: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'accepted', 'cancelled'], default: 'pending' },
  expiresAt: Date,
  acceptedAt: Date,
}, { timestamps: true });

clubInvitationSchema.index({ email: 1, clubId: 1, role: 1, status: 1 });

module.exports = mongoose.model('ClubInvitation', clubInvitationSchema);
