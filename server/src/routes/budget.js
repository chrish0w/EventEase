const router = require('express').Router();
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const Budget = require('../models/Budget');
const ClubMembership = require('../models/ClubMembership');

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

    const [events, budgets] = await Promise.all([
      Event.find({ clubId }).sort({ date: 1 }),
      Budget.find({ clubId }),
    ]);

    const budgetByEventId = new Map(budgets.map((budget) => [budget.eventId.toString(), budget]));

    res.json({
      totalBudget: 0,
      events: events.map((event) => {
        const budget = budgetByEventId.get(event._id.toString());
        return {
          id: event._id,
          name: event.title,
          date: event.date,
          category: event.category,
          budgetedAmount: budget?.budgetedAmount ?? 0,
          actualAmount: budget?.actualAmount ?? 0,
          notes: budget?.notes ?? '',
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
