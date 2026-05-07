const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const OrgAdminAssignment = require('../models/OrgAdminAssignment');
const ClubInvitation = require('../models/ClubInvitation');
const ClubMembership = require('../models/ClubMembership');
const Organisation = require('../models/Organisation');

function publicUser(user, extras = {}) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    studentId: user.studentId,
    role: user.role,
    organisationId: user.organisationId || null,
    profileImage: user.profileImage || '',
    bio: user.bio || '',
    ...extras,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, studentId, role, organisationId } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const org = await Organisation.findById(organisationId);
    if (!org) return res.status(400).json({ message: 'Please select an organisation' });
    const user = await User.create({ name, email, password, studentId, role, organisationId });
    const invitations = await ClubInvitation.find({ email: email.toLowerCase(), status: 'pending' });
    await Promise.all(invitations.map(async invitation => {
      if (invitation.role === 'president') {
        await ClubMembership.updateMany(
          { clubId: invitation.clubId, role: 'president', userId: { $ne: user._id } },
          { role: 'user', $unset: { committeeRole: '' } }
        );
      }
      await ClubMembership.findOneAndUpdate(
        { userId: user._id, clubId: invitation.clubId },
        { $set: { userId: user._id, clubId: invitation.clubId, role: invitation.role }, $unset: { committeeRole: '' } },
        { upsert: true, new: true }
      );
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await invitation.save();
    }));
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: publicUser(user, { organisationName: org.name }) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    let orgId = null;
    if (user.role === 'admin') {
      const assignment = await OrgAdminAssignment.findOne({ userId: user._id });
      orgId = assignment?.orgId || null;
    }
    const organisation = user.organisationId ? await Organisation.findById(user.organisationId, 'name') : null;
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: publicUser(user, { orgId, organisationName: organisation?.name || '' }) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.organisationId) {
      const membership = await ClubMembership.findOne({ userId: req.user.id }).populate('clubId', 'orgId');
      if (membership?.clubId?.orgId) {
        user.organisationId = membership.clubId.orgId;
        await user.save();
      }
    }
    user = await User.findById(req.user.id).populate('organisationId', 'name description');
    res.json(publicUser(user, {
      organisationId: user.organisationId?._id || null,
      organisationName: user.organisationId?.name || '',
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, studentId, bio, profileImage } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (name) user.name = name;
    user.studentId = studentId || '';
    user.bio = bio || '';
    if (profileImage !== undefined) user.profileImage = profileImage;
    await user.save();
    const populated = await User.findById(user._id).populate('organisationId', 'name');
    res.json(publicUser(populated, {
      organisationId: populated.organisationId?._id || null,
      organisationName: populated.organisationId?.name || '',
    }));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// List all users (admin only)
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const users = await User.find({}, 'name email studentId role');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
