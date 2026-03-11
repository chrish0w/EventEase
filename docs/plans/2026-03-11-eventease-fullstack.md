# EventEase Full-Stack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build EventEase — a full-stack event management web app for Monash student clubs with role-based access, RSVP, task assignment, budget tracking, and file uploads.

**Architecture:** React (Vite + TypeScript) frontend with React Router and Axios; Express + Node.js REST API backend with JWT auth; MongoDB via Mongoose for data persistence. Monorepo under `C:/Users/15489/FIT3162/` with `client/` and `server/` folders.

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, Axios, TailwindCSS, Node.js, Express, Mongoose, JWT, Multer, bcryptjs, MongoDB

---

### Task 1: Scaffold Backend (Express + MongoDB)

**Files:**
- Create: `server/package.json`
- Create: `server/src/index.js`
- Create: `server/.env.example`

**Step 1: Init backend**
```bash
cd C:/Users/15489/FIT3162
mkdir server && cd server
npm init -y
npm install express mongoose dotenv bcryptjs jsonwebtoken multer cors
npm install --save-dev nodemon
```

**Step 2: Create `server/src/index.js`**
```js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

**Step 3: Create `server/.env`**
```
MONGO_URI=mongodb://localhost:27017/eventease
JWT_SECRET=eventease_secret_key_2026
PORT=5000
```

**Step 4: Update `server/package.json` scripts**
```json
"scripts": {
  "start": "node src/index.js",
  "dev": "nodemon src/index.js"
}
```

**Step 5: Test**
```bash
cd server && npm run dev
# Expected: "MongoDB connected", "Server running on port 5000"
curl http://localhost:5000/health
# Expected: {"status":"ok"}
```

---

### Task 2: MongoDB Models

**Files:**
- Create: `server/src/models/User.js`
- Create: `server/src/models/Event.js`
- Create: `server/src/models/Task.js`
- Create: `server/src/models/RSVP.js`
- Create: `server/src/models/BudgetItem.js`
- Create: `server/src/models/File.js`

**Step 1: `server/src/models/User.js`**
```js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  studentId: String,
  dietaryRequirements: String,
  role: { type: String, enum: ['user', 'committee', 'president'], default: 'user' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

**Step 2: `server/src/models/Event.js`**
```js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
  location: String,
  category: { type: String, enum: ['social', 'academic', 'outdoor', 'fundraising', 'other'], default: 'other' },
  club: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'published', 'completed'], default: 'draft' },
  budgetEstimated: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
```

**Step 3: `server/src/models/Task.js`**
```js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  title: { type: String, required: true },
  description: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deadline: Date,
  status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
  role: String,
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
```

**Step 4: `server/src/models/RSVP.js`**
```js
const mongoose = require('mongoose');

const rsvpSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  studentId: String,
  dietaryRequirements: String,
  safetyAcknowledged: { type: Boolean, default: false },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
}, { timestamps: true });

module.exports = mongoose.model('RSVP', rsvpSchema);
```

**Step 5: `server/src/models/BudgetItem.js`**
```js
const mongoose = require('mongoose');

const budgetItemSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  category: String,
  description: { type: String, required: true },
  estimatedAmount: { type: Number, default: 0 },
  actualAmount: { type: Number, default: 0 },
  type: { type: String, enum: ['income', 'expense'], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('BudgetItem', budgetItemSchema);
```

**Step 6: `server/src/models/File.js`**
```js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  filename: String,
  url: String,
  type: { type: String, enum: ['waiver', 'medical', 'risk_assessment', 'other'], default: 'other' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);
```

---

### Task 3: Auth Routes (Register / Login)

**Files:**
- Create: `server/src/middleware/auth.js`
- Create: `server/src/routes/auth.js`
- Modify: `server/src/index.js`

**Step 1: `server/src/middleware/auth.js`**
```js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
```

**Step 2: `server/src/routes/auth.js`**
```js
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, studentId, dietaryRequirements, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password, studentId, dietaryRequirements, role });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
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
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

**Step 3: Register route in `server/src/index.js`**
```js
app.use('/api/auth', require('./routes/auth'));
```

---

### Task 4: Events Routes

**Files:**
- Create: `server/src/routes/events.js`
- Modify: `server/src/index.js`

**Step 1: `server/src/routes/events.js`**
```js
const router = require('express').Router();
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// Get all published events (public)
router.get('/', async (req, res) => {
  try {
    const { category, club } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (club) filter.club = club;
    const events = await Event.find(filter).populate('createdBy', 'name email').sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy', 'name email');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create event (committee/president only)
router.post('/', auth, async (req, res) => {
  try {
    if (!['committee', 'president'].includes(req.user.role))
      return res.status(403).json({ message: 'Forbidden' });
    const event = await Event.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update event
router.put('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.createdBy.toString() !== req.user.id && req.user.role !== 'president')
      return res.status(403).json({ message: 'Forbidden' });
    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.createdBy.toString() !== req.user.id && req.user.role !== 'president')
      return res.status(403).json({ message: 'Forbidden' });
    await event.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

**Step 2: Register in `server/src/index.js`**
```js
app.use('/api/events', require('./routes/events'));
```

---

### Task 5: Tasks, RSVP, Budget, Files Routes

**Files:**
- Create: `server/src/routes/tasks.js`
- Create: `server/src/routes/rsvp.js`
- Create: `server/src/routes/budget.js`
- Create: `server/src/routes/files.js`
- Modify: `server/src/index.js`

**Step 1: `server/src/routes/tasks.js`**
```js
const router = require('express').Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');

router.get('/event/:eventId', auth, async (req, res) => {
  const tasks = await Task.find({ event: req.params.eventId }).populate('assignedTo', 'name email');
  res.json(tasks);
});

router.post('/event/:eventId', auth, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, event: req.params.eventId, assignedBy: req.user.id });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

**Step 2: `server/src/routes/rsvp.js`**
```js
const router = require('express').Router();
const RSVP = require('../models/RSVP');
const auth = require('../middleware/auth');

router.get('/event/:eventId', auth, async (req, res) => {
  const rsvps = await RSVP.find({ event: req.params.eventId });
  res.json(rsvps);
});

router.post('/event/:eventId', async (req, res) => {
  try {
    const rsvp = await RSVP.create({ ...req.body, event: req.params.eventId });
    res.status(201).json(rsvp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const rsvp = await RSVP.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    res.json(rsvp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

**Step 3: `server/src/routes/budget.js`**
```js
const router = require('express').Router();
const BudgetItem = require('../models/BudgetItem');
const auth = require('../middleware/auth');

router.get('/event/:eventId', auth, async (req, res) => {
  const items = await BudgetItem.find({ event: req.params.eventId });
  res.json(items);
});

router.post('/event/:eventId', auth, async (req, res) => {
  try {
    const item = await BudgetItem.create({ ...req.body, event: req.params.eventId, createdBy: req.user.id });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await BudgetItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await BudgetItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

**Step 4: `server/src/routes/files.js`**
```js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const File = require('../models/File');
const auth = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

router.get('/event/:eventId', auth, async (req, res) => {
  const files = await File.find({ event: req.params.eventId });
  res.json(files);
});

router.post('/event/:eventId', auth, upload.single('file'), async (req, res) => {
  try {
    const fileDoc = await File.create({
      event: req.params.eventId,
      filename: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      type: req.body.type || 'other',
      uploadedBy: req.user.id,
    });
    res.status(201).json(fileDoc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

**Step 5: Register all routes in `server/src/index.js`**
```js
app.use('/uploads', express.static('uploads'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/rsvp', require('./routes/rsvp'));
app.use('/api/budget', require('./routes/budget'));
app.use('/api/files', require('./routes/files'));
```

**Step 6: Create uploads directory**
```bash
mkdir server/uploads
```

---

### Task 6: Scaffold Frontend (React + Vite + TypeScript + Tailwind)

**Files:**
- Create: `client/` (via Vite)

**Step 1: Init frontend**
```bash
cd C:/Users/15489/FIT3162
npm create vite@latest client -- --template react-ts
cd client
npm install
npm install react-router-dom axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: Configure `client/tailwind.config.js`**
```js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

**Step 3: Update `client/src/index.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Create `client/src/api/axios.ts`**
```ts
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

**Step 5: Test**
```bash
cd client && npm run dev
# Expected: Vite dev server at http://localhost:5173
```

---

### Task 7: Auth Context + Login/Register Pages

**Files:**
- Create: `client/src/context/AuthContext.tsx`
- Create: `client/src/pages/Login.tsx`
- Create: `client/src/pages/Register.tsx`

**Step 1: `client/src/context/AuthContext.tsx`**
```tsx
import React, { createContext, useContext, useState } from 'react';

interface User { id: string; name: string; email: string; role: string; }
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const login = (t: string, u: User) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

**Step 2: `client/src/pages/Login.tsx`**
```tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">EventEase</h1>
        <h2 className="text-xl font-semibold mb-4">Sign In</h2>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full border rounded p-2" type="email" placeholder="Email"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input className="w-full border rounded p-2" type="password" placeholder="Password"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" type="submit">
            Login
          </button>
        </form>
        <p className="text-center mt-4 text-sm">Don't have an account? <Link to="/register" className="text-blue-600">Register</Link></p>
      </div>
    </div>
  );
}
```

**Step 3: `client/src/pages/Register.tsx`**
```tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', studentId: '', dietaryRequirements: '', role: 'user' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">EventEase</h1>
        <h2 className="text-xl font-semibold mb-4">Create Account</h2>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full border rounded p-2" placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <input className="w-full border rounded p-2" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input className="w-full border rounded p-2" type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <input className="w-full border rounded p-2" placeholder="Student ID" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} />
          <input className="w-full border rounded p-2" placeholder="Dietary Requirements" value={form.dietaryRequirements} onChange={e => setForm({ ...form, dietaryRequirements: e.target.value })} />
          <select className="w-full border rounded p-2" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="user">Regular User</option>
            <option value="committee">Committee Member</option>
            <option value="president">President / Event Creator</option>
          </select>
          <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" type="submit">Register</button>
        </form>
        <p className="text-center mt-4 text-sm">Already have an account? <Link to="/login" className="text-blue-600">Login</Link></p>
      </div>
    </div>
  );
}
```

---

### Task 8: Dashboard + Event List

**Files:**
- Create: `client/src/pages/Dashboard.tsx`
- Create: `client/src/components/EventCard.tsx`
- Create: `client/src/components/Navbar.tsx`

**Step 1: `client/src/components/Navbar.tsx`**
```tsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
      <Link to="/dashboard" className="text-xl font-bold">EventEase</Link>
      <div className="flex items-center gap-4">
        {user && <span className="text-sm opacity-80">{user.name} ({user.role})</span>}
        {['committee', 'president'].includes(user?.role || '') && (
          <Link to="/events/create" className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100">+ New Event</Link>
        )}
        <button onClick={handleLogout} className="text-sm opacity-80 hover:opacity-100">Logout</button>
      </div>
    </nav>
  );
}
```

**Step 2: `client/src/components/EventCard.tsx`**
```tsx
import { Link } from 'react-router-dom';

interface Event { _id: string; title: string; date: string; location: string; category: string; club: string; status: string; }

export default function EventCard({ event }: { event: Event }) {
  const statusColor = { draft: 'bg-gray-100 text-gray-600', published: 'bg-green-100 text-green-700', completed: 'bg-blue-100 text-blue-700' }[event.status] || '';
  return (
    <div className="bg-white rounded-lg shadow p-5 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg">{event.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>{event.status}</span>
      </div>
      <p className="text-gray-500 text-sm mb-1">{new Date(event.date).toLocaleDateString('en-AU', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
      <p className="text-gray-500 text-sm mb-1">{event.location}</p>
      <div className="flex gap-2 mt-3">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{event.category}</span>
        {event.club && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{event.club}</span>}
      </div>
      <div className="mt-4 flex gap-2">
        <Link to={`/events/${event._id}`} className="text-blue-600 text-sm hover:underline">View Details</Link>
        <Link to={`/events/${event._id}/rsvp`} className="text-green-600 text-sm hover:underline">RSVP</Link>
      </div>
    </div>
  );
}
```

**Step 3: `client/src/pages/Dashboard.tsx`**
```tsx
import { useEffect, useState } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import EventCard from '../components/EventCard';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState({ category: '', club: '' });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.category) params.set('category', filter.category);
    if (filter.club) params.set('club', filter.club);
    api.get(`/events?${params}`).then(r => setEvents(r.data));
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex gap-4 mb-6">
          <select className="border rounded p-2 text-sm" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })}>
            <option value="">All Categories</option>
            {['social', 'academic', 'outdoor', 'fundraising', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="border rounded p-2 text-sm" placeholder="Filter by club..." value={filter.club} onChange={e => setFilter({ ...filter, club: e.target.value })} />
        </div>
        {events.length === 0
          ? <p className="text-gray-500 text-center mt-20">No events found.</p>
          : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{events.map((e: any) => <EventCard key={e._id} event={e} />)}</div>
        }
      </div>
    </div>
  );
}
```

---

### Task 9: Event Detail + RSVP Form + Create Event

**Files:**
- Create: `client/src/pages/EventDetail.tsx`
- Create: `client/src/pages/RSVPForm.tsx`
- Create: `client/src/pages/CreateEvent.tsx`

**Step 1: `client/src/pages/CreateEvent.tsx`**
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function CreateEvent() {
  const [form, setForm] = useState({ title: '', description: '', date: '', location: '', category: 'other', club: '', status: 'draft', budgetEstimated: 0 });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await api.post('/events', form);
    navigate(`/events/${data._id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Create New Event</h2>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <input className="w-full border rounded p-2" placeholder="Event Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <textarea className="w-full border rounded p-2" placeholder="Description" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input className="w-full border rounded p-2" type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          <input className="w-full border rounded p-2" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          <select className="w-full border rounded p-2" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {['social', 'academic', 'outdoor', 'fundraising', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="w-full border rounded p-2" placeholder="Club Name" value={form.club} onChange={e => setForm({ ...form, club: e.target.value })} />
          <select className="w-full border rounded p-2" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          {(form.category === 'fundraising' || form.budgetEstimated > 0) && (
            <input className="w-full border rounded p-2" type="number" placeholder="Estimated Budget ($)" value={form.budgetEstimated} onChange={e => setForm({ ...form, budgetEstimated: Number(e.target.value) })} />
          )}
          <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" type="submit">Create Event</button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: `client/src/pages/EventDetail.tsx`**
```tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);

  useEffect(() => { api.get(`/events/${id}`).then(r => setEvent(r.data)); }, [id]);

  if (!event) return <div className="min-h-screen bg-gray-50"><Navbar /><p className="text-center mt-20">Loading...</p></div>;

  const isCommittee = ['committee', 'president'].includes(user?.role || '');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
          <p className="text-gray-500 mb-4">{new Date(event.date).toLocaleString('en-AU')}</p>
          <p className="text-gray-700 mb-4">{event.description}</p>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Location: {event.location}</span>
            <span>Category: {event.category}</span>
            {event.club && <span>Club: {event.club}</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to={`/events/${id}/rsvp`} className="bg-green-600 text-white text-center py-3 rounded-lg hover:bg-green-700 font-medium">RSVP</Link>
          {isCommittee && <>
            <Link to={`/events/${id}/tasks`} className="bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700 font-medium">Tasks</Link>
            <Link to={`/events/${id}/budget`} className="bg-purple-600 text-white text-center py-3 rounded-lg hover:bg-purple-700 font-medium">Budget</Link>
            <Link to={`/events/${id}/members`} className="bg-orange-600 text-white text-center py-3 rounded-lg hover:bg-orange-700 font-medium">Members</Link>
            <Link to={`/events/${id}/safety`} className="bg-red-600 text-white text-center py-3 rounded-lg hover:bg-red-700 font-medium">Safety Files</Link>
          </>}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: `client/src/pages/RSVPForm.tsx`**
```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function RSVPForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', studentId: '', dietaryRequirements: '', safetyAcknowledged: false });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { api.get(`/events/${id}`).then(r => setEvent(r.data)); }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (event?.category === 'outdoor' && !form.safetyAcknowledged)
      return alert('Please acknowledge the safety disclaimer.');
    await api.post(`/rsvp/event/${id}`, form);
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="max-w-md mx-auto p-6 text-center mt-20">
        <div className="bg-white rounded-lg shadow p-8">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="text-2xl font-bold mb-2">RSVP Confirmed!</h2>
          <p className="text-gray-500">You've registered for {event?.title}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Back to Dashboard</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-md mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">RSVP: {event?.title}</h2>
        <p className="text-gray-500 mb-6">{event && new Date(event.date).toLocaleString('en-AU')}</p>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <input className="w-full border rounded p-2" placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <input className="w-full border rounded p-2" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input className="w-full border rounded p-2" placeholder="Student ID" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} />
          <input className="w-full border rounded p-2" placeholder="Dietary Requirements" value={form.dietaryRequirements} onChange={e => setForm({ ...form, dietaryRequirements: e.target.value })} />
          {event?.category === 'outdoor' && (
            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.safetyAcknowledged} onChange={e => setForm({ ...form, safetyAcknowledged: e.target.checked })} className="mt-1" />
              I acknowledge that this is an outdoor event and I accept associated risks and safety guidelines.
            </label>
          )}
          <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700" type="submit">Confirm RSVP</button>
        </form>
      </div>
    </div>
  );
}
```

---

### Task 10: Task Board, Budget Tracker, Members, Safety Pages

**Files:**
- Create: `client/src/pages/TaskBoard.tsx`
- Create: `client/src/pages/BudgetTracker.tsx`
- Create: `client/src/pages/MembersPage.tsx`
- Create: `client/src/pages/SafetyFiles.tsx`

**Step 1: `client/src/pages/TaskBoard.tsx`**
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const STATUSES = ['todo', 'in_progress', 'done'];

export default function TaskBoard() {
  const { id } = useParams();
  const [tasks, setTasks] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', description: '', deadline: '', role: '', status: 'todo' });
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get(`/tasks/event/${id}`).then(r => setTasks(r.data));
  useEffect(() => { load(); }, [id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/tasks/event/${id}`, form);
    setForm({ title: '', description: '', deadline: '', role: '', status: 'todo' });
    setShowForm(false);
    load();
  };

  const updateStatus = async (taskId: string, status: string) => {
    await api.put(`/tasks/${taskId}`, { status });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Task Board</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Add Task</button>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-2 gap-4">
            <input className="border rounded p-2" placeholder="Task Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <input className="border rounded p-2" placeholder="Role (e.g. Equipment)" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
            <textarea className="border rounded p-2 col-span-2" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <input className="border rounded p-2" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            <button className="bg-blue-600 text-white rounded hover:bg-blue-700" type="submit">Create</button>
          </form>
        )}
        <div className="grid grid-cols-3 gap-4">
          {STATUSES.map(status => (
            <div key={status} className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-semibold mb-3 capitalize">{status.replace('_', ' ')}</h3>
              {tasks.filter(t => t.status === status).map(task => (
                <div key={task._id} className="bg-white rounded p-3 mb-2 shadow-sm">
                  <p className="font-medium text-sm">{task.title}</p>
                  {task.role && <p className="text-xs text-gray-500">{task.role}</p>}
                  {task.deadline && <p className="text-xs text-gray-400">Due: {new Date(task.deadline).toLocaleDateString()}</p>}
                  <div className="flex gap-1 mt-2">
                    {STATUSES.filter(s => s !== status).map(s => (
                      <button key={s} onClick={() => updateStatus(task._id, s)} className="text-xs text-blue-600 hover:underline">→ {s.replace('_', ' ')}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: `client/src/pages/BudgetTracker.tsx`**
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function BudgetTracker() {
  const { id } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ description: '', category: '', estimatedAmount: 0, actualAmount: 0, type: 'expense' });

  const load = () => api.get(`/budget/event/${id}`).then(r => setItems(r.data));
  useEffect(() => { load(); }, [id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post(`/budget/event/${id}`, form);
    setForm({ description: '', category: '', estimatedAmount: 0, actualAmount: 0, type: 'expense' });
    load();
  };

  const totalEstimated = items.reduce((acc, i) => i.type === 'expense' ? acc - i.estimatedAmount : acc + i.estimatedAmount, 0);
  const totalActual = items.reduce((acc, i) => i.type === 'expense' ? acc - i.actualAmount : acc + i.actualAmount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Budget Tracker</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-gray-500 text-sm">Estimated Net</p>
            <p className={`text-2xl font-bold ${totalEstimated >= 0 ? 'text-green-600' : 'text-red-600'}`}>${totalEstimated.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-gray-500 text-sm">Actual Net</p>
            <p className={`text-2xl font-bold ${totalActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>${totalActual.toFixed(2)}</p>
          </div>
        </div>
        <form onSubmit={handleAdd} className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-3 gap-3">
          <input className="border rounded p-2 col-span-2" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
          <select className="border rounded p-2" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input className="border rounded p-2" placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <input className="border rounded p-2" type="number" placeholder="Estimated $" value={form.estimatedAmount} onChange={e => setForm({ ...form, estimatedAmount: Number(e.target.value) })} />
          <input className="border rounded p-2" type="number" placeholder="Actual $" value={form.actualAmount} onChange={e => setForm({ ...form, actualAmount: Number(e.target.value) })} />
          <button className="col-span-3 bg-purple-600 text-white py-2 rounded hover:bg-purple-700" type="submit">Add Item</button>
        </form>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="text-left p-3">Description</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Type</th>
              <th className="text-right p-3">Estimated</th>
              <th className="text-right p-3">Actual</th>
            </tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id} className="border-t">
                  <td className="p-3">{item.description}</td>
                  <td className="p-3 text-gray-500">{item.category}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${item.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.type}</span></td>
                  <td className="p-3 text-right">${item.estimatedAmount}</td>
                  <td className="p-3 text-right">${item.actualAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: `client/src/pages/MembersPage.tsx`**
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function MembersPage() {
  const { id } = useParams();
  const [rsvps, setRsvps] = useState<any[]>([]);

  useEffect(() => { api.get(`/rsvp/event/${id}`).then(r => setRsvps(r.data)); }, [id]);

  const confirmed = rsvps.filter(r => r.status === 'confirmed');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">Members ({confirmed.length} confirmed)</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Student ID</th>
              <th className="text-left p-3">Dietary</th>
              <th className="text-left p-3">Safety Ack</th>
              <th className="text-left p-3">Status</th>
            </tr></thead>
            <tbody>
              {rsvps.map(r => (
                <tr key={r._id} className="border-t">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-gray-600">{r.email}</td>
                  <td className="p-3 text-gray-600">{r.studentId || '-'}</td>
                  <td className="p-3 text-gray-600">{r.dietaryRequirements || '-'}</td>
                  <td className="p-3">{r.safetyAcknowledged ? '✅' : '-'}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${r.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: `client/src/pages/SafetyFiles.tsx`**
```tsx
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

export default function SafetyFiles() {
  const { id } = useParams();
  const [files, setFiles] = useState<any[]>([]);
  const [fileType, setFileType] = useState('waiver');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.get(`/files/event/${id}`).then(r => setFiles(r.data));
  useEffect(() => { load(); }, [id]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', fileType);
    await api.post(`/files/event/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Health & Safety Files</h2>
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-3 items-end">
          <select className="border rounded p-2 text-sm" value={fileType} onChange={e => setFileType(e.target.value)}>
            <option value="waiver">Waiver</option>
            <option value="medical">Medical Form</option>
            <option value="risk_assessment">Risk Assessment</option>
            <option value="other">Other</option>
          </select>
          <input ref={fileRef} type="file" className="border rounded p-2 text-sm flex-1" />
          <button onClick={handleUpload} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm">Upload</button>
        </div>
        <div className="space-y-2">
          {files.map(f => (
            <div key={f._id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{f.filename}</p>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">{f.type}</span>
              </div>
              <a href={`http://localhost:5000${f.url}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">Download</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### Task 11: App Router Setup

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/main.tsx`

**Step 1: `client/src/App.tsx`**
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import RSVPForm from './pages/RSVPForm';
import TaskBoard from './pages/TaskBoard';
import BudgetTracker from './pages/BudgetTracker';
import MembersPage from './pages/MembersPage';
import SafetyFiles from './pages/SafetyFiles';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function CommitteeRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return ['committee', 'president'].includes(user?.role || '') ? <>{children}</> : <Navigate to="/dashboard" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/events/create" element={<CommitteeRoute><CreateEvent /></CommitteeRoute>} />
          <Route path="/events/:id" element={<PrivateRoute><EventDetail /></PrivateRoute>} />
          <Route path="/events/:id/rsvp" element={<RSVPForm />} />
          <Route path="/events/:id/tasks" element={<CommitteeRoute><TaskBoard /></CommitteeRoute>} />
          <Route path="/events/:id/budget" element={<CommitteeRoute><BudgetTracker /></CommitteeRoute>} />
          <Route path="/events/:id/members" element={<CommitteeRoute><MembersPage /></CommitteeRoute>} />
          <Route path="/events/:id/safety" element={<CommitteeRoute><SafetyFiles /></CommitteeRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

**Step 2: `client/src/main.tsx`** — ensure it just renders `<App />`
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

### Task 12: Final Integration Test

**Step 1: Start MongoDB**
```bash
# Ensure MongoDB is running locally on port 27017
```

**Step 2: Start backend**
```bash
cd C:/Users/15489/FIT3162/server && npm run dev
# Expected: MongoDB connected, Server running on port 5000
```

**Step 3: Start frontend**
```bash
cd C:/Users/15489/FIT3162/client && npm run dev
# Expected: Vite running at http://localhost:5173
```

**Step 4: Smoke test**
1. Open http://localhost:5173
2. Register as "president" role
3. Create an event with category "outdoor"
4. View event → RSVP (check safety disclaimer appears)
5. View Tasks, Budget, Members, Safety Files pages
6. Login as different "user" role → verify committee-only pages redirect

---

## Summary

| Feature | Route | Auth |
|---|---|---|
| Dashboard | `/dashboard` | All logged in |
| Create Event | `/events/create` | Committee+ |
| Event Detail | `/events/:id` | All logged in |
| RSVP | `/events/:id/rsvp` | Public |
| Task Board | `/events/:id/tasks` | Committee+ |
| Budget | `/events/:id/budget` | Committee+ |
| Members | `/events/:id/members` | Committee+ |
| Safety Files | `/events/:id/safety` | Committee+ |
