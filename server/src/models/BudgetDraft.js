const mongoose = require('mongoose');

const budgetDraftLineItemSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  budgetedAmount: { type: Number, default: 0 },
  actualAmount: { type: Number, default: 0 },
  notes: { type: String, default: '', trim: true },
}, { _id: true });

const budgetDraftSchema = new mongoose.Schema({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  draftId: { type: String, required: true },
  lineItems: { type: [budgetDraftLineItemSchema], default: [] },
  budgetedAmount: { type: Number, default: 0 },
  actualAmount: { type: Number, default: 0 },
}, { timestamps: true });

budgetDraftSchema.index({ clubId: 1, userId: 1, draftId: 1 }, { unique: true });

module.exports = mongoose.model('BudgetDraft', budgetDraftSchema);
