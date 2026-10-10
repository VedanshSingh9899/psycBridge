# psycBridge — Index (click around)

> One hub for every doc. Links are relative — they work on GitHub, VS Code preview (`Ctrl+Shift+V`), and any markdown reader.

## 🗺️ I want to…

| I want to… | Open |
|------------|------|
| Understand the project in 2 min | [README.md](README.md) |
| Run it locally | [docs/HOW-TO-RUN.md](docs/HOW-TO-RUN.md) |
| Test the backend API | [docs/testing/testing-backend.md](docs/testing/testing-backend.md) |
| Test the browser UI | [docs/testing/testing-frontend.md](docs/testing/testing-frontend.md) |
| Check Phase 1 exit criteria | [docs/testing/testing-checklist.md](docs/testing/testing-checklist.md) |
| Look up an endpoint | [docs/API.md](docs/API.md) |
| Seed a demo session | [docs/SEED.md](docs/SEED.md) · script: [docs/seed.demo.ps1](docs/seed.demo.ps1) |
| Know what's built vs what's next | [docs/PHASES.md](docs/PHASES.md) |

## 📜 Specs (frozen source of truth)

| Doc | Covers |
|-----|--------|
| [docs/specs/requirements.md](docs/specs/requirements.md) | SRS — FR-01…FR-53, NFR-01…NFR-11, pilot metrics, open questions |
| [docs/specs/design.md](docs/specs/design.md) | System design — modules, flows, queue/Redis, build order |
| [docs/specs/DesignER.md](docs/specs/DesignER.md) | Detailed design + ER — **wins on conflict**; full DDL, sequences, masking matrix |

## 💡 Ideas (where it came from)

| Doc | Covers |
|-----|--------|
| [docs/ideas/BRAINSTORM.md](docs/ideas/BRAINSTORM.md) | Original thesis — zero-friction entry, care graph, chanda model |
| [docs/ideas/notes2.md](docs/ideas/notes2.md) | Founder notes — short version of the same |

## 🎤 Pitch (for outsiders)

| Doc | Covers |
|-----|--------|
| [docs/pitch/pitch.md](docs/pitch/pitch.md) | Problem → promise → how it works → ask |
| [docs/pitch/pitch.html](docs/pitch/pitch.html) | Slide deck (open in browser) |
| [docs/pitch/deck.html](docs/pitch/deck.html) | Slide deck variant (open in browser) |
| [docs/pitch/business-deck.html](docs/pitch/business-deck.html) | Business deck (open in browser) |

## 🧪 Testing

| Doc | Covers |
|-----|--------|
| [docs/testing/testing-backend.md](docs/testing/testing-backend.md) | API tests 1–6 + edge cases E1–E6 (copy-paste PowerShell) |
| [docs/testing/testing-frontend.md](docs/testing/testing-frontend.md) | Browser click-path + two-tab queue test |
| [docs/testing/testing-checklist.md](docs/testing/testing-checklist.md) | Pilot exit criteria mapped to FR/NFR |

## 🛠️ Guides (docs/ folder)

| Doc | Covers |
|-----|--------|
| [README.md](README.md) | Overview, repo map, honest built-vs-missing state |
| [docs/HOW-TO-RUN.md](docs/HOW-TO-RUN.md) | Local setup, full API flow, config tunables, troubleshooting |
| [docs/API.md](docs/API.md) | Endpoint reference verified against code + in-memory↔PG mapping |
| [docs/SEED.md](docs/SEED.md) | Demo personas, seed script usage, reset |
| [docs/PHASES.md](docs/PHASES.md) | P1 built vs P2 placeholders vs P3+ roadmap |

## 📁 Code readmes (tiny pointers, full docs live here)

| Doc | Covers |
|-----|--------|
| [backend/README.md](backend/README.md) | Pointer → start at HOW-TO-RUN |
| [frontend/README.md](frontend/README.md) | Pointer → start at testing-frontend |
