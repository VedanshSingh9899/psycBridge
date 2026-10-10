# HOW-TO-RUN — psycBridge Phase 1

> Goal: backend + test UI running locally in ~5 min. No DB, no env keys needed.

## 1. Prerequisites

- **Node.js 18+** — check with `node -v`
- **PowerShell 5.1+** (preinstalled on Windows) — check with `$PSVersionTable.PSVersion`
- A browser (Chrome/Edge) for `frontend/index.html`
- Port **3001** free

## 2. Run the backend

```powershell
cd backend
npm install
npm run dev
```

You should see:

```
psycBridge backend Phase 1 on http://localhost:3001
health: http://localhost:3001/api/v1/health
```

Verify:

```powershell
Invoke-RestMethod http://localhost:3001/api/v1/health
# @{ok=True; phase=1; scope=talk-now; time=...}
```

Leave this terminal running. All data is **in-memory** — restarting the server wipes it (by design for Phase 1).

## 3. Run the frontend (no build step)

No `npm`, no bundler. Just open the file:

```
frontend/index.html
```

- Double-click it, or in PowerShell: `Start-Process frontend/index.html`
- It calls `http://localhost:3001` by default. If your backend is on another host/port, edit the `const API = ...` line at the top of the `<script>` block in `index.html`.

### Click-path in the UI

1. **Talk Now** → shows `case <id> pos #1 …` (join)
2. **Triage** → `No` or `Skip` stays in queue; `Yes` goes SOS (leaves queue)
3. **Accept as listener-1** → simulates the volunteer picking up
4. **Chat** → type + Send as seeker/listener (auto-refreshes every 2 s)
5. **End + vote** → 👍/👎, session → `post_help`

## 4. Full API flow (copy-paste PowerShell)

```powershell
# 1. join (nickname auto-made if omitted, lang hi|en)
$j = Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/v1/talk-now/join `
  -ContentType "application/json" `
  -Body '{"device_uuid":"demo-dev-1","nickname":"QuietFox12","lang":"hi"}'
$j | ConvertTo-Json -Depth 5
$caseId = $j.case_id

# 2. queue status
Invoke-RestMethod "http://localhost:3001/api/v1/talk-now/status?case_id=$caseId"

# 3. triage (yes|no|skip — yes routes to SOS, removes from queue)
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/v1/talk-now/triage `
  -ContentType "application/json" `
  -Body (@{case_id=$caseId; unsafe_self="no"} | ConvertTo-Json)

# 4. listener accepts (any id works in Phase 1, no auth yet)
$a = Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/v1/talk-now/accept `
  -ContentType "application/json" `
  -Body (@{case_id=$caseId; listener_id="listener-1"} | ConvertTo-Json)
$ses = $a.session_id

# 5. chat (polling)
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/v1/session/$ses/messages `
  -ContentType "application/json" -Body '{"sender":"seeker","body":"hello, need help"}'
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/v1/session/$ses/messages `
  -ContentType "application/json" -Body '{"sender":"listener","body":"I am here, take your time"}'
Invoke-RestMethod http://localhost:3001/api/v1/session/$ses/messages

# 6. end + vote
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/v1/sessions/$ses/end `
  -ContentType "application/json" -Body '{"helped_vote":true}'

# 7. coordinator peek (queue debug, no auth in Phase 1)
Invoke-RestMethod http://localhost:3001/api/v1/coordinator/queue
```

Or run all of the above at once: `powershell -ExecutionPolicy Bypass -File docs/seed.demo.ps1`

## 5. Config you may want to change

All in `backend/src/config.js` (restart server after edit):

| Key | Default | Meaning |
|-----|---------|---------|
| `talkHours` | 19–23 IST | soft window; outside it `hours_open=false` + `next_slot` is returned (join still allowed) |
| `freeWindowSec` | 86400 | 1 free session per `device_uuid` per 24 h → `429 FREE_LIMIT` + `retry_after_sec` |
| `sessionWrapMin` / `sessionMaxMin` | 8 / 10 | wrap prompt / hard close (returned as `wrap_at_min`, `close_at_min` on accept) |
| `queueCap` | 50 | join over cap → `429 QUEUE_FULL` |
| `messageExpiryH` | 48 | chats auto-burned (hourly sweeper) |

## 6. Troubleshooting

| Symptom | Cause → fix |
|---------|-------------|
| `ECONNREFUSED localhost:3001` | backend not running → `cd backend; npm run dev` |
| `429 FREE_LIMIT` on join | same `device_uuid` joined <24 h ago → use a new `device_uuid` (each test run needs a fresh one) |
| `429 QUEUE_FULL` | 50 people in queue (unlikely local) → restart server to clear memory |
| `409 high-risk: use SOS flow` on accept | triage was `yes` → that case left the queue on purpose; join a new one |
| `404 case/session not found` | server restarted (memory wiped) → join again |
| Frontend shows nothing / CORS | backend must be on `:3001`; check `const API` in `index.html` matches it |
| `hours_open=false` | you're outside 19–23 IST — expected, join still works, ETA points at next slot |

## 7. What's NOT running here

Postgres, Redis, sockets, LiveKit, OTP, payments — none of that exists in Phase 1.
`src/common/store.js` Maps stand in for them 1:1 (see `API.md` § mapping).
When ready for Postgres, the runnable DDL is `specs/DesignER.md` §4.
