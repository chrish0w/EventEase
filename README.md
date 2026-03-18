# EventEase

A centralised event management platform for Monash University student clubs.

## Prerequisites

- Node.js (v18+)
- MongoDB (running locally on port 27017)

## Getting Started

### 1. Start MongoDB

Make sure MongoDB is running on your machine before starting the backend.

### 2. Start the Backend

```bash
cd server
npm install
npm run dev
```

Runs on `http://localhost:5000`

### 3. Start the Frontend

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`

## Environment Variables

The backend requires a `.env` file in the `server/` directory:

```
MONGO_URI=mongodb://localhost:27017/eventease
JWT_SECRET=eventease_secret_key_2026
PORT=5000
```

## Roles

| Role | Description |
|------|-------------|
| `president` | Creates and manages events, assigns committee members |
| `committee` | Manages assigned events with role-specific responsibilities |
| `user` | Views and RSVPs to published events |
