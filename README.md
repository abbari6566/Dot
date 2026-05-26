# Dot — Productivity App

A focused productivity app with Pomodoro session tracking and display lock for deep work.

## Tech Stack

- **Frontend** — React (Vite)
- **Backend** — Express + TypeScript
- **Database** — PostgreSQL (Neon) via Prisma ORM

## Project Structure

```
dot/
├── client/   # React frontend
└── server/   # Express API
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) database (or any PostgreSQL instance)

### Server

```bash
cd server
npm install
cp .env.example .env   # fill in your values
npx prisma migrate dev
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

## Environment Variables

See `server/.env.example` for all required variables.
