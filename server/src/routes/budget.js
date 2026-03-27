const router = require('express').Router();
const auth = require('../middleware/auth');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Budget = require('../models/Budget');
const ClubMembership = require('../models/ClubMembership');

async function getMembership(userId, clubId) {
  return ClubMembership.findOne({ userId, clubId });
}

function sanitizeLineItems(lineItems = []) {
  return lineItems
    .map((item) => ({
      label: String(item.label ?? '').trim(),
      budgetedAmount: Number(item.budgetedAmount ?? 0),
      actualAmount: Number(item.actualAmount ?? 0),
      notes: String(item.notes ?? '').trim(),
    }))
    .filter((item) => item.label || item.budgetedAmount || item.actualAmount || item.notes);
}

function getTotals(lineItems) {
  return lineItems.reduce((totals, item) => ({
    budgetedAmount: totals.budgetedAmount + item.budgetedAmount,
    actualAmount: totals.actualAmount + item.actualAmount,
  }), { budgetedAmount: 0, actualAmount: 0 });
}

router.get('/', auth, async (req, res) => {
  try {
    const { clubId } = req.query;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });

    const membership = await getMembership(req.user.id, clubId);
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }

    const [club, events, budgets] = await Promise.all([
      Club.findById(clubId),
      Event.find({ clubId }).sort({ date: 1 }),
      Budget.find({ clubId }),
    ]);
    if (!club) return res.status(404).json({ message: 'Club not found' });

    const budgetByEventId = new Map(budgets.map((budget) => [budget.eventId.toString(), budget]));

    res.json({
      totalBudget: club.totalBudget ?? 0,
      remainingBudget: club.remainingBudget ?? 0,
      events: events.map((event) => {
        const budget = budgetByEventId.get(event._id.toString());
        return {
          id: event._id,
          name: event.title,
          date: event.date,
          category: event.category,
          lineItems: budget?.lineItems ?? [],
          budgetedAmount: budget?.budgetedAmount ?? 0,
          actualAmount: budget?.actualAmount ?? 0,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/event/:eventId', auth, async (req, res) => {
  try {
    const { clubId } = req.query;
    const { eventId } = req.params;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });

    const membership = await getMembership(req.user.id, clubId);
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }

    const [club, event, budget] = await Promise.all([
      Club.findById(clubId),
      Event.findOne({ _id: eventId, clubId }, '_id title date category'),
      Budget.findOne({ clubId, eventId }),
    ]);

    if (!club) return res.status(404).json({ message: 'Club not found' });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    res.json({
      totalBudget: club.totalBudget ?? 0,
      remainingBudget: club.remainingBudget ?? 0,
      event: {
        id: event._id,
        name: event.title,
        date: event.date,
        category: event.category,
        lineItems: budget?.lineItems ?? [],
        budgetedAmount: budget?.budgetedAmount ?? 0,
        actualAmount: budget?.actualAmount ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/total', auth, async (req, res) => {
  try {
    const { clubId, totalBudget } = req.body;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });

    const membership = await getMembership(req.user.id, clubId);
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }

    const [club, savedBudgets] = await Promise.all([
      Club.findById(clubId),
      Budget.find({ clubId }),
    ]);
    if (!club) return res.status(404).json({ message: 'Club not found' });

    const allocatedBudget = savedBudgets.reduce((sum, budget) => sum + (budget.budgetedAmount ?? 0), 0);

    club.totalBudget = Number(totalBudget ?? club.totalBudget ?? 0);
    club.remainingBudget = club.totalBudget - allocatedBudget;
    await club.save();

    res.json({
      totalBudget: club.totalBudget,
      remainingBudget: club.remainingBudget,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const { clubId, totalBudget, events = [] } = req.body;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });

    const membership = await getMembership(req.user.id, clubId);
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: 'Club not found' });

    const existingEvents = await Event.find({ clubId }, '_id title date category').sort({ date: 1 });
    const validEventIds = new Set(existingEvents.map((event) => event._id.toString()));

    for (const event of events) {
      if (!validEventIds.has(String(event.id))) {
        return res.status(400).json({ message: 'Invalid event in budget payload' });
      }
    }

    const incomingEventIds = new Set(events.map((event) => String(event.id)));

    for (const event of events) {
      const lineItems = sanitizeLineItems(event.lineItems);
      const totals = getTotals(lineItems);

      if (lineItems.length === 0) {
        await Budget.findOneAndDelete({ clubId, eventId: event.id });
        continue;
      }

      await Budget.findOneAndUpdate(
        { clubId, eventId: event.id },
        {
          clubId,
          eventId: event.id,
          lineItems,
          budgetedAmount: totals.budgetedAmount,
          actualAmount: totals.actualAmount,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    await Budget.deleteMany({
      clubId,
      eventId: { $nin: Array.from(incomingEventIds) },
    });

    const savedBudgets = await Budget.find({ clubId });
    const allocatedBudget = savedBudgets.reduce((sum, budget) => sum + (budget.budgetedAmount ?? 0), 0);

    club.totalBudget = Number(totalBudget ?? club.totalBudget ?? 0);
    club.remainingBudget = club.totalBudget - allocatedBudget;
    await club.save();

    const budgetByEventId = new Map(savedBudgets.map((budget) => [budget.eventId.toString(), budget]));

    res.json({
      totalBudget: club.totalBudget,
      remainingBudget: club.remainingBudget,
      events: existingEvents.map((event) => {
        const budget = budgetByEventId.get(event._id.toString());
        return {
          id: event._id,
          name: event.title,
          date: event.date,
          category: event.category,
          lineItems: budget?.lineItems ?? [],
          budgetedAmount: budget?.budgetedAmount ?? 0,
          actualAmount: budget?.actualAmount ?? 0,
        };
      }),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/event/:eventId', auth, async (req, res) => {
  try {
    const { clubId, totalBudget, lineItems = [] } = req.body;
    const { eventId } = req.params;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });

    const membership = await getMembership(req.user.id, clubId);
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }

    const [club, event] = await Promise.all([
      Club.findById(clubId),
      Event.findOne({ _id: eventId, clubId }, '_id title date category'),
    ]);

    if (!club) return res.status(404).json({ message: 'Club not found' });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const sanitizedLineItems = sanitizeLineItems(lineItems);
    const totals = getTotals(sanitizedLineItems);

    if (sanitizedLineItems.length === 0) {
      await Budget.findOneAndDelete({ clubId, eventId });
    } else {
      await Budget.findOneAndUpdate(
        { clubId, eventId },
        {
          clubId,
          eventId,
          lineItems: sanitizedLineItems,
          budgetedAmount: totals.budgetedAmount,
          actualAmount: totals.actualAmount,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const savedBudgets = await Budget.find({ clubId });
    const allocatedBudget = savedBudgets.reduce((sum, budget) => sum + (budget.budgetedAmount ?? 0), 0);

    club.totalBudget = Number(totalBudget ?? club.totalBudget ?? 0);
    club.remainingBudget = club.totalBudget - allocatedBudget;
    await club.save();

    const savedBudget = savedBudgets.find((budget) => budget.eventId.toString() === String(eventId));

    res.json({
      totalBudget: club.totalBudget,
      remainingBudget: club.remainingBudget,
      event: {
        id: event._id,
        name: event.title,
        date: event.date,
        category: event.category,
        lineItems: savedBudget?.lineItems ?? [],
        budgetedAmount: savedBudget?.budgetedAmount ?? 0,
        actualAmount: savedBudget?.actualAmount ?? 0,
      },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
