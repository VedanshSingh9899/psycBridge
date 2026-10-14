# Frontend Design — hub

> Vibe docs only, no code. Future requirements for design.

## Decision (frozen)

3 links, 1 codebase, 1 backend. Looks like 3 sites to user, 1 repo to us.

| Link (prod) | Who | Vibe |
|---|---|---|
| `psycbridge.in` | seeker | calm, anonymous, 1-tap Talk Now, Hindi+English, 8th-grade reading |
| `pro.psycbridge.in` | listener / doctor | trusted desk, warm, professional, burnout-safe |
| `admin.psycbridge.in` | coordinator | hidden, no link from main site, `disallow all` |
| `api.psycbridge.in` | — | single backend for all three |

Don't buy 3 fully different domains. Subdomains only — trust + SEO + no phishing confusion.

## Demo mapping (localhost)

Same idea, local only:

- `localhost:5173` → seeker
- `pro.localhost:5173` → listener
- `admin.localhost:5173` → admin
- all talk to `localhost:3000/api/v1`

If `pro.localhost` doesn't open, add to hosts file. No code changes needed for design phase.

## Where to start (frozen)

Start with **listener** (`listener.md`), volunteer desk V1 for pilot.
Seeker already flows, admin comes last.

## Files

- `seeker.md` — Talk Now flow, queue, chat, post-help, stealth needs
- `listener.md` — volunteer desk V1 first, pro Circle/Brief/fees later
- `admin.md` — stuck cases, warm assign, no chat content view

Design principles for all: neutral name `PB Wellness`, neutral notifications (`Reminder 7pm`), alias always, no PII on screen, works on 2GB RAM Android + patchy net.
