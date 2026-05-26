const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  officialClubLink: String,
  logoUrl: String,
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  archivedAt: { type: Date, default: null },
  totalBudget: { type: Number, default: 0 },
  remainingBudget: { type: Number, default: 0 },
  incomeSources: {
    organization: { type: Number, default: 0 },
    membershipFees: { type: Number, default: 0 },
    eventIncome: { type: Number, default: 0 },
    sponsorship: { type: Number, default: 0 },
    others: { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Club', clubSchema);
