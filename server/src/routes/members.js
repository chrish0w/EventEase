const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET all members (president & committee)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'president' && req.user.role !== 'committee') {
    return res.status(403).json({ message: 'Access denied' });
  }
  try {
    const members = await User.find({}, 'name email studentId role createdAt').sort({ createdAt: -1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH update member role (president only)
router.patch('/:id/role', auth, async (req, res) => {
  if (req.user.role !== 'president') {
    return res.status(403).json({ message: 'Only presidents can change roles' });
  }
  try {
    const { role } = req.body;
    if (!['user', 'committee', 'president'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const member = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: 'name email studentId role createdAt' }
    );
    if (!member) return res.status(404).json({ message: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE member (president only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'president') {
    return res.status(403).json({ message: 'Only presidents can remove members' });
  }
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: 'You cannot remove yourself' });
  }
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
