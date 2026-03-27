const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  totalBudget: { type: Number, default: 0 },
  remainingBudget: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Club', clubSchema);
