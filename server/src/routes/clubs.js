const router = require('express').Router();
const auth = require('../middleware/auth');
const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');
const JoinRequest = require('../models/JoinRequest');
const OrgAdminAssignment = require('../models/OrgAdminAssignment');
const User = require('../models/User');
const ClubInvitation = require('../models/ClubInvitation');

async function getAdminOrgId(userId) {
  const a = await OrgAdminAssignment.findOne({ userId });
  return a?.orgId || null;
}

// List all clubs (filtered by admin's org if admin)
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'admin') {
      const orgId = await getAdminOrgId(req.user.id);
      if (!orgId) return res.status(403).json({ message: 'No organisation assigned' });
      filter.orgId = orgId;
    }
    const clubs = await Club.find(filter).populate('createdBy', 'name email').sort({ name: 1 });
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

router.get('/org/info', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const assignment = await OrgAdminAssignment.findOne({ userId: req.user.id }).populate('orgId', 'name description');
    if (!assignment) return res.status(403).json({ message: 'No organisation assigned' });
    res.json(assignment.orgId);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create club (admin only, within their org)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const orgId = await getAdminOrgId(req.user.id);
    if (!orgId) return res.status(403).json({ message: 'No organisation assigned' });
    const club = await Club.create({ ...req.body, orgId, createdBy: req.user.id });
    res.status(201).json(club);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Assign president to club (admin only, must own the club's org)
router.post('/:id/assign-president', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const orgId = await getAdminOrgId(req.user.id);
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: 'Club not found' });
    if (!orgId || club.orgId.toString() !== orgId.toString())
      return res.status(403).json({ message: 'Not your organisation' });
    const { userId, email } = req.body;
    let targetUserId = userId;
    if (!targetUserId && email) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ message: 'No user found with that email address' });
      if (user.role === 'admin') return res.status(400).json({ message: 'Organisation admins cannot be assigned club roles.' });
      targetUserId = user._id;
    }
    if (!targetUserId) return res.status(400).json({ message: 'User email is required' });
    await ClubMembership.updateMany(
      { clubId: req.params.id, role: 'president', userId: { $ne: targetUserId } },
      { role: 'user', $unset: { committeeRole: '' } }
    );
    await ClubMembership.findOneAndUpdate(
      { userId: targetUserId, clubId: req.params.id },
      { $set: { userId: targetUserId, clubId: req.params.id, role: 'president' }, $unset: { committeeRole: '' } },
      { upsert: true, new: true }
    );
    res.json({ message: 'President assigned' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update club details (org admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const orgId = await getAdminOrgId(req.user.id);
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: 'Club not found' });
    if (!orgId || club.orgId.toString() !== orgId.toString())
      return res.status(403).json({ message: 'Not your organisation' });
    const { name, description, category, officialClubLink } = req.body;
    const updated = await Club.findByIdAndUpdate(
      req.params.id,
      { name, description, category, officialClubLink },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Org admin overview of all users in clubs in their organisation
router.get('/org/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const orgId = await getAdminOrgId(req.user.id);
    if (!orgId) return res.status(403).json({ message: 'No organisation assigned' });
    const clubs = await Club.find({ orgId }, '_id name');
    const clubIds = clubs.map(club => club._id);
    const memberships = await ClubMembership.find({ clubId: { $in: clubIds } })
      .populate('userId', 'name email studentId')
      .populate('clubId', 'name');
    const activeUsers = memberships.map(m => ({
      _id: m._id,
      user: m.userId,
      club: m.clubId,
      role: m.role,
      committeeRole: m.committeeRole,
      status: 'active',
    }));
    const invitations = await ClubInvitation.find({ clubId: { $in: clubIds }, status: 'pending' }).populate('clubId', 'name');
    const pendingUsers = invitations.map(invitation => ({
      _id: invitation._id,
      user: { name: invitation.name || 'Not registered yet', email: invitation.email },
      club: invitation.clubId,
      role: invitation.role,
      status: 'pending_invite',
    }));
    res.json([...activeUsers, ...pendingUsers]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Request to join a club
router.post('/:id/request', auth, async (req, res) => {
  try {
    const existing = await JoinRequest.findOne({ userId: req.user.id, clubId: req.params.id });
    if (existing) return res.status(400).json({ message: 'Request already sent' });
    const alreadyMember = await ClubMembership.findOne({ userId: req.user.id, clubId: req.params.id });
    if (alreadyMember) return res.status(400).json({ message: 'Already a member' });
    const request = await JoinRequest.create({ userId: req.user.id, clubId: req.params.id, message: req.body.message });
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get pending join requests (president only)
router.get('/:id/requests', auth, async (req, res) => {
  try {
    const membership = await ClubMembership.findOne({ userId: req.user.id, clubId: req.params.id });
    if (!membership || membership.role !== 'president')
      return res.status(403).json({ message: 'President only' });
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
    if (!membership || membership.role !== 'president')
      return res.status(403).json({ message: 'President only' });
    const request = await JoinRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    request.status = req.body.status;
    await request.save();
    if (req.body.status === 'approved') {
      await ClubMembership.create({ userId: request.userId, clubId: req.params.id, role: 'user' });
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
    if (!presidentMembership || presidentMembership.role !== 'president')
      return res.status(403).json({ message: 'President only' });
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

// Get members of a club
router.get('/:id/members', auth, async (req, res) => {
  try {
    const membership = await ClubMembership.findOne({ userId: req.user.id, clubId: req.params.id });
    if (!membership && req.user.role === 'admin') {
      const orgId = await getAdminOrgId(req.user.id);
      const club = await Club.findById(req.params.id);
      if (!club || !orgId || club.orgId.toString() !== orgId.toString()) {
        return res.status(403).json({ message: 'Not a member' });
      }
    } else if (!membership) {
      return res.status(403).json({ message: 'Not a member' });
    }
    const members = await ClubMembership.find({ clubId: req.params.id })
      .populate('userId', 'name email studentId');
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
