const mongoose = require('mongoose');

const organisationRegistrationRequestSchema = new mongoose.Schema({
  organisationName: { type: String, required: true, trim: true },
  organisationDescription: { type: String, required: true, trim: true },
  organisationType: { type: String, required: true, trim: true },
  officialWebsite: { type: String, required: true, trim: true },
  officialEmail: { type: String, required: true, trim: true, lowercase: true },
  adminFullName: { type: String, required: true, trim: true },
  adminEmail: { type: String, required: true, trim: true, lowercase: true },
  adminRole: { type: String, required: true, trim: true },
  contactNumber: { type: String, trim: true },
  expectedClubs: { type: String, required: true, trim: true },
  expectedUsers: { type: String, required: true, trim: true },
  mainUseCase: { type: String, required: true, trim: true },
  additionalOfficialLink: { type: String, trim: true },
  additionalNotes: { type: String, trim: true },
  proofFile: {
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: String, required: true },
  },
  emailConfirmationToken: { type: String, required: true },
  emailConfirmedAt: Date,
  adminNotes: { type: String, trim: true },
  createdOrganisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation' },
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

module.exports = mongoose.model('OrganisationRegistrationRequest', organisationRegistrationRequestSchema);
