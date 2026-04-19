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
    await Club.findByIdAndDelete(req.params.id);
    await ClubMembership.deleteMany({ clubId: req.params.id });
    res.json({ message: 'Club deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
