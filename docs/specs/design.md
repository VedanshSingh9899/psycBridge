# psycBridge - System Design Document (SDD)
**Phase:** SDLC - 2. Design
**Version:** 1.0 | **Date:** 2026-10-10
**Input:** `requirements.md` v1.0 (FR-01 to FR-53, NFR-01 to NFR-11)
**Status:** Draft for build kickoff | **Pilot target:** 5-6 volunteers, 50 users, 7-11pm Talk Hours

---

## 1. Design Goals

1. Enforce single-owner invariant + max 3 hops at DB + API level (can't be broken by UI bug).
2. Zero-friction Talk Now <3 taps, <2s queue join, survive low-end Android + patchy net.
3. Privacy by architecture: PII minimization, masked previews, expiring data, no chat content in logs.
4. Modular monolith first (not microservices) so Phase-2 fee can be plugged in without rewrite.

## 2. Architecture Overview

### 2.1 Chosen Style: Modular Monolith + Realtime Gateway

```
[ Flutter/PWA App ] <-- HTTPS/WSS --> [ API Gateway (NestJS) ]
                                           |-- TalkNow Module (queue + session)
                                           |-- Graph Module (circle + referral + ownership)
                                           |-- Brief Module (consent + expiring links)
                                           |-- Booking Module (slots + follow-up)
                                           |-- Privacy Module (alias, wipe, export/delete)
                                           |-- Safety Module (triage + SOS + break-glass)
                                           |-- Coordinator Module (stuck cases view)
                                           |
                                      [ PostgreSQL (India region) ]
                                      [ Redis (queue, presence, rate-limit, pending-count) ]
                                      [ LiveKit / Socket.io (chat + audio, in-app only) ]
                                      [ Object Store (e-Rx PDFs, encrypted, auto-expire) ]
```

**Why not microservices V1:** team = 1 builder. Single deploy, module boundaries enforced by folders (`/modules/talk-now`, `/modules/graph`...), can split later.

### 2.2 Tech Stack (Recommendation - changeable)

| Layer | Pick | Why |
|-------|------|-----|
| App V1 Pilot | **Flutter** (or Expo RN if builder knows React) | Stealth icon, PIN+biometric, blur in recents need native. Fallback: PWA React+Vite if need ship in <2 weeks |
| Backend | **NestJS (Node) + TypeScript** | Fast, guards/pipes for ownership + consent checks, good Socket.io |
| DB | **PostgreSQL 16 (India - ap-south-1)** | Transactional handoff (A->B), DPDP residency |
| Cache/Queue | **Redis** | Presence (`listener:online`), FIFO queue (`queue:talk-now`), rate limit (`free:device:{uuid}`), pending brief count |
| Realtime | **Socket.io for chat + LiveKit for audio** | In-app only, no number exposed. LiveKit self-hostable in India |
| Auth | **Anonymous device UUID + optional Firebase OTP later** | FR-01: no OTP wall. `device_id` signed JWT (`role: seeker_anon`) |
| Storage | **S3-compatible (India) with SSE + lifecycle 7d expire** | Briefs, e-Rx PDFs auto-burn |
| Push | **FCM with neutral payloads** | `Reminder 7pm tomorrow` only, no PHI |
| Hosting | **Single VPS / Render / Railway India + managed Postgres** | Cheap for chanda Phase 1 |

> If builder only knows MERN: swap NestJS -> Express + same modules. No design change.

## 3. User Flows - Screen by Screen

### 3.1 Talk Now (Seeker) - Pending from BRAINSTORM Sec Next

```
S0 Splash (neutral name/icon, e.g. "PB Wellness")
  -> Big [ Talk Now ] + small [ I'm a Doctor ] + Talk Hours badge
  -> T&C + Privacy 1-liner + Emergency SOS link

S1 Tap Talk Now (FR-01/02)
  -> Auto nickname: QuietFox12 (regenerate btn) + language picker (Hi/En) + optional gender-pref
  -> [ Continue ] (NO phone/OTP field here)
  -> Creates anon session: POST /talk-now/join {device_uuid, nickname, lang}

S2 Triage (skippable, 10s, FR-47)
  -> 2 gentle chips: "Are you feeling unsafe with yourself right now? Yes / No / Skip"
  -> Yes -> SOS flow (Sec 7), No/Skip -> Queue

S3 Queue (FR-05/10/11)
  -> Shows: "2 listeners online, ~3 min wait, position #2" (poll every 5s / socket)
  -> Buttons: [ Wait ] [ Book for later ] [ SOS Resources ]
  -> Outside 19-23 IST: "Talk Hours 7-11pm, next slot 7pm today [Notify me]"

S4 Session 8-10 min (FR-03/04)
  -> Chat + [🎙️ Audio] toggle (no video button V1)
  -> Timer: "6 min left, wrap-up soon" at 8 min, auto-suggest close at 10 min
  -> [ End ] + [ Need more help? ] + [ Report / SOS ]

S5 Post-Help (FR-08)
  -> "Did this help? 👍/👎" (relief metric)
  -> Cards (optional, dismissable):
     1. "Get reminder? [phone input] (neutral SMS only)"
     2. "Save history? [Create account]"
     3. "Talk again? [Book 45-min with same person]"
  -> Never block with mandatory form.
```

### 3.2 Listener / Doctor - Talk Hours

```
D0 Doctor Login (OTP, once) -> Home: [Available toggle] [Full / Space for X] [Pending briefs n/3]
D1 Inbound TalkNow ping -> [Accept] / [Skip] (skip -> back to queue head)
D2 Session view: alias + lang + triage flag only (no PII) + timer + end-notes (private)
D3 After: [Offer follow-up] [Create Brief + Refer] [Close, no follow-up]
```

### 3.3 Referral - File Travels (FR-18/19)

```
A: Case view -> [Refer] -> pick 1-2 from My Circle -> Brief form (Sec 4.4) -> [Send]
B: Push (neutral) -> Inbound Briefs -> Masked preview card:
   Issue type | Age-band | Lang | Risk | Scores (NO name/photo)
   -> [Yes] / [No + reason] / [Suggest C + pick]
Patient: "Dr. B is good for you, share brief? [Yes, share] [No]"
  -> Yes: slot picker for B -> booking confirmed -> ownership A->B atomic
  -> Chain A->B->C logged, patient sees only final Dr. B
Fail: 3rd decline/timeout -> Coordinator card "Stuck - needs warm assign"
```

## 4. Data Model (PostgreSQL)

### 4.1 Core Tables

```sql
-- anon seeker, no PII V1
devices(device_uuid PK, nickname, lang, gender_pref, last_free_at, created_at)
users(id PK, role: seeker|listener|doctor|coordinator, phone NULLABLE, name NULLABLE,
      lang[], fee, slots_json, modality[], status: full|space, created_at)
  -- stepped ID: phone/name NULL till prescription/account step (FR-45)

circles(owner_id FK->users, peer_id FK->users, peer_contact_offapp TEXT NULL,
        strength INT DEFAULT 1, tags TEXT[], credit_due BOOLEAN, created_at,
        PRIMARY KEY(owner_id, peer_id))

cases(id PK, owner_id FK->users NULLABLE, anon_device_uuid FK->devices,
      status: queued|in_talk|post_help|owned|referring|transferred|stabilize|closed|stuck,
      lang, risk: low|med|high, current_hop INT DEFAULT 0, created_at, updated_at)
  -- INVARIANT: owner_id NOT NULL when status in (owned, referring, transferred)

briefs(id PK, case_id FK->cases, author_id FK->users, presenting_5lines TEXT,
       since_when TEXT, risk TEXT, phq9 INT NULL, gad7 INT NULL, meds_tried TEXT,
       helped TEXT, not_helped TEXT, lang_pref, gender_pref,
       expires_at (default +7d), read_count INT, max_reads INT DEFAULT 5,
       consent_id FK->consents, created_at)

referrals(id PK, brief_id FK->briefs, case_id FK->cases, from_doc FK->users,
          to_doc FK->users NULLABLE, to_offapp_link TEXT NULLABLE,
          state: created|sent|viewed|yes|no|suggest|consented|transferred|expired|timeout,
          reason TEXT NULLABLE, suggested_c FK->users NULLABLE,
          hop_no INT, chain JSONB DEFAULT '[]', -- e.g. ["A","B","C"]
          created_at, responded_at NULLABLE)

consents(id PK, case_id FK, brief_id FK NULLABLE, type: share_brief|break_glass|reminder_sms,
         granted BOOLEAN, granted_at, expires_at, audit_ip_hash TEXT)

bookings(id PK, case_id FK, doctor_id FK, slot_at TIMESTAMPTZ, modality, fee_snapshot INT,
         pay_mode: direct_upi (V1 only), status: pending|confirmed|done|no_show|cancelled)

sessions(id PK, case_id FK, listener_id FK, started_at, ended_at, duration_sec,
         channel: chat|audio, helped_vote BOOLEAN NULLABLE)

messages(id PK, session_id FK, sender: seeker|listener, body_encrypted TEXT,
         created_at, expires_at DEFAULT now()+48h)
  -- auto-expire via pg_cron + no content in app logs (NFR-09)

audit_log(id PK, actor_id, action: break_glass|owner_change|brief_view|export|wipe,
          case_id NULLABLE, meta JSONB, created_at)
```

### 4.2 Key Invariants (enforce in DB + service, not just UI)

1. `cases.owner_id` single-owner: CHECK + transactional handoff function `transfer_ownership(case, from, to, consent)` - fails if `from != current_owner` or consent missing.
2. `referrals.hop_no <= 3`: CHECK constraint. Insert hop 4 rejected -> trigger `mark_stuck(case)`.
3. `pending briefs <=3`: Redis counter `pending:{doctor}` + DB partial count check before `referrals INSERT`.
4. `briefs` read only with valid `consents.granted=true` + `expires_at > now()` + `read_count < max_reads`.
5. `messages.expires_at` auto-delete job daily. `audit_log` never stores message body.

### 4.3 Indexes
- `cases(status, updated_at)` for coordinator stuck scan
- `referrals(to_doc, state)` for inbound queue
- `referrals(case_id, hop_no)` for chain
- `bookings(doctor_id, slot_at)` for slot clash

## 5. API Contracts (REST + Socket)

Base: `/api/v1` | Auth: `Authorization: Bearer <anon_jwt|doctor_jwt>`

### 5.1 Talk Now
```
POST /talk-now/join {device_uuid, nickname, lang, gender_pref?}
  -> 200 {case_id, position, online_count, eta_min} | 429 {retry_after} (1/24h FR-07)
  -> Side: Redis LPUSH queue:talk-now, SET free:device:{uuid}=now EX 86400

GET  /talk-now/status?case_id=... -> {position, online_count, eta_min, hours_open}

POST /talk-now/triage {case_id, unsafe_self: yes|no|skip}
  -> high -> {action: sos, helpline:[...]}

Socket /ws/session: join {case_id} -> events: message.send, audio.offer/answer (via LiveKit token)
GET  /talk-now/livekit-token?case_id=... -> {token} (in-app audio only)

POST /sessions/:id/end {helped_vote?} -> triggers post-help offers
POST /followup/reminder {case_id, phone?} // neutral SMS only, consent logged
```

### 5.2 Graph + Brief + Ownership
```
GET  /circle -> [{peer_id, name_masked?, tags, strength, status}]
POST /circle {peer_id | offapp_phone, tags[]} // add trusted peer

POST /briefs {case_id, presenting_5lines, since_when, risk, phq9?, gad7?, meds_tried?, helped?, not_helped?, lang_pref?, gender_pref?}
  -> {brief_id, expires_at}

POST /referrals {brief_id, to_docs:[id1,id2] | offapp_link} // checks: owner==me, pending<3, hop<3
  -> {referral_ids[], hop_no}

GET  /referrals/inbound -> [{referral_id, masked_preview:{issue_type, age_band, lang, risk, scores}, hop_no, chain_len}]
POST /referrals/:id/respond {decision: yes|no|suggest, reason?, suggested_c?}
  // suggest -> auto-creates next-hop referral with chain+1

POST /referrals/:id/consent {granted: true|false} // PATIENT only, one-tap
  -> true + to_doc=yes -> atomic transfer_ownership + auto POST /bookings {slot}
GET  /cases/:id/chain -> {owner, hops:[A,B,C], status} // doctor/coordinator only, patient sees final only
```

### 5.3 Booking + Doctor
```
GET  /doctors/:id/availability -> {slots[], fee, modality[], status}
POST /bookings {case_id, doctor_id, slot_at, modality} // pay_mode=direct_upi V1
GET  /doctors/me/pending-count -> {count} // Redis + DB guard
PATCH /doctors/me/status {status: full|space, space_for: n}
```

### 5.4 Privacy + Safety
```
POST /privacy/wipe {case_id|all} -> deletes messages + brief reads, keeps audit stub
GET  /privacy/export -> {cases, briefs, bookings} JSON/PDF
POST /safety/sos {case_id} -> {helpline numbers, supervised listener connect}
POST /safety/break-glass {case_id, reason} // coordinator/doctor only, audit_log + consent check
```

All `brief_view`, `owner_change`, `break_glass` write to `audit_log`. No chat body in logs.

## 6. State Machines

### 6.1 Case
```
queued -> in_talk -> post_help -> owned(A) -> referring -> transferred(B) -> stabilize -> closed
   |          |          |             |            |
   +-> timeout+-> stuck (coordinator warm assign) <-+ (max 3 hops / 12h timeout)
```
- Only `transfer_ownership()` moves `owned->transferred`. No direct client write to `cases.owner_id`.

### 6.2 Referral
```
created -> sent -> viewed -> yes -> consent_pending -> transferred
                        \-> no (end) | suggest -> created (hop+1, chain append)
   timeout 12h -> timeout -> stuck
```

## 7. Safety + Privacy Design

- **Triage:** skippable chips, never block. `risk=high` bypasses queue -> SOS screen (partner helpline numbers hard-coded + supervised listener auto-page) + `cases.risk=high`.
- **Masked preview:** API serializer strips name/phone/photo. B gets `age_band` (e.g. 20-30) not DOB. Enforced at DTO, not frontend hide.
- **Expiring:** Brief link JWT `exp=7d`, `read_count` increment per view, pg_cron burns expired `briefs` + `messages`. S3 lifecycle 7d.
- **Neutral push:** FCM data `{title:"Reminder", body:"7pm tomorrow"}` - server template allowlist, no interpolation of doctor/speciality.
- **Stealth:** Flutter: `android:excludeFromRecents` blur via `FLAG_SECURE`, app icon `PB Wellness`, PIN+biometric via `local_auth`, chat screenshots blocked V1.
- **Break-glass:** needs `consents(type=break_glass)` pre-captured post-help (optional emergency contact) + live reason + writes `audit_log`. Without it, coordinator sees metadata only.

## 8. Queue + Abuse + Presence (Redis)

```
presence: SET listener:{id}:online EX 60 (heartbeat 30s) -> SCARD = online_count
queue: LIST queue:talk-now (RPUSH seeker, LPOP on accept) + ZSET queue:eta for wait calc
rate: SET free:device:{uuid} EX 86400 (1 free/24h) + invisible captcha score check on /join
cap: queue len >50 -> overflow mode: show book-later, no join
pending: INCR pending:{doc} on referral sent, DECR on respond/expire (guard max 3)
```

## 9. Coordinator Dashboard (Minimal V1 - Web)

- Table: `stuck cases` (hop==3 OR timeout 12h) + `high-risk` + `queue overload`
- Actions: [Warm assign -> pick doctor + slot] [Ping patient neutral] [Ping doctor]
- No message content view. All actions audit-logged.

## 10. Build Order (for builder)

1. **M1 Talk Now slice (week 1-2):** devices + cases + queue + chat + timer + post-help. Test with 2 volunteers.
2. **M2 Graph slice (week 3):** circles + briefs + referrals Yes/No/Suggest + ownership tx + 3-hop guard.
3. **M3 Booking + consent + expiry jobs (week 4):** slots, UPI-direct note, consent, pg_cron burn.
4. **M4 Privacy + safety + coordinator (week 5):** stealth, PIN, neutral push, SOS, stuck view.
5. Pilot 50 users -> measure Sec 11 -> then Phase-2 fee design.

Folder: `/app` (Flutter), `/server/src/modules/{talk-now,graph,brief,booking,privacy,safety,coordinator}`, `/server/prisma` or `migrations/`.

## 11. Design Traceability to Requirements

- FR-01..09 Talk Now -> Sec 3.1, 5.1, 8
- FR-10..12 Queue -> Sec 8
- FR-13..16 Follow-up -> Sec 3.1 S5, 5.3
- FR-17..21 Graph -> Sec 3.3, 5.2, 6.2
- FR-22..27 Ownership -> Sec 4.2, 6.1
- FR-28..30 Brief -> Sec 4.1 briefs, 5.2
- FR-31..35 Freedom -> Sec 5.3
- FR-36..39 Payments -> Sec 5.3 pay_mode=direct_upi
- FR-40..46 Privacy -> Sec 7
- FR-47..50 Safety/legal -> Sec 7
- NFR-01..11 -> Sec 2,7,8

*Next SDLC: Implementation per Sec 10 order. Open Questions from requirements Sec 10 still block Beta (esp. e-Rx ID rules, volunteer vs paid, native vs PWA final call).*
