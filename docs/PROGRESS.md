# EventEase — Development Progress

## Overview

EventEase is a centralised event management platform for Monash University student clubs. This document outlines what has been implemented so far, the system architecture, available API endpoints, and user flows.

---

## Current Status

### Completed

- [x] User authentication (register, login, JWT)
- [x] Role-based access control (admin, president, committee, user)
- [x] Club system (create clubs, assign presidents, join requests, membership)
- [x] Event management (create, edit, delete, publish)
- [x] Committee role assignment within events (finance, logistics, equipment, transport, general)
- [x] Role-specific event panels for committee members
- [x] President join request approval/rejection UI
- [x] Multi-club support (one account can belong to multiple clubs with different roles)
- [x] Club selection screen after login
- [x] Admin dashboard (create clubs, assign presidents)
- [x] Admin seed script
- [x] Budget feature backend core (club income sources, event budgets, budget drafts)
- [x] President budget page with income chart, remaining funds, spending report, and event budget details
- [x] Embedded event budget grid in event creation/editing
- [x] Remaining club budget calculation based on actual spending

### In Progress / Not Yet Started

- [ ] RSVP system (backend model + UI)
- [ ] Task assignment and tracking
- [ ] Health & Safety file uploads
- [ ] Member management page for presidents
- [ ] Profile page for users

---

## Budget Feature Update

The budget feature has been implemented for presidents at both club and event level.

### Backend

- Added `Budget` records for saved event budgets.
- Added `BudgetDraft` records for event budget drafts before an event is created.
- Added club-level budget fields in `Club`:
  - `totalBudget`
  - `remainingBudget`
  - `incomeSources`
- Added `/api/budget` routes for:
  - Club budget summaries
  - Adding income by source
  - Saving event budget drafts
  - Saving event budget updates for existing events
  - Loading event budget details for reports
- Event creation can now promote a saved budget draft into a real event budget.
- Event deletion removes the related budget and recalculates remaining funds.
- `remainingBudget` is calculated as total club funds minus actual spending.

### Frontend

- Added `/president/budget` for the club budget page.
- Added a `View` action on the President Dashboard budget overview card.
- Dashboard budget overview now displays the same remaining amount shown on the Budget page.
- Added a Source of Income section with a half-pie chart and source percentages.
- Added an Add Income modal for:
  - Organization
  - Membership fees
  - Event Income
  - Sponsorship
  - Others
- Added a Spending section with event-level report rows:
  - Event name
  - Event budget
  - Event actual budget
  - Read-only Details modal
- Embedded an Event Budget section into event creation and edit:
  - Assigned Amount
  - Actual Amount
  - Description
  - Add Row button during creation
  - Save Budget button
- In event edit, assigned amounts are locked while actual amount and description remain editable.
- If the president clicks Create Event or Save Changes without separately clicking Save Budget, unsaved budget changes are still sent to the backend.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v7 |
| HTTP Client | Axios |
| Backend | Node.js + Express 5 |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |

---

## Project Structure

```
FIT3162/
├── client/                   # Frontend (React + TypeScript)
│   └── src/
│       ├── api/
│       │   └── axios.ts              # Axios instance (base URL + auth header)
│       ├── context/
│       │   └── AuthContext.tsx       # Global auth + selected club state
│       ├── pages/
│       │   ├── HomePage.tsx          # Public landing page
│       │   ├── Login.tsx             # Login page
│       │   ├── Register.tsx          # Register page (user only)
│       │   ├── ClubSelectPage.tsx    # Post-login club picker
│       │   ├── JoinClubPage.tsx      # Browse and apply to clubs
│       │   ├── AdminDashboard.tsx    # Admin: create clubs, assign presidents
│       │   ├── PresidentDashboard.tsx    # President: overview + join requests
│       │   ├── PresidentEventsPage.tsx   # President: full event list
│       │   ├── CreateEventPage.tsx       # Create / Edit event form (shared)
│       │   ├── CommitteeDashboard.tsx    # Committee: overview
│       │   ├── CommitteeEventsPage.tsx   # Committee: events with role panels
│       │   └── UserDashboard.tsx         # Member: view published events
│       └── App.tsx                   # Route definitions
│
└── server/                   # Backend (Node.js + Express)
    ├── scripts/
    │   └── createAdmin.js            # One-time admin account seed script
    └── src/
        ├── index.js                  # Express app entry point
        ├── middleware/
        │   └── auth.js               # JWT verification middleware
        ├── models/
        │   ├── User.js               # User schema (roles: admin/president/committee/user)
        │   ├── Club.js               # Club schema
        │   ├── ClubMembership.js     # Links users to clubs with roles
        │   ├── JoinRequest.js        # Club join requests
        │   └── Event.js              # Event schema (linked to club)
        └── routes/
            ├── auth.js               # POST /register, POST /login, GET /users
            ├── clubs.js              # Club and membership management
            └── events.js             # Event CRUD
```

---

## Role Hierarchy

```
Admin (Monash account)
  └── Creates Clubs
  └── Assigns Presidents

President (assigned by Admin)
  └── Approves / Rejects join requests
  └── Promotes members to Committee (with role)
  └── Creates and manages Events
  └── Assigns Committee members to Events

Committee (assigned by President)
  └── Creates Events
  └── Manages their assigned events
  └── Sees role-specific panels:
        finance    → Budget Tracking
        logistics  → Logistics Checklist
        equipment  → Equipment List
        transport  → Transport Arrangements
        general    → Event Notes

User / Member (self-registered)
  └── Applies to join Clubs
  └── Views published Events
  └── RSVPs to Events (not yet implemented)
```

---

## Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017

### 1. Environment Variables

Create `server/.env`:
```
MONGO_URI=mongodb://localhost:27017/eventease
JWT_SECRET=eventease_secret_key_2026
PORT=5000
```

### 2. Start the Backend
```bash
cd server
npm install
npm run dev
```
Runs on `http://localhost:5000`

### 3. Start the Frontend
```bash
cd client
npm install
npm run dev
```
Runs on `http://localhost:5173`

### 4. Seed the Admin Account (run once)
```bash
cd server
node scripts/createAdmin.js
```

| Field | Value |
|-------|-------|
| Email | `admin@monash.edu` |
| Password | `Admin@2026` |

---

## API Endpoints

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register a new user account |
| POST | `/login` | Public | Login and receive JWT token |
| GET | `/users` | Admin | List all registered users |

### Clubs — `/api/clubs`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Any | List all clubs |
| POST | `/` | Admin | Create a new club |
| GET | `/my` | Any | Get current user's club memberships |
| POST | `/:id/request` | Any | Apply to join a club |
| GET | `/:id/requests` | President | Get pending join requests for a club |
| PUT | `/:id/requests/:requestId` | President | Approve or reject a join request |
| POST | `/:id/assign-president` | Admin | Assign a president to a club |
| PUT | `/:id/members/:userId/role` | President | Update a member's role in the club |
| GET | `/:id/members` | President/Committee | List all members of a club |

### Events — `/api/events`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/?clubId=` | Member+ | List events for a club (filtered by role) |
| POST | `/` | President/Committee | Create a new event |
| GET | `/committee-members?clubId=` | President | List assignable members for an event |
| GET | `/:id` | Member+ | Get a single event |
| PUT | `/:id` | President/Creator | Update an event |
| DELETE | `/:id` | President | Delete an event |

**Event visibility by role:**
- `president` → all events in the club
- `committee` → all events in the club
- `user` → published events only

### Budget — `/api/budget`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/?clubId=` | President | Get club budget summary, income sources, and event budget report |
| GET | `/event/:eventId?clubId=` | President | Get budget rows for a single event |
| PATCH | `/income` | President | Add received income to club budget source buckets |
| PATCH | `/total` | President | Update club budget total/source values |
| PUT | `/draft` | President | Save or overwrite an event budget draft before event creation |
| PUT | `/event/:eventId` | President | Save actual spending and descriptions for an existing event budget |

---

## Frontend Routes

| Path | Component | Access |
|------|-----------|--------|
| `/` | HomePage | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/club-select` | ClubSelectPage | Authenticated |
| `/clubs/join` | JoinClubPage | Authenticated |
| `/admin/dashboard` | AdminDashboard | Admin |
| `/president/dashboard` | PresidentDashboard | President |
| `/president/events` | PresidentEventsPage | President |
| `/president/events/create` | CreateEventPage | President |
| `/president/events/:id/edit` | CreateEventPage | President |
| `/president/budget` | PresidentBudgetPage | President |
| `/committee/dashboard` | CommitteeDashboard | Committee |
| `/committee/events` | CommitteeEventsPage | Committee |
| `/committee/events/create` | CreateEventPage | Committee |
| `/user/dashboard` | UserDashboard | Member |

---

## Key User Flows

### New User Flow
1. Register at `/register` → account created with `user` role
2. Redirected to `/clubs/join` → browse and apply to join a club
3. President approves the request
4. Next login → `/club-select` → select club → member dashboard

### Admin Flow
1. Login with `admin@monash.edu` / `Admin@2026`
2. Redirected to `/admin/dashboard`
3. Create a club → assign a president from existing users

### President Flow
1. Login → `/club-select` → select club (shown as President)
2. Redirected to `/president/dashboard`
3. Review and approve/reject join requests
4. Go to `/president/events` → create/edit/delete events
5. When creating an event: assign committee members with specific roles
6. Add and save event budget drafts during event creation
7. Edit event budgets later by updating actual spending and descriptions
8. Go to `/president/budget` to add club income, view remaining funds, and inspect spending reports

### Committee Flow
1. Login → `/club-select` → select club (shown with committee role)
2. Redirected to `/committee/dashboard`
3. Go to `/committee/events` → view assigned events
4. Expand an event to see role-specific panel (e.g. finance → budget tracker)

### Member Flow
1. Login → `/club-select` → select club (shown as Member)
2. Redirected to `/user/dashboard`
3. View published events from the club
4. RSVP button visible (functionality not yet implemented)
