const mongoose = require('mongoose');

const committeeAssignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: {
    type: String,
    enum: ['finance', 'logistics', 'equipment', 'transport', 'general'],
    default: 'general'
  }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
  location: String,
  category: {
    type: String,
    enum: ['social', 'sports', 'outdoor', 'finance', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled'],
    default: 'draft'
  },
  capacity: Number,
  rsvpDeadline: Date,
  requiresSafetyDisclaimer: { type: Boolean, default: false },
  assignedCommittee: [committeeAssignmentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

eventSchema.pre('save', function(next) {
  if (this.category === 'outdoor') this.requiresSafetyDisclaimer = true;
  next();
});

module.exports = mongoose.model('Event', eventSchema);
