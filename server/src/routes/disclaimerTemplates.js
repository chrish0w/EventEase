const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const DisclaimerTemplate = require('../models/DisclaimerTemplate');
const ClubMembership = require('../models/ClubMembership');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `disclaimer-template-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okMime = file.mimetype === 'application/pdf';
    const okExt = path.extname(file.originalname).toLowerCase() === '.pdf';
    if (!okMime || !okExt) {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

function safeUnlink(relPath) {
  if (!relPath) return;
  const filename = path.basename(relPath);
  const abs = path.join(UPLOADS_DIR, filename);
  fs.unlink(abs, err => {
    if (err && err.code !== 'ENOENT') {
      console.warn(`Failed to delete file ${abs}: ${err.message}`);
    }
  });
}

function handleMulterError(err, _req, res, _next) {
  if (err) return res.status(400).json({ message: err.message });
}

async function getMembership(userId, clubId) {
  return ClubMembership.findOne({ userId, clubId });
}

async function requirePresident(req, res, clubId) {
  if (!clubId) {
    res.status(400).json({ message: 'clubId is required' });
    return false;
  }
  const membership = await getMembership(req.user.id, clubId);
  if (!membership || membership.role !== 'president') {
    res.status(403).json({ message: 'President only' });
    return false;
  }
  return true;
}

// List templates for a club (any club member can read)
router.get('/', auth, async (req, res) => {
  try {
    const { clubId } = req.query;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });

    const membership = await getMembership(req.user.id, clubId);
    if (!membership) return res.status(403).json({ message: 'Not a member of this club' });

    const templates = await DisclaimerTemplate.find({ clubId })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ updatedAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create template (president only)
router.post('/', auth, upload.single('file'), async (req, res) => {
  let uploadedFilePath = null;
  try {
    const { clubId, title, type = 'text', content } = req.body;
    if (!(await requirePresident(req, res, clubId))) {
      if (req.file) safeUnlink(req.file.filename);
      return;
    }
    if (!title?.trim()) {
      if (req.file) safeUnlink(req.file.filename);
      return res.status(400).json({ message: 'Title is required' });
    }

    let templateData = { clubId, title: title.trim(), type, createdBy: req.user.id, updatedBy: req.user.id };

    if (type === 'text') {
      if (req.file) {
        safeUnlink(req.file.filename);
        return res.status(400).json({ message: 'File upload not allowed for text templates' });
      }
      if (!content?.trim()) {
        return res.status(400).json({ message: 'Content is required for text templates' });
      }
      templateData.content = content;
    } else if (type === 'pdf') {
      if (!req.file) {
        return res.status(400).json({ message: 'PDF file is required for pdf templates' });
      }
      uploadedFilePath = req.file.filename;
      templateData.fileUrl = `uploads/${req.file.filename}`;
    } else {
      if (req.file) safeUnlink(req.file.filename);
      return res.status(400).json({ message: 'Invalid type' });
    }

    const template = await DisclaimerTemplate.create(templateData);
    const populated = await DisclaimerTemplate.findById(template._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    if (uploadedFilePath) safeUnlink(uploadedFilePath);
    else if (req.file) safeUnlink(req.file.filename);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Template name already exists in this club' });
    }
    res.status(400).json({ message: err.message });
  }
});

// Get one template (any club member)
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await DisclaimerTemplate.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const membership = await getMembership(req.user.id, template.clubId);
    if (!membership) return res.status(403).json({ message: 'Not a member of this club' });

    res.json(template);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update template (president only)
router.put('/:id', auth, upload.single('file'), async (req, res) => {
  try {
    const template = await DisclaimerTemplate.findById(req.params.id);
    if (!template) {
      if (req.file) safeUnlink(req.file.filename);
      return res.status(404).json({ message: 'Template not found' });
    }
    if (!(await requirePresident(req, res, template.clubId))) {
      if (req.file) safeUnlink(req.file.filename);
      return;
    }

    if (req.body.type && req.body.type !== template.type) {
      if (req.file) safeUnlink(req.file.filename);
      return res.status(400).json({ message: 'Type cannot be changed. Create a new template instead.' });
    }

    const { title, content } = req.body;
    if (title !== undefined) template.title = title.trim();
    if (template.type === 'text') {
      if (req.file) {
        safeUnlink(req.file.filename);
        return res.status(400).json({ message: 'File upload not allowed for text templates' });
      }
      if (content !== undefined) template.content = content;
    }

    let oldFileToDelete = null;
    if (template.type === 'pdf' && req.file) {
      oldFileToDelete = template.fileUrl;
      template.fileUrl = `uploads/${req.file.filename}`;
    }

    template.updatedBy = req.user.id;
    await template.save();

    if (oldFileToDelete) safeUnlink(oldFileToDelete);

    const populated = await DisclaimerTemplate.findById(template._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    res.json(populated);
  } catch (err) {
    if (req.file) safeUnlink(req.file.filename);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Template name already exists in this club' });
    }
    res.status(400).json({ message: err.message });
  }
});

// Delete template (president only). Existing events keep their snapshot.
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await DisclaimerTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    if (!(await requirePresident(req, res, template.clubId))) return;

    await DisclaimerTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Error handler must remain the last middleware on this router — any route
// added after this line will not have multer errors converted to 400 JSON.
router.use(handleMulterError);

module.exports = router;
