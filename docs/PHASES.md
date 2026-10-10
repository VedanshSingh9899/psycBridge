# PHASES — what exists vs what's next

## Phase 1 — Talk Now slice (BUILT, in this repo)

Anon 8–10 min chat, queue, triage, post-help vote. No login, no payments, no video.

| Area | Files | Status |
|------|-------|--------|
| Boot / wiring / config | `backend/src/index.js`, `app.js`, `config.js` | ✅ |
| Store (in-memory, PG-shaped) | `backend/src/common/store.js` | ✅ |
| Talk Now: join / status / triage | `backend/src/modules/talk-now/` | ✅ FR-01…09, FR-47 |
| Session: accept / messages / end | `backend/src/modules/session/` | ✅ FR-03/04, FR-10…12 (polling; no sockets) |
| Test UI | `frontend/index.html` | ✅ |
| Docs | `docs/` | ✅ (this folder) |

Rules enforced: 1 free / device / 24 h · Talk-Hours soft window · high-risk bypasses queue ·
48 h message burn · no PII collected · no payments code at all.

## Phase 2 — placeholders (spec'd, NOT built)

Folders exist with `TODO.md` only. Specs in `specs/DesignER.md` §7.

| Area | Folder | Spec |
|------|--------|------|
| Circle + referral Yes/No/Suggest, ownership TX, 3-hop guard | `backend/src/modules/graph/` | FR-17…27 |
| Brief packet CRUD + consent gate + expiry | `backend/src/modules/brief/` | FR-28…30 |
| Follow-up booking + direct-UPI note | `backend/src/modules/booking/` | FR-13…16, FR-36…39 |

## Phase 3+ — not started

Platform fee, LiveKit audio/video, stealth app (PIN/biometric/blur), coordinator dashboard, e-Rx, Postgres + Redis swap.

Build order and exit criteria: `specs/design.md` §10, `specs/DesignER.md` §11.
Open blockers before Beta: volunteer-vs-paid listeners, 2-vs-3 hops, contribution split,
e-Rx ID rules (needs psych friend), Flutter-vs-PWA final call (`specs/requirements.md` §10).
