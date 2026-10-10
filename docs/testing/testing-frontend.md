# Testing — frontend (Phase 1 test UI)

> No build step. Backend must be running (`cd backend; npm run dev`).
> Setup → [HOW-TO-RUN.md](../HOW-TO-RUN.md). API equivalent of each click → [testing-backend.md](testing-backend.md).

## Open it

Double-click `frontend/index.html`, or:

```powershell
Start-Process frontend/index.html
```

The page talks to `http://localhost:3001` (see `const API = ...` at the top of its `<script>` block if you need another host).

## Click-path

| # | Click | Expect to see |
|---|-------|---------------|
| 1 | **Talk Now** | `case <id> pos #1 eta … hours_open=…` under the button; Log shows the join JSON |
| 2 | Triage **No** / **Skip** | `action=queue`; status line stays `status=queued` |
| 3 | Triage **Yes** | `action=sos` — case leaves queue (accept will fail after this, by design) |
| 4 | **Accept as listener-1** | `session <id>`; chat box starts auto-refreshing (every 2 s) |
| 5 | Type + **Send seeker** / **Send listener** | Message appears in chat as `seeker:` / `listener:` |
| 6 | **👍 helped** / **👎 not** | Result JSON in the box; session is over (`post_help`) |

## Two-tab test (queue + live chat feel)

1. Open `index.html` in **two tabs** (each generates its own `device_uuid`, so no rate-limit clash).
2. Tab A: Talk Now → stays `pos #1`. Tab B: Talk Now → `pos #2`.
3. Press **Accept** in either tab → that case leaves the queue; the other tab's position drops on next poll (~3 s).
4. Chat from both sides: type as `seeker` in one, `listener` in the other — both poll the same session, so each tab shows the full thread after refresh.

## What this UI does NOT do (Phase 2+)

Login, real doctor accounts, audio/video, referral/brief screens, coordinator dashboard.
The **Accept** button just simulates a volunteer — real presence + push comes later
([PHASES.md](../PHASES.md)).
