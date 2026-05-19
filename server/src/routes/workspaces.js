const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Task = require('../models/Task');
const Event = require('../models/Event');
const ClubMembership = require('../models/ClubMembership');
const DisclaimerTemplate = require('../models/DisclaimerTemplate');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Helper: load event + caller's club membership
async function loadEventContext(userId, eventId) {
  const event = await Event.findById(eventId);
  if (!event) return { error: { status: 404, message: 'Event not found' } };
  const membership = await ClubMembership.findOne({ userId, clubId: event.clubId });
  if (!membership) return { error: { status: 403, message: 'Not a member of this club' } };
  return { event, membership };
}

// Helper: can the user manage workspaces on this event? (president only by default)
function canManageEventWorkspaces(membership) {
  return membership.role === 'president';
}

// Helper: can the user act inside a specific workspace?
function canActInWorkspace(workspace, membership, userId) {
  if (membership.role === 'president') return true;
  const ownerId = workspace.owner?.toString();
  if (ownerId && ownerId === userId) return true;
  return workspace.collaborators?.some(c => c.toString() === userId);
}

// ─────────────────────────────────────────────────────────────
// Workspaces (scoped to an event)
// ─────────────────────────────────────────────────────────────

// List workspaces for an event
router.get('/events/:eventId/workspaces', auth, async (req, res) => {
  try {
    const ctx = await loadEventContext(req.user.id, req.params.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });

    let query = { eventId: req.params.eventId };
    // Committee members only see workspaces they own or collaborate on
    if (ctx.membership.role === 'committee') {
      query.$or = [
        { owner: req.user.id },
        { collaborators: req.user.id },
      ];
    }

    const workspaces = await Workspace.find(query)
      .populate('owner', 'name email')
      .populate('collaborators', 'name email')
      .populate('closeoutRequest.requestedBy', 'name email')
      .populate('closeoutRequest.reviewedBy', 'name email')
      .sort({ createdAt: 1 });
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a workspace on an event (president only)
router.post('/events/:eventId/workspaces', auth, async (req, res) => {
  try {
    const ctx = await loadEventContext(req.user.id, req.params.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    if (!canManageEventWorkspaces(ctx.membership)) {
      return res.status(403).json({ message: 'President only' });
    }
    const ws = await Workspace.create({
      ...req.body,
      eventId: req.params.eventId,
      createdBy: req.user.id,
    });
    const populated = await Workspace.findById(ws._id)
      .populate('owner', 'name email')
      .populate('collaborators', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// List workspaces assigned to the current committee member in a club
router.get('/workspaces/assigned', auth, async (req, res) => {
  try {
    const { clubId } = req.query;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });
    const membership = await ClubMembership.findOne({ userId: req.user.id, clubId });
    if (!membership) return res.status(403).json({ message: 'Not a member of this club' });

    const events = await Event.find({ clubId }, '_id title date status location').sort({ date: 1 });
    const eventIds = events.map(event => event._id);
    const workspaces = await Workspace.find({
      eventId: { $in: eventIds },
      $or: [{ owner: req.user.id }, { collaborators: req.user.id }],
    })
      .populate('owner', 'name email')
      .populate('collaborators', 'name email')
      .populate('closeoutRequest.requestedBy', 'name email')
      .populate('closeoutRequest.reviewedBy', 'name email')
      .sort({ dueDate: 1, createdAt: 1 })
      .lean();
    const tasks = await Task.find({ workspaceId: { $in: workspaces.map(workspace => workspace._id) } })
      .populate('assignedTo', 'name email')
      .populate('completionRequest.requestedBy', 'name email')
      .populate('completionRequest.reviewedBy', 'name email')
      .lean();
    const tasksByWorkspace = tasks.reduce((acc, task) => {
      const key = task.workspaceId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});

    const eventById = Object.fromEntries(events.map(event => [event._id.toString(), event.toObject()]));
    res.json(workspaces.map(workspace => ({
      ...workspace,
      event: eventById[workspace.eventId.toString()] || null,
      tasks: tasksByWorkspace[workspace._id.toString()] || [],
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single workspace
router.get('/workspaces/:id', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('collaborators', 'name email')
      .populate('closeoutRequest.requestedBy', 'name email')
      .populate('closeoutRequest.reviewedBy', 'name email');
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    res.json(ws);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a workspace (president, or workspace owner)
router.put('/workspaces/:id', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    const isOwner = ws.owner?.toString() === req.user.id;
    if (!canManageEventWorkspaces(ctx.membership) && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    Object.assign(ws, req.body);
    await ws.save();
    const populated = await Workspace.findById(ws._id)
      .populate('owner', 'name email')
      .populate('collaborators', 'name email')
      .populate('closeoutRequest.requestedBy', 'name email')
      .populate('closeoutRequest.reviewedBy', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/workspaces/:id/closeout-request', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    if (!canActInWorkspace(ws, ctx.membership, req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to request close-out for this workspace' });
    }
    const taskCount = await Task.countDocuments({ workspaceId: ws._id });
    if (taskCount === 0) {
      return res.status(400).json({ message: 'Add at least one task before requesting close-out.' });
    }
    ws.closeoutRequest = {
      status: 'pending',
      note: String(req.body.note || '').trim(),
      requestedBy: req.user.id,
      requestedAt: new Date(),
    };
    await ws.save();
    const populated = await Workspace.findById(ws._id)
      .populate('owner', 'name email')
      .populate('collaborators', 'name email')
      .populate('closeoutRequest.requestedBy', 'name email')
      .populate('closeoutRequest.reviewedBy', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/workspaces/:id/closeout-request', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    if (!canManageEventWorkspaces(ctx.membership)) {
      return res.status(403).json({ message: 'President only' });
    }
    const decision = req.body.decision;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be approved or rejected' });
    }
    ws.closeoutRequest.status = decision;
    ws.closeoutRequest.responseNote = String(req.body.responseNote || '').trim();
    ws.closeoutRequest.reviewedBy = req.user.id;
    ws.closeoutRequest.reviewedAt = new Date();
    if (decision === 'approved') ws.status = 'ready';
    if (decision === 'rejected' && ws.status === 'ready') ws.status = 'in_progress';
    await ws.save();
    const populated = await Workspace.findById(ws._id)
      .populate('owner', 'name email')
      .populate('collaborators', 'name email')
      .populate('closeoutRequest.requestedBy', 'name email')
      .populate('closeoutRequest.reviewedBy', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/workspaces/:id/safety-disclaimer', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    if (ws.type !== 'safety') return res.status(400).json({ message: 'Only safety workspaces can attach safety disclaimers' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    if (!canActInWorkspace(ws, ctx.membership, req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to attach safety disclaimers here' });
    }

    const template = await DisclaimerTemplate.findById(req.body.templateId);
    if (!template || template.clubId.toString() !== ctx.event.clubId.toString()) {
      return res.status(404).json({ message: 'Safety disclaimer not found for this club' });
    }

    await Event.updateOne(
      { _id: ctx.event._id },
      {
        $set: {
          requiresSafetyDisclaimer: true,
          disclaimerTemplateId: template._id,
          disclaimerTitle: template.title,
          disclaimerType: template.type,
          disclaimerContent: template.type === 'text' ? template.content : null,
          disclaimerFileUrl: template.type === 'pdf' ? template.fileUrl : null,
        },
      },
      { runValidators: false }
    );

    res.json({
      message: 'Safety disclaimer attached to event',
      disclaimerTemplateId: template._id,
      disclaimerTitle: template.title,
      disclaimerType: template.type,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a workspace (president only)
router.delete('/workspaces/:id', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    if (!canManageEventWorkspaces(ctx.membership)) {
      return res.status(403).json({ message: 'President only' });
    }
    await Task.deleteMany({ workspaceId: ws._id });
    await Workspace.findByIdAndDelete(ws._id);
    res.json({ message: 'Workspace deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Tasks (scoped to a workspace)
// ─────────────────────────────────────────────────────────────

// List tasks in a workspace
router.get('/workspaces/:wsId/tasks', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.wsId);
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    const tasks = await Task.find({ workspaceId: ws._id })
      .populate('assignedTo', 'name email')
      .populate('completionRequest.requestedBy', 'name email')
      .populate('completionRequest.reviewedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a task in a workspace (president, owner, or collaborator)
router.post('/workspaces/:wsId/tasks', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.wsId);
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    if (!canActInWorkspace(ws, ctx.membership, req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to add tasks here' });
    }
    const task = await Task.create({
      ...req.body,
      workspaceId: ws._id,
      eventId: ws.eventId,
      createdBy: req.user.id,
    });
    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('completionRequest.requestedBy', 'name email')
      .populate('completionRequest.reviewedBy', 'name email')
      .populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a task (president, workspace owner/collab, or assignee for status only)
router.put('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const ws = await Workspace.findById(task.workspaceId);
    const ctx = await loadEventContext(req.user.id, task.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });

    const isAssignee = task.assignedTo?.some(u => u.toString() === req.user.id);
    const fullEdit = canActInWorkspace(ws, ctx.membership, req.user.id);

    if (!fullEdit && !isAssignee) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Assignees who aren't workspace owner/collab can only update status
    const updates = fullEdit ? req.body : { status: req.body.status };
    Object.assign(task, updates);
    await task.save();
    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('completionRequest.requestedBy', 'name email')
      .populate('completionRequest.reviewedBy', 'name email')
      .populate('createdBy', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/tasks/:id/completion-request', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const ws = await Workspace.findById(task.workspaceId);
    const ctx = await loadEventContext(req.user.id, task.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    const isAssignee = task.assignedTo?.some(u => u.toString() === req.user.id);
    if (!canActInWorkspace(ws, ctx.membership, req.user.id) && !isAssignee) {
      return res.status(403).json({ message: 'Not authorized to submit this task' });
    }
    task.completionRequest = {
      status: 'pending',
      note: String(req.body.note || '').trim(),
      requestedBy: req.user.id,
      requestedAt: new Date(),
    };
    await task.save();
    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('completionRequest.requestedBy', 'name email')
      .populate('completionRequest.reviewedBy', 'name email')
      .populate('createdBy', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/tasks/:id/completion-request', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const ctx = await loadEventContext(req.user.id, task.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    if (!canManageEventWorkspaces(ctx.membership)) {
      return res.status(403).json({ message: 'President only' });
    }
    const decision = req.body.decision;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be approved or rejected' });
    }
    task.completionRequest.status = decision;
    task.completionRequest.responseNote = String(req.body.responseNote || '').trim();
    task.completionRequest.reviewedBy = req.user.id;
    task.completionRequest.reviewedAt = new Date();
    if (decision === 'approved') task.status = 'done';
    if (decision === 'rejected' && task.status === 'done') task.status = 'in_progress';
    await task.save();
    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('completionRequest.requestedBy', 'name email')
      .populate('completionRequest.reviewedBy', 'name email')
      .populate('createdBy', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a task (president or workspace owner/collab)
router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const ws = await Workspace.findById(task.workspaceId);
    const ctx = await loadEventContext(req.user.id, task.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    if (!canActInWorkspace(ws, ctx.membership, req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Task.findByIdAndDelete(task._id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Files (scoped to a workspace)
// ─────────────────────────────────────────────────────────────

// List files
router.get('/workspaces/:id/files', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id)
      .populate('files.uploadedBy', 'name email');
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    res.json(ws.files);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upload a file
router.post('/workspaces/:id/files', auth, upload.single('file'), async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    if (!canActInWorkspace(ws, ctx.membership, req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const fileDoc = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    };
    ws.files.push(fileDoc);
    await ws.save();
    const saved = await Workspace.findById(ws._id).populate('files.uploadedBy', 'name email');
    res.status(201).json(saved.files[saved.files.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Download / serve a file
router.get('/workspaces/:id/files/:fileId/download', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    const fileDoc = ws.files.id(req.params.fileId);
    if (!fileDoc) return res.status(404).json({ message: 'File not found' });
    const filePath = path.join(UPLOADS_DIR, fileDoc.filename);
    res.download(filePath, fileDoc.originalName);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a file
router.delete('/workspaces/:id/files/:fileId', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id);
    if (!ws) return res.status(404).json({ message: 'Workspace not found' });
    const ctx = await loadEventContext(req.user.id, ws.eventId);
    if (ctx.error) return res.status(ctx.error.status).json({ message: ctx.error.message });
    if (!canActInWorkspace(ws, ctx.membership, req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const fileDoc = ws.files.id(req.params.fileId);
    if (!fileDoc) return res.status(404).json({ message: 'File not found' });
    const filePath = path.join(UPLOADS_DIR, fileDoc.filename);
    ws.files.pull(req.params.fileId);
    await ws.save();
    fs.unlink(filePath, () => {});
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
