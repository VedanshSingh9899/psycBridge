# psycBridge

> Start here. This file is the map for the whole repo. Click around via [INDEX.md](INDEX.md).

## What is psycBridge?

Uber / Urban-Company-style network for psychiatrists + psychologists in India,
with privacy so deep even family doesn't know if the user wants that.

- **Seeker:** 1 tap `Talk Now` → anonymous alias → human in ~3 min. No login, no OTP, no 10-question form.
- **Care graph:** file travels, user doesn't. Brief slides A → B → C (Yes / No / Suggest C), max 3 hops, single owner always.
- **Money:** no paywall on first cry. Phase 1 = direct UPI, zero commission.

## Doc index

Start at **[INDEX.md](INDEX.md)** — every doc, clickable from one page.

| File | What | Who |
|------|------|-----|
| `INDEX.md` | hub — click through to every doc | everyone |
| `README.md` (this file) | overview + where everything lives | everyone |
| `docs/HOW-TO-RUN.md` | run backend + frontend locally in 5 min | anyone testing |
| `docs/testing/testing-backend.md` | API tests + edge cases (copy-paste) | anyone testing |
| `docs/testing/testing-frontend.md` | browser UI click-path + two-tab test | anyone testing |
| `docs/testing/testing-checklist.md` | pilot exit criteria mapped to spec | anyone testing |
| `docs/API.md` | Phase 1 endpoints, verified against code | backend / frontend |
| `docs/SEED.md` | demo data + how to seed a test session | anyone demoing |
| `docs/seed.demo.ps1` | one-click script: join → accept → chat → end | anyone demoing |
| `docs/PHASES.md` | what's built (P1) vs placeholders (P2/P3) | new joiners |

## Specs, ideas & pitch (live in `docs/` subfolders)

| File | Phase | Content |
|------|-------|---------|
| `docs/specs/requirements.md` | SDLC-1 | FR-01…FR-53, NFR-01…NFR-11, pilot metrics |
| `docs/specs/design.md` | SDLC-2 | module view, flows, queue/Redis design |
| `docs/specs/DesignER.md` | SDLC-2 detailed | **wins on conflict** — full DDL, sequences, masking matrix, build checklist |
| `docs/ideas/BRAINSTORM.md` | idea | original thesis |
| `docs/ideas/notes2.md` | idea | founder notes, short version |
| `docs/pitch/pitch.md` | pitch | problem → promise → ask |
| `docs/pitch/pitch.html`, `docs/pitch/deck.html`, `docs/pitch/business-deck.html` | pitch | slide decks (open in browser) |

## Repo map

```
psycBridge/
├── INDEX.md, README.md      ← you are here (start at INDEX.md)
├── docs/                    ← guides + testing + seed script
│   ├── HOW-TO-RUN.md, API.md, SEED.md, PHASES.md, seed.demo.ps1
│   ├── specs/               ← requirements.md, design.md, DesignER.md
│   ├── ideas/               ← BRAINSTORM.md, notes2.md
│   ├── pitch/               ← pitch.md + pitch/deck/business-deck .html
│   └── testing/             ← testing-backend/frontend/checklist .md
├── backend/               ← Phase 1 working code (Express, in-memory store, no DB)
│   ├── src/index.js       ← boot
│   ├── src/app.js         ← route wiring
│   ├── src/config.js      ← all tunables (Talk Hours, limits)
│   ├── src/common/store.js
│   └── src/modules/talk-now/ + session/   ← built
│       + graph/ + brief/ + booking/        ← placeholders (TODO.md only)
├── frontend/
│   └── index.html         ← Phase 1 test UI, no build step
```

## Current state (honest)

- ✅ **Works:** anon join, 1-free/24h guard, queue + ETA, skippable triage + SOS path,
  listener accept, polling chat, 10-min wrap/close config, end + 👍/👎 vote,
  48h message burn, coordinator queue peek.
- ❌ **Not built:** login/OTP, Postgres/Redis (in-memory Maps instead),
  sockets/LiveKit audio, Circle/referral/brief/booking, payments, stealth app, coordinator dashboard.

See `docs/PHASES.md` for the full built-vs-placeholder table.

## Quickest demo (2 min)

```powershell
cd backend
npm install
npm run dev      # -> http://localhost:3001/api/v1/health
```

Then either open `frontend/index.html` in a browser,
or run the seed script:

```powershell
powershell -ExecutionPolicy Bypass -File docs/seed.demo.ps1
```

Details → `docs/HOW-TO-RUN.md`. Endpoints → `docs/API.md`.
