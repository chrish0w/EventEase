const router = require('express').Router();
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const User = require('../models/User');

// Get committee members list (president only) — must be before /:id
router.get('/committee-members', auth, async (req, res) => {
  try {
    if (req.user.role !== 'president') return res.status(403).json({ message: 'Not authorized' });
    const members = await User.find({ role: 'committee' }, 'name email studentId');
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create event (president or committee)
router.post('/', auth, async (req, res) => {
  try {
    if (!['president', 'committee'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const event = await Event.create({ ...req.body, createdBy: req.user.id });
    const populated = await Event.findById(event._id)
      .populate('createdBy', 'name email')
      .populate('assignedCommittee.userId', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get events (filtered by role)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'committee') {
      query = {
        $or: [
          { createdBy: req.user.id },
          { 'assignedCommittee.userId': req.user.id }
        ]
      };
    } else if (req.user.role === 'user') {
      query = { status: 'published' };
    }
    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedCommittee.userId', 'name email')
      .sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single event
router.get('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedCommittee.userId', 'name email');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update event
router.put('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (req.user.role !== 'president' && event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    Object.assign(event, req.body);
    await event.save();
    const populated = await Event.findById(event._id)
      .populate('createdBy', 'name email')
      .populate('assignedCommittee.userId', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete event (president only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'president') return res.status(403).json({ message: 'Not authorized' });
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
