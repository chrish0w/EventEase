const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Club = require('../models/Club');
const Event = require('../models/Event');
const Budget = require('../models/Budget');
const BudgetDraft = require('../models/BudgetDraft');
const ClubMembership = require('../models/ClubMembership');

async function getMembership(userId, clubId) {
  return ClubMembership.findOne({ userId, clubId });
}

function sanitizeLineItems(lineItems = []) {
  return lineItems
    .map((item) => {
      const budgetedAmount = Number(item.assignedAmount ?? item.budgetedAmount ?? 0);
      const actualAmount = Number(item.actualAmount ?? 0);
      const notes = String(item.notes ?? '').trim();
      const label = String(item.description ?? item.label ?? notes).trim() || (
        budgetedAmount || actualAmount ? 'Budget item' : ''
      );

      const sanitizedItem = {
        label,
        budgetedAmount,
        actualAmount,
        notes,
      };

      if (item._id) sanitizedItem._id = item._id;
      return sanitizedItem;
    })
    .filter((item) => item.label || item.budgetedAmount || item.actualAmount || item.notes);
}

function getTotals(lineItems) {
  return lineItems.reduce((totals, item) => ({
    budgetedAmount: totals.budgetedAmount + item.budgetedAmount,
    actualAmount: totals.actualAmount + item.actualAmount,
  }), { budgetedAmount: 0, actualAmount: 0 });
}

function serializeLineItems(lineItems = []) {
  return lineItems.map((item) => ({
    _id: item._id?.toString(),
    label: item.label,
    description: item.label,
    budgetedAmount: item.budgetedAmount ?? 0,
    assignedAmount: item.budgetedAmount ?? 0,
    actualAmount: item.actualAmount ?? 0,
    notes: item.notes ?? '',
  }));
}

function sanitizeIncomeSources(incomeSources = {}) {
  return {
    organization: Number(incomeSources.organization ?? 0),
    membershipFees: Number(incomeSources.membershipFees ?? 0),
    eventIncome: Number(incomeSources.eventIncome ?? 0),
    sponsorship: Number(incomeSources.sponsorship ?? 0),
    others: Number(incomeSources.others ?? 0),
  };
}

function getIncomeTotal(incomeSources) {
  return Object.values(incomeSources).reduce((sum, amount) => sum + Number(amount || 0), 0);
}

function getTotalSpending(budgets = []) {
  return budgets.reduce((sum, budget) => sum + Number(budget.actualAmount || 0), 0);
}

async function syncRemainingBudget(club, budgets = []) {
  const remainingBudget = Number(club.totalBudget || 0) - getTotalSpending(budgets);
  if (Number(club.remainingBudget || 0) !== remainingBudget) {
    club.remainingBudget = remainingBudget;
    await club.save();
  }
  return remainingBudget;
}

function addIncomeSources(currentIncomeSources = {}, incomeAdditions = {}) {
  const current = sanitizeIncomeSources(currentIncomeSources);
  const additions = sanitizeIncomeSources(incomeAdditions);

  return {
    organization: current.organization + additions.organization,
    membershipFees: current.membershipFees + additions.membershipFees,
    eventIncome: current.eventIncome + additions.eventIncome,
    sponsorship: current.sponsorship + additions.sponsorship,
    others: current.others + additions.others,
  };
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

    const remainingBudget = await syncRemainingBudget(club, budgets);
    const budgetByEventId = new Map(budgets.map((budget) => [budget.eventId.toString(), budget]));

    res.json({
      totalBudget: club.totalBudget ?? 0,
      remainingBudget,
      incomeSources: sanitizeIncomeSources(club.incomeSources),
      events: events.map((event) => {
        const budget = budgetByEventId.get(event._id.toString());
        return {
          id: event._id,
          name: event.title,
          date: event.date,
          category: event.category,
          lineItems: serializeLineItems(budget?.lineItems ?? []),
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
      incomeSources: sanitizeIncomeSources(club.incomeSources),
      event: {
        id: event._id,
        name: event.title,
        date: event.date,
        category: event.category,
        lineItems: serializeLineItems(budget?.lineItems ?? []),
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
    const { clubId, totalBudget, incomeSources } = req.body;
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

    const totalSpending = getTotalSpending(savedBudgets);

    if (incomeSources) {
      const nextIncomeSources = sanitizeIncomeSources(incomeSources);
      club.incomeSources = nextIncomeSources;
      club.totalBudget = getIncomeTotal(nextIncomeSources);
    } else {
      club.totalBudget = Number(totalBudget ?? club.totalBudget ?? 0);
    }
    club.remainingBudget = club.totalBudget - totalSpending;
    await club.save();

    res.json({
      totalBudget: club.totalBudget,
      remainingBudget: club.remainingBudget,
      incomeSources: sanitizeIncomeSources(club.incomeSources),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/income', auth, async (req, res) => {
  try {
    const { clubId, incomeSources = {} } = req.body;
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

    const incomeAdditions = sanitizeIncomeSources(incomeSources);
    const addedIncome = getIncomeTotal(incomeAdditions);
    const totalSpending = getTotalSpending(savedBudgets);

    club.incomeSources = addIncomeSources(club.incomeSources, incomeAdditions);
    club.totalBudget = Number(club.totalBudget ?? 0) + addedIncome;
    club.remainingBudget = club.totalBudget - totalSpending;
    await club.save();

    res.json({
      totalBudget: club.totalBudget,
      remainingBudget: club.remainingBudget,
      incomeSources: sanitizeIncomeSources(club.incomeSources),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/draft', auth, async (req, res) => {
  try {
    const { clubId, draftId, lineItems = [] } = req.body;
    if (!clubId) return res.status(400).json({ message: 'clubId is required' });

    const membership = await getMembership(req.user.id, clubId);
    if (!membership || membership.role !== 'president') {
      return res.status(403).json({ message: 'President only' });
    }

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: 'Club not found' });

    const sanitizedLineItems = sanitizeLineItems(lineItems);
    const totals = getTotals(sanitizedLineItems);
    const nextDraftId = draftId || new mongoose.Types.ObjectId().toString();

    const draft = await BudgetDraft.findOneAndUpdate(
      { clubId, userId: req.user.id, draftId: nextDraftId },
      {
        clubId,
        userId: req.user.id,
        draftId: nextDraftId,
        lineItems: sanitizedLineItems,
        budgetedAmount: totals.budgetedAmount,
        actualAmount: totals.actualAmount,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      draftId: draft.draftId,
      lineItems: serializeLineItems(draft.lineItems),
      budgetedAmount: draft.budgetedAmount,
      actualAmount: draft.actualAmount,
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
    const totalSpending = getTotalSpending(savedBudgets);

    club.totalBudget = Number(totalBudget ?? club.totalBudget ?? 0);
    club.remainingBudget = club.totalBudget - totalSpending;
    await club.save();

    const budgetByEventId = new Map(savedBudgets.map((budget) => [budget.eventId.toString(), budget]));

    res.json({
      totalBudget: club.totalBudget,
      remainingBudget: club.remainingBudget,
      incomeSources: sanitizeIncomeSources(club.incomeSources),
      events: existingEvents.map((event) => {
        const budget = budgetByEventId.get(event._id.toString());
        return {
          id: event._id,
          name: event.title,
          date: event.date,
          category: event.category,
          lineItems: serializeLineItems(budget?.lineItems ?? []),
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

    const [club, event, existingBudget] = await Promise.all([
      Club.findById(clubId),
      Event.findOne({ _id: eventId, clubId }, '_id title date category'),
      Budget.findOne({ clubId, eventId }),
    ]);

    if (!club) return res.status(404).json({ message: 'Club not found' });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const existingLineItemById = new Map((existingBudget?.lineItems ?? []).map((item) => [
      item._id.toString(),
      item,
    ]));
    const lineItemsWithLockedAssignedAmounts = lineItems.map((item) => {
      const existingLineItem = item._id ? existingLineItemById.get(String(item._id)) : null;
      if (!existingLineItem) return item;

      return {
        ...item,
        assignedAmount: existingLineItem.budgetedAmount,
        budgetedAmount: existingLineItem.budgetedAmount,
      };
    });

    const sanitizedLineItems = sanitizeLineItems(lineItemsWithLockedAssignedAmounts);
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
    const totalSpending = getTotalSpending(savedBudgets);

    club.totalBudget = Number(totalBudget ?? club.totalBudget ?? 0);
    club.remainingBudget = club.totalBudget - totalSpending;
    await club.save();

    const savedBudget = savedBudgets.find((budget) => budget.eventId.toString() === String(eventId));

    res.json({
      totalBudget: club.totalBudget,
      remainingBudget: club.remainingBudget,
      incomeSources: sanitizeIncomeSources(club.incomeSources),
      event: {
        id: event._id,
        name: event.title,
        date: event.date,
        category: event.category,
        lineItems: serializeLineItems(savedBudget?.lineItems ?? []),
        budgetedAmount: savedBudget?.budgetedAmount ?? 0,
        actualAmount: savedBudget?.actualAmount ?? 0,
      },
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
