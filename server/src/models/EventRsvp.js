const mongoose = require('mongoose');

const eventRsvpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, enum: ['going', 'cancelled'], default: 'going' },
}, { timestamps: true });

eventRsvpSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('EventRsvp', eventRsvpSchema);
