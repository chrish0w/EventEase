const mongoose = require('mongoose');

const disclaimerTemplateSchema = new mongoose.Schema({
  clubId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  title:     { type: String, required: true, trim: true },
  content:   { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

disclaimerTemplateSchema.index({ clubId: 1, title: 1 }, { unique: true });

module.exports = mongoose.model('DisclaimerTemplate', disclaimerTemplateSchema);
