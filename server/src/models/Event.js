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
  disclaimerTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'DisclaimerTemplate', default: null },
  disclaimerTitle: { type: String, default: null },
  disclaimerContent: { type: String, default: null },
  disclaimerType: { type: String, enum: ['text', 'pdf'], default: 'text' },
  disclaimerFileUrl: { type: String, default: null },
  assignedCommittee: [committeeAssignmentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true }
}, { timestamps: true });

// Writes that change disclaimer fields must go through Document#save()
// (or Model.create()). findOneAndUpdate/updateOne bypass this validator.
eventSchema.pre('save', function(next) {
  if (this.requiresSafetyDisclaimer) {
    if (!this.disclaimerTitle) {
      return next(new Error('Disclaimer title is required when requiresSafetyDisclaimer is true'));
    }
    if (this.disclaimerType === 'text') {
      if (!this.disclaimerContent) {
        return next(new Error('Disclaimer content is required for text-type disclaimers'));
      }
      this.disclaimerFileUrl = null;
    } else if (this.disclaimerType === 'pdf') {
      if (!this.disclaimerFileUrl) {
        return next(new Error('Disclaimer file is required for pdf-type disclaimers'));
      }
      this.disclaimerContent = null;
    }
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);
