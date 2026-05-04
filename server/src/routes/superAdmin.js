const router = require('express').Router();
const superAdmin = require('../middleware/superAdmin');
const Organisation = require('../models/Organisation');
const OrgAdminAssignment = require('../models/OrgAdminAssignment');
const Club = require('../models/Club');
const User = require('../models/User');
const ClubRegistrationRequest = require('../models/ClubRegistrationRequest');
const ClubMembership = require('../models/ClubMembership');
const ClubInvitation = require('../models/ClubInvitation');

const DEFAULT_ORGANISATIONS = [
  'University of Melbourne',
  'RMIT',
  'Monash University',
  'Deakin University',
  'Swinburne University',
];

async function ensureDefaultOrganisations(createdBy) {
  await Promise.all(DEFAULT_ORGANISATIONS.map(name =>
    Organisation.findOneAndUpdate(
      { name },
      {
        name,
        description: `${name} clubs and societies`,
        createdBy,
      },
      { upsert: true, setDefaultsOnInsert: true, new: true }
    )
  ));
}

// Platform stats
router.get('/stats', superAdmin, async (req, res) => {
  try {
    const [totalOrgs, totalUsers, totalAdmins] = await Promise.all([
      Organisation.countDocuments(),
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
    ]);
    res.json({ totalOrgs, totalUsers, totalAdmins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// List all organisations
router.get('/organisations', superAdmin, async (req, res) => {
  try {
    await ensureDefaultOrganisations(req.user.id);
    const [orgs, assignments] = await Promise.all([
      Organisation.find().populate('createdBy', 'name email').sort({ name: 1 }),
      OrgAdminAssignment.find().populate('userId', 'name email role'),
    ]);
    const adminsByOrg = assignments.reduce((acc, assignment) => {
      const orgId = assignment.orgId.toString();
      acc[orgId] ||= [];
      if (assignment.userId) {
        acc[orgId].push({
          _id: assignment.userId._id,
          name: assignment.userId.name,
          email: assignment.userId.email,
          role: assignment.userId.role,
        });
      }
      return acc;
    }, {});
    res.json(orgs.map(org => ({
      _id: org._id,
      name: org.name,
      description: org.description,
      createdBy: org.createdBy,
      admins: adminsByOrg[org._id.toString()] || [],
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create organisation
router.post('/organisations', superAdmin, async (req, res) => {
  try {
    const org = await Organisation.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(org);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update organisation
router.put('/organisations/:id', superAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const org = await Organisation.findByIdAndUpdate(req.params.id, { name, description }, { new: true });
    if (!org) return res.status(404).json({ message: 'Organisation not found' });
    res.json(org);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Assign an org admin by searching for their unique email
router.put('/organisations/:id/assign-admin-by-email', superAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const org = await Organisation.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Organisation not found' });
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { role: 'admin' },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'No user found with that email address' });
    const hasClubRole = await ClubMembership.findOne({ userId: user._id });
    if (hasClubRole) return res.status(400).json({ message: 'Users with club roles cannot become organisation admins.' });
    await OrgAdminAssignment.findOneAndUpdate(
      { userId: user._id },
      { userId: user._id, orgId: org._id },
      { upsert: true, new: true }
    );
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, orgId: org._id });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/organisations/:id/remove-admin/:userId', superAdmin, async (req, res) => {
  try {
    const assignment = await OrgAdminAssignment.findOneAndDelete({ orgId: req.params.id, userId: req.params.userId });
    if (!assignment) return res.status(404).json({ message: 'Admin assignment not found' });
    await User.findByIdAndUpdate(req.params.userId, { role: 'user' });
    res.json({ message: 'Org admin removed' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete organisation (also removes clubs and assignments)
router.delete('/organisations/:id', superAdmin, async (req, res) => {
  try {
    const org = await Organisation.findByIdAndDelete(req.params.id);
    if (!org) return res.status(404).json({ message: 'Organisation not found' });
    await Club.deleteMany({ orgId: req.params.id });
    await OrgAdminAssignment.deleteMany({ orgId: req.params.id });
    res.json({ message: 'Organisation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// List all users (excluding super_admin), with orgId attached for admins
router.get('/users', superAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'super_admin' } }, 'name email role studentId').sort({ name: 1 });
    const [assignments, memberships, invitations] = await Promise.all([
      OrgAdminAssignment.find().populate('orgId', 'name'),
      ClubMembership.find().populate('clubId', 'name'),
      ClubInvitation.find({ status: 'pending' }).populate('clubId', 'name'),
    ]);
    const assignMap = Object.fromEntries(assignments.map(a => [a.userId.toString(), a.orgId]));
    const membershipMap = memberships.reduce((acc, membership) => {
      const userId = membership.userId.toString();
      acc[userId] ||= [];
      acc[userId].push({
        clubName: membership.clubId?.name || 'Unknown club',
        role: membership.role,
        committeeRole: membership.committeeRole,
      });
      return acc;
    }, {});
    const result = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      studentId: u.studentId,
      role: u.role,
      orgId: assignMap[u._id.toString()]?._id || null,
      orgName: assignMap[u._id.toString()]?.name || null,
      memberships: membershipMap[u._id.toString()] || [],
      status: 'active',
    }));
    invitations.forEach(invitation => {
      if (users.some(user => user.email.toLowerCase() === invitation.email.toLowerCase())) return;
      result.push({
        _id: `invite-${invitation._id}`,
        name: invitation.name || 'Not registered yet',
        email: invitation.email,
        studentId: '',
        role: 'invited',
        orgId: null,
        orgName: null,
        memberships: [{
          clubName: invitation.clubId?.name || 'Unknown club',
          role: invitation.role,
          committeeRole: undefined,
        }],
        status: 'pending_invite',
      });
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Assign user as org admin for a specific organisation
router.put('/users/:id/assign-org-admin', superAdmin, async (req, res) => {
  try {
    const { orgId } = req.body;
    if (!orgId) return res.status(400).json({ message: 'orgId is required' });
    const org = await Organisation.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organisation not found' });
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'admin' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await OrgAdminAssignment.findOneAndUpdate(
      { userId: req.params.id },
      { userId: req.params.id, orgId },
      { upsert: true, new: true }
    );
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, orgId });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Remove org admin (demote to user)
router.put('/users/:id/remove-org-admin', superAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'user' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await OrgAdminAssignment.deleteOne({ userId: req.params.id });
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
