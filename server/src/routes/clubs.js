const router = require('express').Router();
const auth = require('../middleware/auth');
const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');
const JoinRequest = require('../models/JoinRequest');
const User = require('../models/User');

// List all clubs
router.get('/', auth, async (req, res) => {
  try {
    const clubs = await Club.find().populate('createdBy', 'name email').sort({ name: 1 });
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user's memberships
router.get('/my', auth, async (req, res) => {
  try {
    const memberships = await ClubMembership.find({ userId: req.user.id })
      .populate('clubId', 'name description');
    res.json(memberships);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create club (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const club = await Club.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(club);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Assign president to club (admin only)
router.post('/:id/assign-president', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const { userId } = req.body;
    await ClubMembership.findOneAndUpdate(
      { userId, clubId: req.params.id },
      { userId, clubId: req.params.id, role: 'president' },
      { upsert: true, new: true }
    );
    res.json({ message: 'President assigned' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Request to join a club
router.post('/:id/request', auth, async (req, res) => {
  try {
    const existing = await JoinRequest.findOne({ userId: req.user.id, clubId: req.params.id });
    if (existing) return res.status(400).json({ message: 'Request already sent' });
    const alreadyMember = await ClubMembership.findOne({ userId: req.user.id, clubId: req.params.id });
    if (alreadyMember) return res.status(400).json({ message: 'Already a member' });
    const request = await JoinRequest.create({
      userId: req.user.id,
      clubId: req.params.id,
      message: req.body.message,
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get pending join requests for a club (president only)
router.get('/:id/requests', auth, async (req, res) => {
  try {
    const membership = await ClubMembership.findOne({ userId: req.user.id, clubId: req.params.id });
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }
    const requests = await JoinRequest.find({ clubId: req.params.id, status: 'pending' })
      .populate('userId', 'name email studentId');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve or reject a join request (president only)
router.put('/:id/requests/:requestId', auth, async (req, res) => {
  try {
    const membership = await ClubMembership.findOne({ userId: req.user.id, clubId: req.params.id });
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }
    const request = await JoinRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = req.body.status; // 'approved' or 'rejected'
    await request.save();

    if (req.body.status === 'approved') {
      await ClubMembership.create({
        userId: request.userId,
        clubId: req.params.id,
        role: 'user',
      });
    }
    res.json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Promote member to committee (president only)
router.put('/:id/members/:userId/role', auth, async (req, res) => {
  try {
    const presidentMembership = await ClubMembership.findOne({ userId: req.user.id, clubId: req.params.id });
    if (!presidentMembership || presidentMembership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }
    const updated = await ClubMembership.findOneAndUpdate(
      { userId: req.params.userId, clubId: req.params.id },
      { role: req.body.role, committeeRole: req.body.committeeRole },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Member not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get members of a club (president/committee)
router.get('/:id/members', auth, async (req, res) => {
  try {
    const membership = await ClubMembership.findOne({ userId: req.user.id, clubId: req.params.id });
    if (!membership) return res.status(403).json({ message: 'Not a member' });
    const members = await ClubMembership.find({ clubId: req.params.id })
      .populate('userId', 'name email studentId');
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
