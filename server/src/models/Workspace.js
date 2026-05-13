const mongoose = require('mongoose');

const WORKSPACE_TYPES = ['budget', 'logistics', 'equipment', 'transport', 'safety', 'documents', 'tasks', 'custom'];
const WORKSPACE_STATUS = ['not_started', 'in_progress', 'ready', 'blocked'];

const workspaceSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: WORKSPACE_TYPES, default: 'custom' },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: WORKSPACE_STATUS, default: 'not_started' },
  resourceLinks: [{
    label: String,
    url: String,
    kind: { type: String, enum: ['doc', 'sheet', 'form', 'slide', 'link'], default: 'link' },
  }],
  files: [{
    originalName: String,
    filename: String,
    size: Number,
    mimetype: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Workspace', workspaceSchema);
module.exports.WORKSPACE_TYPES = WORKSPACE_TYPES;
module.exports.WORKSPACE_STATUS = WORKSPACE_STATUS;
