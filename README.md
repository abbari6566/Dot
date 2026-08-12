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

## Flashcards and review notifications

Users can organize topic-based flashcards into multiple review groups, give each group
its own daily reminder, and study cards in a swipeable, click-to-reveal deck. Reminder
times are stored with the browser's IANA timezone so daylight-saving changes are handled.

Apply the database migration and generate the Prisma client:

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

Browser notifications use the open Web Push protocol and do not have a per-message
fee. Generate one VAPID key pair (do not regenerate it after users subscribe):

```bash
cd server
npx web-push generate-vapid-keys --json
```

Put the generated values in `server/.env`:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

The server checks for due reminders once per minute. In production it must run as a
long-lived process; a host that sleeps will not dispatch reminders while asleep.
Notification permission and service workers require HTTPS in production (`localhost`
is allowed during development).
