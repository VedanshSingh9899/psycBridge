# API — Phase 1 (verified against code)

> Base: `http://localhost:3001/api/v1`. No auth headers in Phase 1.
> Sources: `backend/src/app.js`, `modules/talk-now/routes.js` + `service.js`,
> `modules/session/routes.js` + `service.js`, `common/store.js`.
> If this file and the code disagree, the code wins — then fix this file.

## Endpoints

### `GET /health`

```powershell
Invoke-RestMethod http://localhost:3001/api/v1/health
```

→ `{ok, phase: 1, scope: "talk-now", time}`

### `POST /talk-now/join`

Body: `{device_uuid*, nickname?, lang?=hi (hi|en), gender_pref?}`

```powershell
Invoke-RestMethod -Method Post http://localhost:3001/api/v1/talk-now/join `
  -ContentType "application/json" `
  -Body '{"device_uuid":"demo-dev-1","nickname":"QuietFox12","lang":"hi"}'
```

- 200 → `{case_id, nickname, position, online_count, eta_min, hours_open, next_slot}`
- 400 → `{code: ERR}` — missing `device_uuid` or bad `lang`
- 429 `FREE_LIMIT` → same device <24 h: `{code, message, retry_after_sec}`
- 429 `QUEUE_FULL` → queue ≥ 50
- Side effects: upserts device, sets `last_free_at`, pushes `case_id` to FIFO queue.
- `online_count` is `max(1, listeners)` so local dev shows 1 even with nobody online.

### `GET /talk-now/status?case_id=`

→ `{case_id, status, position, online_count, eta_min, hours_open, next_slot, risk, session_id, sos:[{name, phone}]}`

- `status`: `queued` → `in_talk` → `post_help` (only three states exist in Phase 1)
- `position 0` = no longer in queue (accepted or SOS-routed)
- 404 if `case_id` unknown (e.g. server restarted)

### `POST /talk-now/triage`

Body: `{case_id*, unsafe_self?: yes|no|skip}`

- `yes` → `{action: sos, helplines, auto_page: true}`, `risk=high`, **removed from queue**
- `no` → `{action: queue}`, `risk=low`
- `skip`/omitted → `{action: queue}`, risk unchanged
- Never blocks. Never asks for anything else. (FR-47)

### `POST /talk-now/accept` ⚠️ path quirk

Mounted via the session router but keeps the `/talk-now/…` path for spec compat.

Body: `{case_id*, listener_id?=listener-1, channel?=chat}`

→ `{session_id, alias, lang, risk, wrap_at_min: 8, close_at_min: 10}`

- 409 if `risk=high` (must use SOS flow, not queue accept)
- Side effects: removes case from queue, `status=in_talk`, creates session, heartbeat-marks listener online

### `POST /availability` (listener heartbeat)

Body: `{listener_id?}` → `{online_count, queue_len}`. Entries older than 90 s are pruned.

### `GET /session/:id/messages` · `POST /session/:id/messages`

POST body: `{sender*: seeker|listener, body* (≤2000 chars, non-empty)}`

→ GET returns `{session_id, messages: [{id, sender, body, created_at, expires_at}]}`

- Phase 1 = polling (frontend polls every 2 s). No sockets yet.
- `expires_at` = +48 h; hourly sweeper deletes expired. Message bodies are never logged.

### `POST /sessions/:id/end` ⚠️ note plural `sessions`

Body: `{helped_vote?: bool}`

→ `{session_id, duration_sec, helped_vote, next: [reminder_optional, create_account_optional, book_again_optional]}`

- Sets `ended_at`, computes `duration_sec`, moves case → `post_help`.
- The three `next` cards are UI hints — all optional, never forced (FR-08).

### `GET /coordinator/queue` (debug peek)

→ `{queue_len, online_listeners, cases}`. No auth in Phase 1. Will become a real JWT-guarded dashboard in Phase 2.

## In-memory ↔ Postgres/Redis mapping

| Phase 1 (store.js) | Real thing (specs/DesignER.md §§4, 8) |
|--------------------|-------------------------------|
| `devices.last_free_at` | Redis `free:device:{uuid}` EX 86400 |
| `queue[]` | Redis LIST `queue:talk-now` |
| `listenersOnline` | Redis `listener:{id}:online` EX 60 |
| `cases / sessions / messages` Maps | PG tables `devices, cases, sessions, messages` |

Swap path: create `schema.sql` from `specs/DesignER.md` §4 DDL, add `pg` dep, replace `store.js` functions 1:1. API contracts stay identical.

## Deliberately absent (Phase 2+)

`/circle`, `/briefs`, `/referrals/*`, `/bookings`, `/doctors/*`, `/privacy/*`, `/safety/*`, `/coordinator/stuck` — spec'd in `specs/DesignER.md` §7, not implemented. Their folders hold `TODO.md` placeholders only.
