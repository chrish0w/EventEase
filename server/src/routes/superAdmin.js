const router = require('express').Router();
const superAdmin = require('../middleware/superAdmin');
const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');
const User = require('../models/User');

// Platform stats
router.get('/stats', superAdmin, async (req, res) => {
  try {
    const [totalClubs, totalUsers, totalAdmins] = await Promise.all([
      Club.countDocuments(),
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
    ]);
    res.json({ totalClubs, totalUsers, totalAdmins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// List all clubs with creator info
router.get('/clubs', superAdmin, async (req, res) => {
  try {
    const clubs = await Club.find().populate('createdBy', 'name email').sort({ name: 1 });
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create club
router.post('/clubs', superAdmin, async (req, res) => {
  try {
    const club = await Club.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(club);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update club
router.put('/clubs/:id', superAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const club = await Club.findByIdAndUpdate(req.params.id, { name, description }, { new: true });
    if (!club) return res.status(404).json({ message: 'Club not found' });
    res.json(club);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete club (also removes memberships)
router.delete('/clubs/:id', superAdmin, async (req, res) => {
  try {
    const club = await Club.findByIdAndDelete(req.params.id);
    if (!club) return res.status(404).json({ message: 'Club not found' });
    await ClubMembership.deleteMany({ clubId: req.params.id });
    res.json({ message: 'Club deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// List all users
router.get('/users', superAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'name email studentId role').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change a user's platform role (e.g. promote to admin or demote)
router.put('/users/:id/role', superAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['user', 'admin'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Assign a club-level president via super admin
router.post('/clubs/:id/assign-president', superAdmin, async (req, res) => {
  try {
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

// Get members of a club (for super admin view)
router.get('/clubs/:id/members', superAdmin, async (req, res) => {
  try {
    const members = await ClubMembership.find({ clubId: req.params.id })
      .populate('userId', 'name email studentId');
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
