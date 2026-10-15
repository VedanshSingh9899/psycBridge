# Frontend — 3 links, 1 codebase (React + Vite)

> Full docs: [`../INDEX.md`](../INDEX.md). API: [`../docs/API.md`](../docs/API.md).

React + Vite, no router, no UI kit. Hostname decides the site:
`localhost:5173` → seeker · `pro.localhost:5173` → listener desk ·
`admin.localhost:5173` → coordinator. `?app=` overrides anywhere.

`legacy-test-ui.html` is the old single-file test UI, kept for reference.

## Run

```powershell
cd frontend
npm install
npm run dev -- --host --port 5173
```

Faster: `docker compose up -d` at repo root (builds + serves via nginx).

Backend must be reachable (`http://localhost:3000/api/v1` by default —
see `backend/src/config.js`).

Point at another backend (local dev via `.env`, docker via build-arg):

```powershell
# frontend/.env
VITE_API_URL=http://localhost:3000/api/v1
```

## What it covers

- Seeker: Talk Now → triage (yes/no/skip) → queue poll (ETA/position) →
  chat poll (2s, 8/10-min timer) → end + 👍/👎 vote → SOS path.
- Listener: OTP login (demo `123456`) → Available/Full/Paused → queue
  (priority sort, greet context, Skip) → session (timer, wrap script, supervisor
  ping, nudge, report) → after (follow-up booking, private notes) → My Clients,
  Schedule, Today recap.
- Admin: passcode gate → health → stuck table → warm assign/pings (audit-logged) → reports.
- Footer shows the active backend base URL.

Click-path: [`../docs/testing/testing-frontend.md`](../docs/testing/testing-frontend.md).
