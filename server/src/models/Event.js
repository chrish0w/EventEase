const mongoose = require('mongoose');

const committeeAssignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, trim: true, default: '' }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  location: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, default: 'General' },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled'],
    default: 'draft'
  },
  capacity: { type: Number, required: true },
  rsvpDeadline: { type: Date, required: true },
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
