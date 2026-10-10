# Testing — backend (Phase 1 API)

> Server must be running: `cd backend; npm run dev`.
> Full setup → [HOW-TO-RUN.md](../HOW-TO-RUN.md). Endpoint reference → [API.md](../API.md).
> Lazy option: `powershell -ExecutionPolicy Bypass -File ../seed.demo.ps1` runs Test 1–6 for you.

## Test 1 — health

```powershell
Invoke-RestMethod http://localhost:3001/api/v1/health
```

Expect `{ok: True, phase: 1, scope: talk-now}`. If `ECONNREFUSED`, backend isn't running.

## Test 2 — seeker join

```powershell
$j = Invoke-RestMethod -Method Post http://localhost:3001/api/v1/talk-now/join `
  -ContentType "application/json" `
  -Body '{"device_uuid":"test-dev-1","nickname":"QuietFox12","lang":"hi"}'
$caseId = $j.case_id
```

Expect `position: 1`, `eta_min`, `hours_open` (false outside 19–23 IST — fine, join still works).

## Test 3 — queue status

```powershell
Invoke-RestMethod "http://localhost:3001/api/v1/talk-now/status?case_id=$caseId"
```

Expect `status: queued`, `position: 1`.

## Test 4 — triage (normal path)

```powershell
Invoke-RestMethod -Method Post http://localhost:3001/api/v1/talk-now/triage `
  -ContentType "application/json" -Body (@{case_id=$caseId; unsafe_self="no"} | ConvertTo-Json)
```

Expect `{action: queue}`.

## Test 5 — listener accept + chat + end

```powershell
$a = Invoke-RestMethod -Method Post http://localhost:3001/api/v1/talk-now/accept `
  -ContentType "application/json" -Body (@{case_id=$caseId; listener_id="listener-1"} | ConvertTo-Json)
$ses = $a.session_id

Invoke-RestMethod -Method Post http://localhost:3001/api/v1/session/$ses/messages `
  -ContentType "application/json" -Body '{"sender":"seeker","body":"hello, need help"}'
Invoke-RestMethod http://localhost:3001/api/v1/session/$ses/messages
Invoke-RestMethod -Method Post http://localhost:3001/api/v1/sessions/$ses/end `
  -ContentType "application/json" -Body '{"helped_vote":true}'
```

Expect: accept → `{session_id, alias, wrap_at_min: 8, close_at_min: 10}`;
messages → your message back with `expires_at` ~+48 h; end → case moves to `post_help`.

## Test 6 — coordinator peek

```powershell
Invoke-RestMethod http://localhost:3001/api/v1/coordinator/queue
```

Expect `{queue_len, online_listeners, cases}`.

## Edge cases (must all behave, not crash)

| # | Do this | Expect |
|---|---------|--------|
| E1 | Join twice with same `device_uuid` | 2nd → `429 FREE_LIMIT` + `retry_after_sec` |
| E2 | Join with `"lang":"fr"` | `400 lang must be hi\|en` |
| E3 | Triage `yes` on a fresh case, then accept it | triage → `action: sos`; accept → `409 high-risk` (by design) |
| E4 | Accept with bad `case_id` | `404 case not found` |
| E5 | POST message with `sender: doctor` or empty body | `400` |
| E6 | Restart server, reuse old `case_id` | `404` (memory wiped — expected Phase 1) |

## Notes

- Every test run needs a **fresh `device_uuid`** (E1 guard). The seed script auto-generates one.
- Wrong pluralization fails silently into 404: messages = `/session/:id/...` (singular), end = `/sessions/:id/end` (plural).

## Code tour (read in this order)

1. `backend/src/index.js` — boot
2. `backend/src/app.js` — route wiring
3. `backend/src/config.js` — all tunables (Talk Hours, limits)
4. `backend/src/common/store.js` — data shapes (devices, cases, sessions, messages)
5. `backend/src/modules/talk-now/service.js` — join/status/triage rules
6. `backend/src/modules/session/service.js` — accept/messages/end + 10-min close
