# Rare Bird Dashboard

Rare Bird Dashboard is a personal birding dashboard for tracking ABA rarity alerts from eBird. The current app ingests ABA Rarities emails, parses sightings, enriches them with eBird data when possible, clusters related sightings into incident records, and shows those incidents in a React dashboard with a Leaflet map and card list.

## Current Capabilities

- Email ingestion from an IMAP inbox for eBird ABA Rarities alerts
- Parsing of quoted-printable `.eml` alert bodies into structured sightings
- SQLite storage through Prisma
- Optional eBird API enrichment for coordinates, checklist IDs, and related metadata
- Incident clustering by normalized species name and proximity
- Background incident summarization using Groq first, with Gemini fallback
- Dashboard filtering by ABA rarity code and a 50 km "Near Me" toggle

## Stack

- Backend: Node.js, Express, TypeScript, Prisma, SQLite, Vitest
- Frontend: React, TypeScript, Vite, Leaflet, React-Leaflet
- Automation: IMAP via `imapflow`

## Local Setup

### Prerequisites

- Node.js
- npm

### Install

```bash
npm run install:all
```

### Backend Environment

Create `backend/.env` from `backend/.env.example` and set what you need:

- `DATABASE_URL`
- `IMAP_HOST`
- `IMAP_PORT`
- `IMAP_USER`
- `IMAP_PASS`
- `IMAP_SECURE`
- `EBIRD_API_KEY` for enrichment
- `GROQ_API_KEY` and/or `GEMINI_API_KEY` for summaries

### Database

The backend is configured for SQLite, not PostgreSQL. A typical local value is:

```bash
DATABASE_URL="file:./dev.db"
```

Run Prisma migrations from `backend/` as needed:

```bash
npx prisma migrate dev
```

## Run

From the repo root:

```bash
npm start
```

That starts:

- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173`

The frontend proxies `/api` requests to the backend during local development.

## Tests

```bash
npm test --prefix backend
npm test --prefix frontend
```

## Notes

- Startup ingestion runs automatically when the backend starts.
- The dashboard currently renders incident cards and map pins, but it does not yet have a drill-down detail view.
- The "Discuss" link on cards is still a static Discord link, not incident-specific routing.
