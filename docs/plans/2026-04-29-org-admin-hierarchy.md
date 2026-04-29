# Org/Admin Hierarchy Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separate Organisation and Club into two distinct levels, with `super_admin` managing Organisations, `admin` (org-scoped) managing Clubs within their Organisation, and remove all platform-level admin confusion.

**Architecture:** Introduce a new `Organisation` model (top-level, managed by super_admin). `Club` gains an `orgId` field to belong to an Organisation. A new `OrgAdminAssignment` model binds a user to an Organisation when Super Admin promotes them to `admin`. The `admin` role remains on `User.role` for JWT/middleware checks, but is now always org-scoped via the assignment record.

**Tech Stack:** Node.js + Express + Mongoose (backend), React + TypeScript + React Router (frontend), JWT auth

---

### Task 1: Create the `Organisation` Mongoose model

**Files:**
- Create: `server/src/models/Organisation.js`

**Step 1: Create the model**

```js
// server/src/models/Organisation.js
const mongoose = require('mongoose');

const organisationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Organisation', organisationSchema);
```

**Step 2: Verify it loads without error**

```bash
cd C:/Users/15489/FIT3162/server
node -e "require('./src/models/Organisation'); console.log('OK')"
```
Expected: `OK`

---

### Task 2: Create the `OrgAdminAssignment` Mongoose model

**Files:**
- Create: `server/src/models/OrgAdminAssignment.js`

**Step 1: Create the model**

```js
// server/src/models/OrgAdminAssignment.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  orgId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true },
}, { timestamps: true });

module.exports = mongoose.model('OrgAdminAssignment', schema);
```

Note: `userId` is unique — one user can only be org admin of one org at a time.

**Step 2: Verify it loads**

```bash
node -e "require('./src/models/OrgAdminAssignment'); console.log('OK')"
```
Expected: `OK`

---

### Task 3: Add `orgId` to the `Club` model

**Files:**
- Modify: `server/src/models/Club.js`

**Step 1: Update the schema**

Replace the entire file content:

```js
const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Club', clubSchema);
```

**Step 2: Verify it loads**

```bash
node -e "require('./src/models/Club'); console.log('OK')"
```
Expected: `OK`

---

### Task 4: Rewrite super-admin backend routes to use Organisations

**Files:**
- Modify: `server/src/routes/superAdmin.js`

**Step 1: Rewrite the file**

```js
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

// List all users (excluding super_admin)
router.get('/users', superAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'super_admin' } }, 'name email role').sort({ name: 1 });
    // Attach orgId for admins
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
```

---

### Task 5: Update auth login to return `orgId` for admin users

**Files:**
- Modify: `server/src/routes/auth.js`

**Step 1: Import OrgAdminAssignment and update the login handler**

Replace the login route (lines 19-30) with:

```js
const OrgAdminAssignment = require('../models/OrgAdminAssignment');
```

Add the import at the top of the file, then update login:

```js
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    let orgId = null;
    if (user.role === 'admin') {
      const assignment = await OrgAdminAssignment.findOne({ userId: user._id });
      orgId = assignment?.orgId || null;
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, orgId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

---

### Task 6: Update clubs backend routes — admin scoped to their org

**Files:**
- Modify: `server/src/routes/clubs.js`

**Step 1: Import OrgAdminAssignment and update the routes**

Replace entire file:

```js
const router = require('express').Router();
const auth = require('../middleware/auth');
const Club = require('../models/Club');
const ClubMembership = require('../models/ClubMembership');
const JoinRequest = require('../models/JoinRequest');
const OrgAdminAssignment = require('../models/OrgAdminAssignment');

// Helper: get orgId for the current admin user
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
    const { userId } = req.body;
    await ClubMembership.findOneAndUpdate(
      { userId, clubId: req.params.id },
      { userId, clubId: req.params.id, role: 'president' },
      { upsert: true, new: true }
    );
    res.json({ message: 'President assigned' });
  } catch (err) {
    res.status(400).json({ message: err.message });
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
    if (!membership) return res.status(403).json({ message: 'Not a member' });
    const members = await ClubMembership.find({ clubId: req.params.id })
      .populate('userId', 'name email studentId');
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
```

---

### Task 7: Register the new routes in index.js

**Files:**
- Modify: `server/src/index.js`

**Step 1: Verify current route registration**

Read `server/src/index.js` and confirm `/super-admin` and `/clubs` are registered. No change needed to route registration since we kept the same route prefixes. Just verify the file mounts them correctly.

---

### Task 8: Update `AuthContext` — add `orgId` to User type

**Files:**
- Modify: `client/src/context/AuthContext.tsx`

**Step 1: Add `orgId` to the User interface**

Change:
```ts
interface User { id: string; name: string; email: string; role: string; }
```
To:
```ts
interface User { id: string; name: string; email: string; role: string; orgId?: string | null; }
```

No other changes needed — `orgId` comes from the login response and is already stored in `user` via `login()`.

---

### Task 9: Update `Login.tsx` — admin redirect (already done, verify)

**Files:**
- Verify: `client/src/pages/Login.tsx`

The redirect for `super_admin` was already fixed in a prior step. Confirm lines 17-19 read:

```ts
if (data.user.role === 'super_admin') navigate('/super-admin/dashboard');
else if (data.user.role === 'admin') navigate('/admin/dashboard');
else navigate('/club-select');
```

No further changes needed here.

---

### Task 10: Rewrite `SuperAdminOrgsPage.tsx` — use `/super-admin/organisations`

**Files:**
- Modify: `client/src/pages/SuperAdminOrgsPage.tsx`

Replace all occurrences of `/super-admin/clubs` with `/super-admin/organisations` and update the `Club` interface name to `Organisation`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface Organisation {
  _id: string;
  name: string;
  description?: string;
  createdBy: { name: string };
}

export default function SuperAdminOrgsPage() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const fetchOrgs = () => {
    api.get('/super-admin/organisations')
      .then(res => setOrgs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrgs(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/super-admin/organisations', form);
      setForm({ name: '', description: '' });
      setShowCreate(false);
      fetchOrgs();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to create');
    }
  };

  const handleEdit = async (id: string) => {
    try {
      await api.put(`/super-admin/organisations/${id}`, editForm);
      setEditingId(null);
      fetchOrgs();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to update');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This also removes all clubs and admin assignments.`)) return;
    try {
      await api.delete(`/super-admin/organisations/${id}`);
      fetchOrgs();
    } catch {
      alert('Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/super-admin/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-xl font-bold text-gray-800">Organisation Management</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">All Organisations ({orgs.length})</h2>
            <button
              onClick={() => setShowCreate(v => !v)}
              className="bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              {showCreate ? 'Cancel' : '+ New Organisation'}
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Create Organisation</h3>
              <input
                required
                placeholder="Organisation name"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button type="submit" className="bg-purple-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-purple-700 transition">
                Create
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : orgs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No organisations yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orgs.map(org => (
                <div key={org._id} className="py-4">
                  {editingId === org._id ? (
                    <div className="space-y-2">
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        value={editForm.description}
                        onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Description"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(org._id)} className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-sm bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{org.name}</p>
                        {org.description && <p className="text-xs text-gray-400 mt-0.5">{org.description}</p>}
                        <p className="text-xs text-gray-300 mt-0.5">Created by {org.createdBy?.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingId(org._id); setEditForm({ name: org.name, description: org.description || '' }); }}
                          className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(org._id, org.name)}
                          className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Task 11: Rewrite `SuperAdminOrgAdminsPage.tsx` — assign admin to specific org

**Files:**
- Modify: `client/src/pages/SuperAdminOrgAdminsPage.tsx`

Replace entire file. Key changes:
- "Promote to Admin" now requires selecting an Organisation
- Remove the "Assign Club Presidents" section (done by org admin)
- "Remove Admin" calls the new `/remove-org-admin` endpoint

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  orgId?: string | null;
}

interface Organisation {
  _id: string;
  name: string;
}

export default function SuperAdminOrgAdminsPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteOrgMap, setPromoteOrgMap] = useState<Record<string, string>>({});

  const fetchData = () => {
    Promise.all([
      api.get('/super-admin/users'),
      api.get('/super-admin/organisations'),
    ]).then(([usersRes, orgsRes]) => {
      setUsers(usersRes.data);
      setOrgs(orgsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssignOrgAdmin = async (userId: string) => {
    const orgId = promoteOrgMap[userId];
    if (!orgId) return alert('Please select an organisation first');
    try {
      await api.put(`/super-admin/users/${userId}/assign-org-admin`, { orgId });
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to assign org admin');
    }
  };

  const handleRemoveOrgAdmin = async (userId: string) => {
    try {
      await api.put(`/super-admin/users/${userId}/remove-org-admin`);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to remove org admin');
    }
  };

  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin');

  const orgNameById = (id?: string | null) => orgs.find(o => o._id === id)?.name || 'Unknown';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/super-admin/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-xl font-bold text-gray-800">Org Admin Management</h1>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Current Org Admins */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Org Admins ({admins.length})</h2>
              {admins.length === 0 ? (
                <p className="text-sm text-gray-400">No org admins yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {admins.map(u => (
                    <div key={u._id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                        <p className="text-xs text-purple-500 mt-0.5">Org: {orgNameById(u.orgId?.toString())}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveOrgAdmin(u._id)}
                        className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Promote User to Org Admin */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Assign Org Admin</h2>
              {regularUsers.length === 0 ? (
                <p className="text-sm text-gray-400">No users available.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {regularUsers.map(u => (
                    <div key={u._id} className="py-3">
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email} · {u.role}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <select
                          value={promoteOrgMap[u._id] || ''}
                          onChange={e => setPromoteOrgMap(p => ({ ...p, [u._id]: e.target.value }))}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select organisation...</option>
                          {orgs.map(o => (
                            <option key={o._id} value={o._id}>{o.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssignOrgAdmin(u._id)}
                          className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition whitespace-nowrap"
                        >
                          Assign as Org Admin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Task 12: Update `AdminDashboard.tsx` — show org name, clubs scoped to org

**Files:**
- Modify: `client/src/pages/AdminDashboard.tsx`

**Step 1: Import `useAuth` and show org context in the header**

The key changes:
- Fetch org info to display org name
- "Clubs" are now clubs within their org (backend already filters by orgId)
- Remove `api.get('/auth/users')` — admin doesn't need platform user list here

Replace the entire file:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Club {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [members, setMembers] = useState<Record<string, UserOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);

  const fetchClubs = () => {
    Promise.all([api.get('/clubs'), api.get('/auth/users')])
      .then(([clubsRes, usersRes]) => {
        setClubs(clubsRes.data);
        setAllUsers(usersRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClubs(); }, []);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/clubs', form);
      setClubs(prev => [...prev, data]);
      setForm({ name: '', description: '' });
      setShowCreate(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to create club');
    }
  };

  const handleAssignPresident = async (clubId: string) => {
    const userId = assignMap[clubId];
    if (!userId) return alert('Please select a user first');
    try {
      await api.post(`/clubs/${clubId}/assign-president`, { userId });
      alert('President assigned successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to assign president');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white mb-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
              <p className="text-gray-300 text-sm">Manage clubs and assign presidents within your organisation.</p>
            </div>
            <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Org Admin
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-800">Clubs ({clubs.length})</h2>
            <button
              onClick={() => setShowCreate(v => !v)}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showCreate ? 'Cancel' : '+ New Club'}
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreateClub} className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Create New Club</h3>
              <input
                required
                placeholder="Club name"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition">
                Create Club
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : clubs.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 font-medium">No clubs yet</p>
              <p className="text-gray-400 text-sm mt-1">Create the first club above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clubs.map(club => (
                <div key={club._id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{club.name}</p>
                      {club.description && <p className="text-xs text-gray-400 mt-0.5">{club.description}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 items-center">
                    <select
                      value={assignMap[club._id] || ''}
                      onChange={e => setAssignMap(p => ({ ...p, [club._id]: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Assign President...</option>
                      {allUsers.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignPresident(club._id)}
                      className="text-sm bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition font-medium"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Task 13: Update `SuperAdminDashboard.tsx` stats label

**Files:**
- Modify: `client/src/pages/SuperAdminDashboard.tsx`

**Step 1: Update the stats labels**

Change the stats labels to match the new backend response (`totalOrgs` instead of `totalClubs`):

```tsx
interface Stats {
  totalOrgs: number;
  totalUsers: number;
  totalAdmins: number;
}
```

And in the stats grid:
```tsx
{ label: 'Total Organisations', value: stats.totalOrgs },
{ label: 'Total Users', value: stats.totalUsers },
{ label: 'Org Admins', value: stats.totalAdmins },
```

---

### Task 14: Final — restart server and verify

**Step 1: Restart the backend**

```bash
cd C:/Users/15489/FIT3162/server
node src/index.js
```

**Step 2: Check the server registers routes correctly**

Confirm in console output no errors about missing models.

**Step 3: Manual smoke test flow**
1. Login as `superadmin@eventease.com` → lands on Super Admin Dashboard
2. Go to Organisation Management → create a new organisation
3. Go to Org Admin Management → find a regular user, select the new org, click "Assign as Org Admin"
4. Log out, log in as that user → lands on Admin Dashboard
5. Create a club → should succeed
6. Check that the club is tied to the correct org (via MongoDB or API)

---
