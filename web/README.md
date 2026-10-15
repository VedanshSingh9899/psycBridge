# web — Next.js UI (ported from `psychbridge_frontend`, Vercel removed)

> Routes: `/` listener desk · `/seeker` seeker Talk Now · `/login` sign-in ·
> `/admin` coordinator. All wired to the Phase 1 backend API (`web/lib/api.ts`).

## Run (local, no Vercel)

```powershell
cd web
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
npx -y pnpm@12.3.4 install
npx -y pnpm@12.3.4 dev       # → http://localhost:3000
```

Backend must be up (`http://localhost:3000/api/v1` — see `docs/HOW-TO-RUN.md`).
`NEXT_PUBLIC_*` is baked at **build** time, so set it before `build`/docker.

Or everything at once: `docker compose up -d --build` at repo root
(web → `http://localhost:3001/`, Vite frontend stays on `:5173`).

## What is live vs mock

- Live: seeker join → triage → queue poll → chat poll → end + vote;
  listener heartbeat → queue → accept → chat → end; admin queue/coverage.
- Still local/mock (Phase 1 has no backend for these): listener login page,
  owned-clients list, follow-ups, private notes (all `localStorage`).
