const mongoose = require('mongoose');

const clubMembershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  role: { type: String, enum: ['president', 'committee', 'user'], default: 'user' },
  committeeRole: {
    type: String,
    enum: ['finance', 'logistics', 'equipment', 'transport', 'general'],
  },
}, { timestamps: true });

clubMembershipSchema.index({ userId: 1, clubId: 1 }, { unique: true });

module.exports = mongoose.model('ClubMembership', clubMembershipSchema);
