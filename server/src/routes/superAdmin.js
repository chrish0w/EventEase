const router = require('express').Router();
const superAdmin = require('../middleware/superAdmin');
const Organisation = require('../models/Organisation');
const OrgAdminAssignment = require('../models/OrgAdminAssignment');
const Club = require('../models/Club');
const User = require('../models/User');

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
    const orgs = await Organisation.find().populate('createdBy', 'name email').sort({ name: 1 });
    res.json(orgs);
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
    const users = await User.find({ role: { $ne: 'super_admin' } }, 'name email role').sort({ name: 1 });
    const assignments = await OrgAdminAssignment.find();
    const assignMap = Object.fromEntries(assignments.map(a => [a.userId.toString(), a.orgId]));
    const result = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      orgId: assignMap[u._id.toString()] || null,
    }));
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
