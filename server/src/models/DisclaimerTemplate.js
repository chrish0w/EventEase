const mongoose = require('mongoose');

const disclaimerTemplateSchema = new mongoose.Schema({
  clubId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
  title:     { type: String, required: true, trim: true },
  type:      { type: String, enum: ['text', 'pdf'], default: 'text', required: true },
  content:   { type: String, default: null },
  fileUrl:   { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

disclaimerTemplateSchema.index({ clubId: 1, title: 1 }, { unique: true });

disclaimerTemplateSchema.pre('validate', function(next) {
  if (this.type === 'text') {
    if (!this.content || !this.content.trim()) {
      return next(new Error('Text templates require content'));
    }
    this.fileUrl = null;
  } else if (this.type === 'pdf') {
    if (!this.fileUrl) {
      return next(new Error('PDF templates require a fileUrl'));
    }
    this.content = null;
  }
  next();
});

module.exports = mongoose.model('DisclaimerTemplate', disclaimerTemplateSchema);
