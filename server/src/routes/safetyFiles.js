const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');
const SafetyFile = require('../models/SafetyFile');
const { serializeSafetyFile } = require('../utils/safetyFiles');

async function getMembership(userId, clubId) {
  return ClubMembership.findOne({ userId, clubId });
}

router.get('/', auth, async (req, res) => {
  try {
    const { clubId } = req.query;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });

    const membership = await getMembership(req.user.id, clubId);
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: 'Club not found' });

    const files = await SafetyFile.find({ clubId })
      .select('-data')
      .sort({ lastUsedAt: -1, createdAt: -1 });

    res.json(files.map(file => serializeSafetyFile(file)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Safety file not found' });
    }

    const file = await SafetyFile.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'Safety file not found' });

    const membership = await getMembership(req.user.id, file.clubId);
    if (!membership) return res.status(403).json({ message: 'Not a member of this club' });

    res.json(serializeSafetyFile(file, true));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
