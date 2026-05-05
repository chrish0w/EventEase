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
  safetyFiles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SafetyFile' }],
  assignedCommittee: [committeeAssignmentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true }
}, { timestamps: true });

eventSchema.pre('save', function(next) {
  this.requiresSafetyDisclaimer = this.category === 'outdoor' || this.safetyFiles.length > 0;
  next();
});

module.exports = mongoose.model('Event', eventSchema);
