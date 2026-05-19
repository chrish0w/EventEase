const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Budget = require('../models/Budget');
const BudgetDraft = require('../models/BudgetDraft');
const ClubMembership = require('../models/ClubMembership');
const User = require('../models/User');
const EventRsvp = require('../models/EventRsvp');
const DisclaimerTemplate = require('../models/DisclaimerTemplate');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

async function copyDisclaimerFile(srcRelPath, eventId) {
  const srcAbs = path.join(UPLOADS_DIR, path.basename(srcRelPath));
  const destName = `disclaimer-event-${eventId}.pdf`;
  const destAbs = path.join(UPLOADS_DIR, destName);
  await fs.promises.copyFile(srcAbs, destAbs);
  return `uploads/${destName}`;
}

// When the chosen template is type='pdf', this attaches a transient
// `__pendingDisclaimerFileCopy` field to `payload` carrying the template's
// fileUrl. Callers MUST: (a) remove that field before persisting, and
// (b) perform `copyDisclaimerFile(...)` once the event._id is available.
async function applyDisclaimerSnapshot(payload, clubId) {
  if (!payload) return payload;
  const requires = payload.requiresSafetyDisclaimer === true;
  if (!requires) {
    payload.disclaimerTemplateId = null;
    payload.disclaimerTitle = null;
    payload.disclaimerType = 'text';
    payload.disclaimerContent = null;
    payload.disclaimerFileUrl = null;
    return payload;
  }
  if (!payload.disclaimerTemplateId) {
    const err = new Error('Disclaimer template is required when requiresSafetyDisclaimer is true');
    err.statusCode = 400;
    throw err;
  }
  const template = await DisclaimerTemplate.findById(payload.disclaimerTemplateId);
  if (!template || String(template.clubId) !== String(clubId)) {
    const err = new Error('Template does not belong to this club');
    err.statusCode = 400;
    throw err;
  }
  payload.disclaimerTitle = template.title;
  payload.disclaimerType = template.type;
  if (template.type === 'text') {
    payload.disclaimerContent = template.content;
    payload.disclaimerFileUrl = null;
  } else {
    payload.disclaimerContent = null;
    payload.__pendingDisclaimerFileCopy = template.fileUrl;
  }
  return payload;
}

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
  const remainingBudget = Number(club.totalBudget || 0) - totalSpending;
  await Club.updateOne({ _id: club._id }, { $set: { remainingBudget } });
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
    const { clubId, budgetDraftId } = req.body;
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

    const eventPayload = { ...req.body };
    delete eventPayload.budgetDraftId;
    await applyDisclaimerSnapshot(eventPayload, clubId);
    const pendingFileCopy = eventPayload.__pendingDisclaimerFileCopy;
    delete eventPayload.__pendingDisclaimerFileCopy;

    const event = new Event({ ...eventPayload, createdBy: req.user.id });
    if (pendingFileCopy) {
      event.disclaimerFileUrl = await copyDisclaimerFile(pendingFileCopy, event._id);
    }
    try {
      await event.save();
    } catch (saveErr) {
      if (event.disclaimerFileUrl) {
        const orphan = path.join(UPLOADS_DIR, path.basename(event.disclaimerFileUrl));
        fs.promises.unlink(orphan).catch(() => {});
      }
      throw saveErr;
    }

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
      .populate('assignedCommittee.userId', 'name email');
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
      .sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Browse published events across the current user's organisation
router.get('/browse/all', auth, async (req, res) => {
  try {
    const { orgId = 'mine' } = req.query;
    const user = await User.findById(req.user.id, 'organisationId');
    let organisationId = user?.organisationId;
    if (!organisationId) {
      const membership = await ClubMembership.findOne({ userId: req.user.id }).populate('clubId', 'orgId');
      organisationId = membership?.clubId?.orgId;
      if (organisationId && user) {
        user.organisationId = organisationId;
        await user.save();
      }
    }
    const clubFilter = {};
    if (orgId === 'mine') {
      if (!organisationId) return res.status(400).json({ message: 'No organisation selected' });
      clubFilter.orgId = organisationId;
    } else if (orgId !== 'all') {
      clubFilter.orgId = orgId;
    }
    const clubs = await Club.find(clubFilter, '_id name category logoUrl orgId');
    const clubIds = clubs.map(club => club._id);
    const events = await Event.find({ clubId: { $in: clubIds }, status: 'published' })
      .populate({ path: 'clubId', select: 'name category logoUrl orgId', populate: { path: 'orgId', select: 'name' } })
      .populate('createdBy', 'name email')
      .sort({ date: 1 });
    const rsvps = await EventRsvp.find({ userId: req.user.id, eventId: { $in: events.map(event => event._id) }, status: 'going' });
    const rsvpByEvent = Object.fromEntries(rsvps.map(rsvp => [rsvp.eventId.toString(), rsvp]));
    res.json(events.map(event => ({
      ...event.toObject(),
      rsvped: Boolean(rsvpByEvent[event._id.toString()]),
      rsvp: rsvpByEvent[event._id.toString()] || null,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/rsvps/my', auth, async (req, res) => {
  try {
    const rsvps = await EventRsvp.find({ userId: req.user.id, status: 'going' })
      .populate({
        path: 'eventId',
        populate: { path: 'clubId', select: 'name category logoUrl orgId', populate: { path: 'orgId', select: 'name' } },
      })
      .sort({ createdAt: -1 });
    res.json(rsvps.filter(rsvp => rsvp.eventId).map(rsvp => ({
      _id: rsvp._id,
      status: rsvp.status,
      attendeeName: rsvp.attendeeName,
      contactNumber: rsvp.contactNumber,
      notes: rsvp.notes,
      agreedSafetyDisclaimer: rsvp.agreedSafetyDisclaimer,
      event: rsvp.eventId,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/rsvp', auth, async (req, res) => {
  try {
    const { attendeeName, contactNumber, notes, agreedSafetyDisclaimer } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event || event.status !== 'published') return res.status(404).json({ message: 'Published event not found' });
    const club = await Club.findById(event.clubId);
    if (!club) return res.status(404).json({ message: 'Club not found' });
    if (event.requiresSafetyDisclaimer && !agreedSafetyDisclaimer) {
      return res.status(400).json({ message: 'Please acknowledge the safety disclaimer before RSVPing.' });
    }
    const rsvp = await EventRsvp.findOneAndUpdate(
      { userId: req.user.id, eventId: event._id },
      {
        userId: req.user.id,
        eventId: event._id,
        status: 'going',
        attendeeName,
        contactNumber,
        notes,
        agreedSafetyDisclaimer: Boolean(agreedSafetyDisclaimer),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(rsvp);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id/rsvp', auth, async (req, res) => {
  try {
    await EventRsvp.findOneAndUpdate(
      { userId: req.user.id, eventId: req.params.id },
      { status: 'cancelled' },
      { new: true }
    );
    res.json({ message: 'RSVP cancelled' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get single event
router.get('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedCommittee.userId', 'name email');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const membership = await getMembership(req.user.id, event.clubId);
    if (!membership) return res.status(403).json({ message: 'Not a member of this club' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/disclaimer-file', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.disclaimerType !== 'pdf' || !event.disclaimerFileUrl) {
      return res.status(404).json({ message: 'Event has no PDF disclaimer' });
    }
    const membership = await getMembership(req.user.id, event.clubId);
    if (!membership) return res.status(403).json({ message: 'Not a member of this club' });

    const filename = path.basename(event.disclaimerFileUrl);
    const abs = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(abs)) return res.status(404).json({ message: 'File missing on disk' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(abs, err => {
      if (!err) return;
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to send file' });
      } else {
        req.destroy();
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update event (president or creator)
router.put('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const membership = await getMembership(req.user.id, event.clubId);
    if (!membership) return res.status(403).json({ message: 'Not authorized' });
    if (membership.role !== 'president' && event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const updatePayload = { ...req.body };
    let oldFileToDelete = null;
    if (updatePayload.requiresSafetyDisclaimer !== undefined || updatePayload.disclaimerTemplateId !== undefined) {
      const requires = updatePayload.requiresSafetyDisclaimer ?? event.requiresSafetyDisclaimer;
      const templateId = updatePayload.disclaimerTemplateId ?? event.disclaimerTemplateId;
      await applyDisclaimerSnapshot(
        Object.assign(updatePayload, { requiresSafetyDisclaimer: requires, disclaimerTemplateId: templateId }),
        event.clubId
      );
      const pendingFileCopy = updatePayload.__pendingDisclaimerFileCopy;
      delete updatePayload.__pendingDisclaimerFileCopy;
      if (pendingFileCopy) {
        const eventIdForCopy = event._id;
        try {
          updatePayload.disclaimerFileUrl = await copyDisclaimerFile(pendingFileCopy, eventIdForCopy);
        } catch (copyErr) {
          const dest = path.join(UPLOADS_DIR, `disclaimer-event-${eventIdForCopy}.pdf`);
          fs.promises.unlink(dest).catch(() => {});
          throw copyErr;
        }
        if (event.disclaimerFileUrl) oldFileToDelete = event.disclaimerFileUrl;
      } else if (updatePayload.disclaimerType === 'text' && event.disclaimerFileUrl) {
        oldFileToDelete = event.disclaimerFileUrl;
        updatePayload.disclaimerFileUrl = null;
      }
    }
    Object.assign(event, updatePayload);
    await event.save();
    if (oldFileToDelete) {
      const oldAbs = path.join(UPLOADS_DIR, path.basename(oldFileToDelete));
      fs.promises.unlink(oldAbs).catch(() => {});
    }
    const populated = await Event.findById(event._id)
      .populate('createdBy', 'name email')
      .populate('assignedCommittee.userId', 'name email');
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
    if (event.disclaimerFileUrl) {
      const abs = path.join(UPLOADS_DIR, path.basename(event.disclaimerFileUrl));
      fs.promises.unlink(abs).catch(() => {});
    }
    await Budget.findOneAndDelete({ clubId: event.clubId, eventId: event._id });
    await recalculateRemainingBudget(event.clubId);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
