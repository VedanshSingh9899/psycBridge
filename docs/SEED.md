# SEED — demo data for Phase 1

> Phase 1 has no seed files to load and no DB — the store is in-memory Maps.
> "Seeding" = hitting the API to create a realistic demo state. Two ways below.

## Option A — one-click script (recommended)

```powershell
# terminal 1: backend running
cd backend
npm run dev

# terminal 2: seed a full seeker journey
powershell -ExecutionPolicy Bypass -File docs/seed.demo.ps1
```

What it does: join (fresh `device_uuid` each run, so no `429`) → status → triage `no` →
accept as `listener-1` → 2 chat messages → read-back → end with 👍 → prints `case_id` + `session_id`.

Optional args:

```powershell
powershell -ExecutionPolicy Bypass -File docs/seed.demo.ps1 -Lang hi -Nickname QuietFox12 -Vote true
powershell -ExecutionPolicy Bypass -File docs/seed.demo.ps1 -Base http://localhost:3001/api/v1 -Triage yes
```

- `-Triage yes` demos the SOS path (case leaves queue; accept will then `409` — that's the expected behavior, the script prints it and stops).
- All IDs printed at the end can be pasted into `frontend/index.html` flows or curl.

## Option B — manual curl (same steps, full control)

See `HOW-TO-RUN.md` §4 — copy-paste block. Change `device_uuid` per run.

## Demo personas

| Persona | How to play it | Values to use |
|---------|---------------|---------------|
| Quiet Seeker (P1) | join + chat as `seeker` | `lang: hi`, nickname auto, triage `skip` |
| Volunteer Listener (P4) | accept + reply as `listener` | `listener_id: listener-1` (any string works) |
| High-risk seeker | triage `yes` | expect `action: sos`, then `409` on accept — show SOS screen instead |
| Returning seeker (rate-limit) | join twice with same `device_uuid` | 2nd join → `429 FREE_LIMIT` + `retry_after_sec` |

Nicknames follow `Adjective+Animal+2digits` (`QuietFox12`) — see `randomNickname()` in `store.js`. Six adjectives × six animals, so collisions are fine; alias is display-only.

## SOS numbers

Placeholder: `1800-XXX-XXXX` ("Partner Helpline") hardcoded in `talk-now/service.js`.
Replace with the real partner helpline before any pilot with real users.

## Reset

Restart the backend — memory wipes. There is nothing else to clean.

## Coming in Phase 2 (not seedable yet)

6 test doctors with circles, 50 test devices, stuck-case fixtures.
Full fixture list is spec'd in `specs/DesignER.md` §11 step 11 — build the seed script for it when Postgres lands.
