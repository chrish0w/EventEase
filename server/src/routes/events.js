const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Budget = require('../models/Budget');
const BudgetDraft = require('../models/BudgetDraft');
const SafetyFile = require('../models/SafetyFile');
const ClubMembership = require('../models/ClubMembership');
const { sanitizeSafetyFileInput } = require('../utils/safetyFiles');

// Helper: get user's membership in a club
async function getMembership(userId, clubId) {
  return ClubMembership.findOne({ userId, clubId });
}

function getTotals(lineItems = []) {
  return lineItems.reduce((totals, item) => ({
    budgetedAmount: totals.budgetedAmount + Number(item.budgetedAmount || 0),
    actualAmount: totals.actualAmount + Number(item.actualAmount || 0),
  }), { budgetedAmount: 0, actualAmount: 0 });
}

async function recalculateRemainingBudget(clubId) {
  const [club, budgets] = await Promise.all([
    Club.findById(clubId),
    Budget.find({ clubId }),
  ]);
  if (!club) return;

  const totalSpending = budgets.reduce((sum, budget) => sum + Number(budget.actualAmount || 0), 0);
  club.remainingBudget = Number(club.totalBudget || 0) - totalSpending;
  await club.save();
}

async function resolveSafetyFileIds({ clubId, userId, safetyFileIds = [], newSafetyFiles = [] }) {
  const selectedIds = Array.isArray(safetyFileIds)
    ? [...new Set(safetyFileIds.filter(Boolean).map(String))]
    : [];
  const uploads = Array.isArray(newSafetyFiles) ? newSafetyFiles : [];

  if (selectedIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
    throw new Error('One or more selected safety files were not found.');
  }

  if (selectedIds.length) {
    const existingFiles = await SafetyFile.find({ _id: { $in: selectedIds }, clubId });
    if (existingFiles.length !== selectedIds.length) {
      throw new Error('One or more selected safety files were not found.');
    }
  }

  const uploadedFiles = [];
  for (const file of uploads) {
    const sanitizedFile = sanitizeSafetyFileInput(file);
    const savedFile = await SafetyFile.create({
      ...sanitizedFile,
      clubId,
      uploadedBy: userId,
      lastUsedAt: new Date(),
    });
    uploadedFiles.push(savedFile);
  }

  if (selectedIds.length) {
    await SafetyFile.updateMany(
      { _id: { $in: selectedIds }, clubId },
      { $set: { lastUsedAt: new Date() } }
    );
  }

  return [...selectedIds, ...uploadedFiles.map(file => file._id)];
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
    const { clubId, budgetDraftId, safetyFileIds = [], newSafetyFiles = [] } = req.body;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });
    const membership = await getMembership(req.user.id, clubId);
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }

    let budgetDraft = null;
    if (budgetDraftId) {
      budgetDraft = await BudgetDraft.findOne({ clubId, userId: req.user.id, draftId: budgetDraftId });
      if (!budgetDraft) return res.status(400).json({ message: 'Budget draft not found' });
    }

    const resolvedSafetyFileIds = await resolveSafetyFileIds({
      clubId,
      userId: req.user.id,
      safetyFileIds,
      newSafetyFiles,
    });

    const eventPayload = { ...req.body };
    delete eventPayload.budgetDraftId;
    delete eventPayload.safetyFileIds;
    delete eventPayload.newSafetyFiles;
    eventPayload.safetyFiles = resolvedSafetyFileIds;

    const event = await Event.create({ ...eventPayload, createdBy: req.user.id });

    if (budgetDraft) {
      const totals = getTotals(budgetDraft.lineItems);
      if (budgetDraft.lineItems.length > 0) {
        await Budget.findOneAndUpdate(
          { clubId, eventId: event._id },
          {
            clubId,
            eventId: event._id,
            lineItems: budgetDraft.lineItems,
            budgetedAmount: totals.budgetedAmount,
            actualAmount: totals.actualAmount,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
      await BudgetDraft.findByIdAndDelete(budgetDraft._id);
      await recalculateRemainingBudget(clubId);
    }

    const populated = await Event.findById(event._id)
      .populate('createdBy', 'name email')
      .populate('assignedCommittee.userId', 'name email')
      .populate('safetyFiles', 'name type size createdAt updatedAt lastUsedAt');
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
      .populate('safetyFiles', 'name type size createdAt updatedAt lastUsedAt')
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
      .populate('assignedCommittee.userId', 'name email')
      .populate('safetyFiles', 'name type size createdAt updatedAt lastUsedAt');
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
    const hasSafetyPayload = Object.prototype.hasOwnProperty.call(req.body, 'safetyFileIds')
      || Object.prototype.hasOwnProperty.call(req.body, 'newSafetyFiles');
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const membership = await getMembership(req.user.id, event.clubId);
    if (!membership) return res.status(403).json({ message: 'Not authorized' });
    if (membership.role !== 'president' && event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (hasSafetyPayload && membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }

    const eventPayload = { ...req.body };
    delete eventPayload.safetyFileIds;
    delete eventPayload.newSafetyFiles;

    if (hasSafetyPayload) {
      eventPayload.safetyFiles = await resolveSafetyFileIds({
        clubId: event.clubId,
        userId: req.user.id,
        safetyFileIds: req.body.safetyFileIds,
        newSafetyFiles: req.body.newSafetyFiles,
      });
    }

    Object.assign(event, eventPayload);
    await event.save();
    const populated = await Event.findById(event._id)
      .populate('createdBy', 'name email')
      .populate('assignedCommittee.userId', 'name email')
      .populate('safetyFiles', 'name type size createdAt updatedAt lastUsedAt');
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
    await Budget.findOneAndDelete({ clubId: event.clubId, eventId: event._id });
    await recalculateRemainingBudget(event.clubId);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
