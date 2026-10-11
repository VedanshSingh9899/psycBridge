# Frontend — Phase 1 minimal React UI

> Full docs: [`../INDEX.md`](../INDEX.md). API: [`../docs/API.md`](../docs/API.md).

React + Vite, no router, no UI kit. Mirrors `legacy-test-ui.html` (the old
single-file test UI, kept for reference).

## Run

```powershell
cd frontend
npm install
npm run dev      # -> http://localhost:5173
```

Backend must be running (`cd backend; npm run dev`, default
`http://localhost:3000/api/v1` — see `backend/src/config.js`).

Point at another backend:

```powershell
# .env
VITE_API_URL=http://localhost:3001/api/v1
```

(`.env.example` shows the default. Docs say `:3001`; code default is `:3000`
unless `PORT` is set — either works via `VITE_API_URL`.)

## What it covers

- Seeker: Talk Now → triage (yes/no/skip) → queue poll (3s, ETA/position) →
  chat poll (2s, 8/10-min timer) → end + 👍/👎 vote → SOS path.
- Listener: Go Available → Accept next → chat → End.
- Footer shows the active backend base URL.

Click-path: [`../docs/testing/testing-frontend.md`](../docs/testing/testing-frontend.md).
