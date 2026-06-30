# Escalation Tracker

A proper full-stack rebuild of the Gmail + Apps Script escalation ticketing system —
same architecture as the Onboarding CRM (Vite + React + TypeScript frontend,
Express + SQLite backend).

## What this replaces

The original system: a Google Sheet (22 columns) + Apps Script trigger that
created tickets from Gmail, tracked SLA breaches at 48/24/12hr thresholds, and
used `SG-YYYYMMDD-XXX` ticket IDs.

This rebuild keeps the same conventions (ticket ID format, SLA tiers, Gmail
intake) but moves the data into a real database with a proper web UI, REST
API, and automated SLA checking via a cron job instead of spreadsheet triggers.

## Project structure

```
escalation-tracker/
├── server/              Express + SQLite API
│   ├── src/
│   │   ├── db/           schema.sql, connection, migration runner
│   │   ├── services/     ticketId, sla, cron, gmail intake
│   │   ├── routes/       tickets API
│   │   └── index.ts      server entry point
│   └── .env.example
└── client/              Vite + React + TypeScript frontend
    └── src/
        ├── pages/         Dashboard, TicketList, TicketDetail
        ├── api/           fetch wrappers
        └── types/         shared TS types
```

## Getting started

### 1. Server

```bash
cd server
npm install
cp .env.example .env
npm run migrate   # creates the SQLite DB and tables
npm run dev       # starts API on http://localhost:4000
```

### 2. Client

```bash
cd client
npm install
npm run dev        # starts UI on http://localhost:5173, proxies /api to :4000
```

Open http://localhost:5173 — you'll see the Dashboard and Tickets pages.
Without Gmail configured, you can still create tickets manually via the
`POST /api/tickets` endpoint (a "New Ticket" form can be added to the UI next).

## Wiring up Gmail intake

The Gmail poller (`server/src/services/gmail.ts`) is built but inert until
credentials are supplied — it logs "polling disabled" and the rest of the app
works fine without it.

To activate:

1. In Google Cloud Console, create/select a project and enable the **Gmail API**.
2. Create OAuth2 credentials (Desktop or Web app type).
3. Generate a refresh token for the inbox you want to monitor (the standard
   OAuth2 playground flow works for a one-time setup, or use a small script
   with `googleapis`).
4. Fill in `.env`:
   ```
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN=...
   GMAIL_LABEL=Escalations
   GMAIL_POLL_MINUTES=5
   ```
5. Restart the server — it'll start polling automatically and log new tickets
   as they're created from incoming Gmail threads.

The poller currently does simple keyword-based priority detection ("urgent",
"critical" → Critical; "escalation", "breach" → High; else Normal). This can
be refined — e.g. mapping specific senders or subject patterns to AMs/teams —
once you see real intake volume.

## What's next (not yet built)

- "New Ticket" form in the UI (API endpoint already exists)
- SLA breach notifications wired to Slack/email instead of console.log
- Auth/login (currently open — fine for local use, needed before any shared hosting)
- Filtering/sorting by AM, team, category on the Tickets page
- CSV/Excel export to match your existing reporting habits
- Deployment target once you decide on hosting
