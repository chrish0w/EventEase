# EventEase

EventEase is a full-stack web application for centralised event management in university club environments. The system supports role-based workflows for platform administrators, organisation administrators, club presidents, committee members, and student members.

## Features

- Public home, about, contact, organisation registration, club registration, sign-up, and sign-in pages
- Role-based dashboards for super admin, organisation admin, president, committee, and member users
- Organisation registration review and organisation management
- Club registration review, club management, membership management, and president assignment
- Event creation, editing, deletion, publishing, browsing, and RSVP workflows
- Committee workspace assignment with task tracking and close-out requests
- Budget planning and reporting for club and event-level budgets
- Safety/disclaimer templates with event-facing safety information

## Technology Stack

- Frontend: React 19, TypeScript, Vite, React Router, Axios, Tailwind CSS
- Backend: Node.js, Express, MongoDB, Mongoose
- Authentication: JSON Web Token (JWT) authentication and bcrypt password hashing

## Prerequisites

- Node.js 18 or later
- npm
- MongoDB running locally on port `27017`

## Environment Setup

Create a backend environment file:

```bash
cd server
cp .env.example .env
```

The default local configuration is:

```text
MONGO_URI=mongodb://localhost:27017/eventease
JWT_SECRET=your_jwt_secret_here
PORT=5000
```

For local development, replace `JWT_SECRET` with any non-empty development secret.

## Install Dependencies

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd client
npm install
```

## Running the Application

Start MongoDB first. On macOS with Homebrew, this is commonly:

```bash
brew services start mongodb-community
```

Alternatively, run MongoDB using your local MongoDB installation method.

Start the backend:

```bash
cd server
npm run dev
```

`npm run dev` seeds the local MongoDB database, then starts the Express API with Nodemon. The backend runs at:

```text
http://localhost:5000
```

Start the frontend in a second terminal:

```bash
cd client
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Open `http://localhost:5173` in a browser to use EventEase.

## Seed Data and Test Accounts

The backend seed script is located at:

```text
server/scripts/seedTestData.js
```

The seed script creates the core demonstration database records required to run and assess the project, including organisations, clubs, users, memberships, events, budgets, workspaces, tasks, RSVPs, and registration requests.

Useful seeded accounts:

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| Super Admin | `superadmin@eventease.com` | `123456` | Platform administrator |
| Organisation Admin | `orgadmin@unimelb.test` | `123456` | Manages University of Melbourne clubs |
| Organisation Admin | `orgadmin2@unimelb.test` | `123456` | Second organisation admin |
| President | `president@codingclub.test` | `123456` | President of Melbourne Coding Society |
| Committee | `committee@codingclub.test` | `123456` | Committee member in Melbourne Coding Society |
| Committee | `finance@codingclub.test` | `123456` | Finance committee member |
| Member | `member@codingclub.test` | `123456` | Regular student member |
| Requester | `requester@clubs.test` | `123456` | Submitted a seeded club request |

The seed script also prints the full set of seeded users to the terminal after it runs.

## Database Export for Submission

This repository includes the seed script required to recreate the development database. For university archive submission, a MongoDB dump can also be included in the ZIP file.

With MongoDB running and the seed data loaded, export the database from the repository root:

```bash
mkdir -p database-dump
mongodump --db eventease --out database-dump
```

This creates:

```text
database-dump/eventease/
```

Include the `database-dump/` folder in the final ZIP submission if required by the submission instructions.

To restore the dump on another machine:

```bash
mongorestore --db eventease database-dump/eventease
```

## Build Checks

Frontend production build:

```bash
cd client
npm run build
```

Backend start without reseeding:

```bash
cd server
npm run dev:no-seed
```

## Recommended ZIP Submission Contents

For Moodle submission, include the project source files and database reconstruction material. The ZIP should include:

- `client/`
- `server/`
- root configuration files, including `.gitignore` and `README.md`
- `database-dump/`, if a MongoDB dump has been exported

The ZIP should not include:

- `node_modules/`
- `.git/`
- `.env`
- generated build output such as `dist/`
- report-writing drafts, generated report outputs, or other non-source documentation

