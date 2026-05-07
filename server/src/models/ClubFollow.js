const mongoose = require('mongoose');

const clubFollowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
}, { timestamps: true });

clubFollowSchema.index({ userId: 1, clubId: 1 }, { unique: true });

module.exports = mongoose.model('ClubFollow', clubFollowSchema);
