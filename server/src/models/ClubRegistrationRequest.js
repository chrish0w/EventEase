const mongoose = require('mongoose');

const clubRegistrationRequestSchema = new mongoose.Schema({
  clubName: { type: String, required: true, trim: true },
  clubDescription: { type: String, required: true, trim: true },
  clubCategory: { type: String, required: true, trim: true },
  officialClubLink: { type: String, required: true, trim: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true },
  requesterFullName: { type: String, required: true, trim: true },
  requesterEmail: { type: String, required: true, trim: true, lowercase: true },
  requesterRole: { type: String, required: true, trim: true },
  isPresident: { type: Boolean, required: true },
  presidentFullName: { type: String, trim: true },
  presidentEmail: { type: String, trim: true, lowercase: true },
  proofFile: {
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: String, required: true },
  },
  additionalNotes: { type: String, trim: true },
  emailConfirmationToken: { type: String, required: true },
  emailConfirmedAt: Date,
  adminNotes: { type: String, trim: true },
  createdClubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
  emailLog: [{
    to: String,
    subject: String,
    body: String,
    sentAt: Date,
  }],
  status: {
    type: String,
    enum: ['awaiting_email_confirmation', 'pending_review', 'more_info_needed', 'approved', 'rejected'],
    default: 'awaiting_email_confirmation',
  },
}, { timestamps: true });

module.exports = mongoose.model('ClubRegistrationRequest', clubRegistrationRequestSchema);
