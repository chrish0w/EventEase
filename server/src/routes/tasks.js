const router = require('express').Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');

// GET committee members for assignment dropdown (president only) — must be before /:id
router.get('/members', auth, async (req, res) => {
  if (req.user.role !== 'president') return res.status(403).json({ message: 'Access denied' });
  try {
    const members = await User.find({ role: 'committee' }, 'name email role');
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all tasks (president: all; committee: their own tasks)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'president' && req.user.role !== 'committee') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const filter = req.user.role === 'committee' ? { assignedTo: req.user.id } : {};
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create task (president only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'president') return res.status(403).json({ message: 'Only presidents can create tasks' });
  try {
    const { title, description, assignedTo, priority, deadline } = req.body;
    const task = await Task.create({
      title,
      description,
      assignedTo,
      priority,
      deadline,
      assignedBy: req.user.id,
    });
    await task.populate('assignedTo', 'name email role');
    await task.populate('assignedBy', 'name email role');
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH update task (committee: status only; president: full update)
router.patch('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role === 'committee' && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const allowed = req.user.role === 'president'
      ? ['title', 'description', 'status', 'priority', 'deadline', 'assignedTo']
      : ['status'];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    await task.save();
    await task.populate('assignedTo', 'name email role');
    await task.populate('assignedBy', 'name email role');
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE task (president only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'president') return res.status(403).json({ message: 'Only presidents can delete tasks' });
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
