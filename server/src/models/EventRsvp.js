const mongoose = require('mongoose');

const eventRsvpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, enum: ['going', 'cancelled'], default: 'going' },
  attendeeName: { type: String, trim: true },
  contactNumber: { type: String, trim: true },
  notes: { type: String, trim: true },
  agreedSafetyDisclaimer: { type: Boolean, default: false },
}, { timestamps: true });

eventRsvpSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('EventRsvp', eventRsvpSchema);
