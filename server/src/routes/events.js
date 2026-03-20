const router = require('express').Router();
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const ClubMembership = require('../models/ClubMembership');

// Helper: get user's membership in a club
async function getMembership(userId, clubId) {
  return ClubMembership.findOne({ userId, clubId });
}

// Get club members for committee assignment (president only) — before /:id
router.get('/committee-members', auth, async (req, res) => {
  try {
    const { clubId } = req.query;
    const membership = await getMembership(req.user.id, clubId);
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }
    const members = await ClubMembership.find({ clubId, role: { $in: ['committee', 'user'] } })
      .populate('userId', 'name email studentId');
    res.json(members.map(m => m.userId));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create event (president or committee of the club)
router.post('/', auth, async (req, res) => {
  try {
    const { clubId } = req.body;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });
    const membership = await getMembership(req.user.id, clubId);
    if (!membership || !['president', 'committee'].includes(membership.role)) {
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

// Get events filtered by club membership
router.get('/', auth, async (req, res) => {
  try {
    const { clubId } = req.query;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });

    const membership = await getMembership(req.user.id, clubId);
    if (!membership) return res.status(403).json({ message: 'Not a member of this club' });

    let query = { clubId };
    if (membership.role === 'committee') {
      query.$or = [
        { createdBy: req.user.id },
        { 'assignedCommittee.userId': req.user.id },
        { status: 'published' },
      ];
      delete query.$or; // committee sees all club events
    } else if (membership.role === 'user') {
      query.status = 'published';
    }
    // president sees all events in the club

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
    const membership = await getMembership(req.user.id, event.clubId);
    if (!membership) return res.status(403).json({ message: 'Not a member of this club' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update event (president or creator)
router.put('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const membership = await getMembership(req.user.id, event.clubId);
    if (!membership) return res.status(403).json({ message: 'Not authorized' });
    if (membership.role !== 'president' && event.createdBy.toString() !== req.user.id) {
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
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const membership = await getMembership(req.user.id, event.clubId);
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
