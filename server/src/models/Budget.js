const mongoose = require('mongoose');

const budgetLineItemSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  budgetedAmount: { type: Number, default: 0 },
  actualAmount: { type: Number, default: 0 },
  notes: { type: String, default: '', trim: true },
}, { _id: true });

const budgetSchema = new mongoose.Schema({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  lineItems: { type: [budgetLineItemSchema], default: [] },
  budgetedAmount: { type: Number, default: 0 },
  actualAmount: { type: Number, default: 0 },
}, { timestamps: true });

budgetSchema.index({ clubId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
