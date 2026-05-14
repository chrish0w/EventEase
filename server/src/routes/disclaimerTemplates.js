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
router.post('/', auth, async (req, res) => {
  try {
    const { clubId, title, content } = req.body;
    if (!(await requirePresident(req, res, clubId))) return;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const template = await DisclaimerTemplate.create({
      clubId,
      title: title.trim(),
      content,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });
    const populated = await DisclaimerTemplate.findById(template._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    res.status(201).json(populated);
  } catch (err) {
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
router.put('/:id', auth, async (req, res) => {
  try {
    const template = await DisclaimerTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    if (!(await requirePresident(req, res, template.clubId))) return;

    const { title, content } = req.body;
    if (title !== undefined) template.title = title.trim();
    if (content !== undefined) template.content = content;
    template.updatedBy = req.user.id;
    await template.save();

    const populated = await DisclaimerTemplate.findById(template._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    res.json(populated);
  } catch (err) {
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

module.exports = router;
