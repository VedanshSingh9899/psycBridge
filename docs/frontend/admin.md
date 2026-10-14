# Admin / Coordinator — `admin.localhost:5173` demo, `admin.psycbridge.in` prod (last)

Who: internal human fallback. No public link, no SEO, login + audit log always.

## Screens (minimal V1)

1. Login — strict, separate from pro login.
2. Stuck table — max-hops / 12h timeout, high-risk flags, queue overload, offline doctors. Columns: case age, hop count, risk, owner, wait. No chat body column ever.
3. Actions — Warm assign (pick doctor + slot), Ping patient (neutral template only), Ping doctor. Every action audit-logged.
4. Health — online listeners, queue len, Talk Hours state.

## Design musts

- Hidden URL, dull utilitarian UI is fine, speed over beauty.
- Break-glass view of chat content only with reason + log, else metadata only.
- All pushes/SMS from here use neutral templates (`Reminder 7pm tomorrow`).

Out of scope V1: analytics graphs, payment views, content moderation queue.
