# psycBridge - Software Requirements Specification (SRS)
**Phase:** SDLC - 1. Requirements
**Version:** 1.0 | **Date:** 2026-10-10
**Status:** Draft for validation with domain (psych friend) + tech
**Source of truth:** `../ideas/BRAINSTORM.md`, `../ideas/notes2.md`, `../pitch/pitch.md`

---

## 1. Project Overview

**psycBridge** is an Uber / Urban Company-style network for psychiatrists + psychologists in India, with privacy so deep even family doesn't know if the user wants that.

**Core thesis:**
- Emotion-first, not extractive marketplace. Don't monetize despair / first cry for help.
- Network-first care graph: file travels, user doesn't.
- Built for moderate-severe users who come late (Indian reality), not wellness journaling.

**SDLC scope of this doc:** Freeze WHAT the system must do (requirements). HOW (architecture, DB, API design) comes in Design phase.

---

## 2. Goals & Non-Goals

### 2.1 Goals (V1 must achieve)
1. Zero-friction first help: open app -> Talk Now -> human in ~3 min, no login.
2. Warm handoff: patient never repeats trauma story, never cold-referred.
3. Load balancing: overbooked seniors can pass to juniors with space via trusted Circle.
4. Doctor freedom: no lock-in, own fees/slots/clients.
5. Privacy by design + India legal compliance.

### 2.2 Non-Goals (explicitly OUT of V1)
- No 24x7 crisis helpline (partner redirect only).
- No AI diagnosis / AI therapy bot.
- No video-mandatory consults.
- No advance wallet / paywall / commission engine in V1.
- No EMR-hospital integration.
- No medicine e-commerce (only discreet e-prescription + plain delivery partner later).

---

## 3. Stakeholders & Personas

| ID | Stakeholder | Role |
|----|-------------|------|
| ST-1 | Seeker (patient/user) | Anonymous, moderate-severe distress, stigma fear, low digital patience |
| ST-2 | Listener (V1 Talk Now) | Trained peer / junior psych under supervision, handles 8-10 min free vent |
| ST-3 | Psychologist / Psychiatrist | Owns cases, refers via Circle, sets fees/slots |
| ST-4 | Coordinator (human, internal) | Fallback when referral hits max hops / timeout, pings patient |
| ST-5 | Founder team | Tech builder + psych domain student + business (to join) |
| ST-6 | Regulator | Mental Healthcare Act 2017, Telemedicine/Telepsychiatry Guidelines 2020, DPDP Act 2023 |

### Personas
- **P1 - Quiet Seeker:** 19-35, no private room at home, fear of family/call-log trace. Wants alias + audio-only + neutral notifications.
- **P2 - Drowning Senior:** 10+ yrs exp, booked for months, wants to pass mild/vibe-mismatch quickly to trusted junior.
- **P3 - Hungry Junior:** Good skill, empty slots, wants warm trusted cases with brief + "Dr. A sent you" trust.
- **P4 - Volunteer Listener:** College psych student, available 7-11pm only, needs supervision + burnout guardrails.

---

## 4. Scope - V1 MVP (Must-Have for Pilot)

**Pilot target:** 5-6 volunteers, Talk Hours 7-11pm, 50 test users.

IN for V1:
- Anonymous Talk Now (chat + audio, no video pressure)
- Queue with wait-time transparency + Talk Hours guard
- Post-help optional account creation + follow-up booking
- Doctor Circle (5-10 trusted peers) + Refer (Yes/No/Suggest C) + max 3 hops
- Doctor Brief Packet + masked preview + one-tap patient consent + expiring link
- Ownership rule enforcement (single owner always)
- Doctor profile: fee/slot/modality/language/status (Full / Space for X)
- Direct UPI (off-system, zero commission) + transparent cost contribution note
- Privacy: alias, in-app call/chat, stealth + PIN, neutral notifications, expiring chats, one-tap wipe, export/delete
- Safety: triage + red-flag + SOS redirect + break-glass consent
- Coordinator fallback dashboard (minimal)

OUT / Phase 2:
- Phase-2 disclosed platform fee (both sides)
- Video consult, group therapy, homework/maintain loop automation, refill reminders, private cabin partners, home visits, plain-packaging delivery integration

---

## 5. Functional Requirements

### 5.1 Zero-Friction Entry - Talk Now [P0 - Core Moat]

- **FR-01:** User shall start help in 1 tap: Open app -> Big `Talk Now` button, no login/signup/OTP/phone/photo-ID upfront.
- **FR-02:** System shall auto-assign random alias nickname (e.g. QuietFox12) on Talk Now tap.
- **FR-03:** System shall support chat + audio-only for first contact. Video shall NOT be required or default.
- **FR-04:** First session shall be free, time-boxed 8-10 min, with gentle wrap-up prompt at 8 min.
- **FR-05:** System shall show live humanity cue: `X listeners online, ~Y min wait` before/during queue.
- **FR-06:** System shall enforce Talk Hours (configurable, default 19:00-23:00 IST). Outside hours: show next slot + SOS option, no dead-end.
- **FR-07:** Abuse control without login:
  - 1 free session per device per 24h (device UUID + invisible captcha + queue cap).
  - Accept some spam as cost; never block genuine seeker with login wall.
- **FR-08:** AFTER help ends, system shall offer (optional, never forced):
  1. Optional mobile number for neutral reminder,
  2. Create account to see history/prescription,
  3. Book follow-up with same listener/doctor.
- **FR-09:** Doctors/listeners shall control intake: system shall NOT force 10-question form. Only what doc needs, when user is comfortable.

**Acceptance:** 3-year-old test - new user reaches human in <=3 taps, <=3 min median wait during Talk Hours, zero mandatory fields.

### 5.2 Queue & Matching (V1 Simple)

- **FR-10:** FIFO queue with language + gender-preference soft match if provided (optional, not blocking).
- **FR-11:** If no listener online / queue >15 min: offer (a) wait with position, (b) book next Talk Hour slot, (c) SOS redirect.
- **FR-12:** Listener shall have Accept / Skip + `Full / Available` toggle. Skip returns user to queue head, no drop.

### 5.3 Follow-up Loop (Relief -> Stabilize -> Maintain)

- **FR-13:** Same-person continuity: after Talk Now, user can book 45-min session with same person (if qualified) or referred doctor.
- **FR-14:** System shall support therapy session booking + psychiatrist eval flag (if meds needed).
- **FR-15:** One gentle neutral nudge if user doesn't return (no guilt-trip, max 1-2, neutral wording).
- **FR-16:** 48-hr chat check-in + homework notes (minimal V1: chat thread stays open 48h, then auto-expires unless follow-up booked).

### 5.4 Care Graph - Circle & Referral [P0 - Differentiator]

- **FR-17:** Every doctor shall maintain `My Circle`: 5-10 trusted contacts (on-app or off-app). Support cross-field adds (clinical psych, neuro, psychiatrist, de-addiction, GP).
- **FR-18:** Referral handshake:
  1. Owner A creates Brief -> taps Refer -> picks 1-2 from Circle (on-app push or off-app expiring link/SMS).
  2. B sees **masked preview only**: issue type, age-band, language, risk-level. NO name/photo/contact.
  3. B actions: `Yes / No / Suggest C` (+ optional reason: expertise / full / won't-click).
  4. On Yes: patient gets one-tap consent `Share my brief with Dr. B?` -> on accept, warm transfer + slot booked.
  5. On Suggest C: brief slides to C with chain history (A->B->C). Patient sees only final doctor, not chain.
- **FR-19:** Max 3 hops. On 3rd decline/timeout: STOP sliding, auto-assign best-fit + notify human coordinator to ping patient with warm slot. Never cold `go find this guy`.
- **FR-20:** Off-app referral: expiring link (default 7 days). If B joins later via link, A gets credit (attribution log).
- **FR-21:** Click-fit is valid: language, gender preference, age vibe, issue expertise are first-class match fields. `Won't click` is valid decline reason.

### 5.5 Ownership + Load Balancing

- **FR-22:** Single-owner invariant: case ALWAYS has exactly one owner. A owns till B says Yes + patient consents, then B owns. Never ownerless, never dual-owner.
- **FR-23:** Until Yeah-Sure: user stays anchored with A. Only brief file moves behind scenes. No user here-there.
- **FR-24:** Doctor status: `Full / Space for X` + pausable. Referral routing shall prefer `Space + fit`.
- **FR-25:** Cap max 3 pending inbound briefs per doctor (configurable). Overflow auto-suggests next in Circle.
- **FR-26:** Timeout: if owner/B inactive for X hrs (default 12h, configurable), ping owner + notify coordinator. Ownership stays with A till handoff.
- **FR-27:** Silent routing log: every slide creates/strengthens edge (A->B count, Yes-rate, issue tags) for future best-fit ranking. V1: log only, no ML.

### 5.6 Doctor Brief Packet (Kill Repeat Trauma)

- **FR-28:** Brief shall be SBAR-like, completable in ~2 min, readable in ~60-90 sec. Fields:
  - Presenting issue (5 lines max), Since when, Risk flag (Low/Med/High + free text), PHQ-9/GAD-7 scores if done (optional), Meds tried, What helped / didn't, Language + gender preference, Consent ref.
- **FR-29:** Brief sharing requires explicit one-tap patient consent per share, expiring link (default 7 days), auto-burn after expiry/read-limit, no WhatsApp PDF download by default.
- **FR-30:** Next doctor shall NOT need to re-ask briefed items; intake pre-fills from brief.

### 5.7 Doctor Freedom & Profile

- **FR-31:** Doctor sets: fees, slots, modality (audio/chat/video), cancellation policy, languages, issue tags.
- **FR-32:** Doctor owns relationship + notes, can export (PDF/JSON) anytime.
- **FR-33:** Doctor can bring own existing clients to use video/notes/prescription tools (invite link).
- **FR-34:** No penalty for off-platform consults. Leaving platform shall not delete their exportable data, no algorithmic punishment.
- **FR-35:** Community (V1 minimal): anonymized peer supervision thread + case discussion (no patient identifiers).

### 5.8 Payments - Chanda First (V1)

- **FR-36:** V1: direct UPI to doctor (off-system). System shall NOT take commission, shall NOT gate first help behind payment.
- **FR-37:** System shall show transparent monthly server-cost + voluntary contribution option (split logic TBD - open question).
- **FR-38:** Billing descriptors must stay discreet when Phase-2 fee comes: `PB WELLNESS`, neutral SMS, no `psychiatry` word. V1 UPI note shall also default neutral.
- **FR-39:** No advance wallet. Monetization (when enabled) only on follow-up care, never on Talk Now.

### 5.9 Privacy Non-Negotiables [P0]

- **FR-40:** Alias mode: real name/phone/photo never exposed to other party unless user explicitly opts in at prescription stage.
- **FR-41:** In-app calling/chat only. No phone number exposed, no call-log trace with doctor name.
- **FR-42:** Stealth app: neutral icon/name, PIN + biometric lock, blur content in recent-apps switcher.
- **FR-43:** Neutral notifications: e.g. `Reminder 7pm tomorrow`, never `Therapy with Dr. X`.
- **FR-44:** Auto-expiring chats (default 48h for Talk Now, configurable for follow-up), one-tap wipe, full export/delete per DPDP Act 2023.
- **FR-45:** Stepped ID: anonymous vent = OK with zero ID. Prescription step collects minimal name/age/gender per Telepsychiatry Guidelines 2020. System shall enforce ID gate only at prescription, not before.
- **FR-46:** Discreet e-prescription + plain delivery (V1: e-Rx PDF with neutral header; delivery = partner handoff Phase 2).

### 5.10 Safety + Legal (India)

- **FR-47:** Triage at Talk Now start (2-3 gentle Qs, skippable): self-harm thought? harm to others? recent crisis? If High-risk: no Uber-match, immediate SOS flow to partner helpline + supervised listener + break-glass protocol.
- **FR-48:** Break-glass: anonymity can be broken ONLY for imminent self-harm with prior consent + optional emergency contact captured post-help (never forced upfront). Every break-glass shall be audit-logged.
- **FR-49:** Compliance mapping:
  - Mental Healthcare Act 2017: consent, confidentiality, advance directive awareness.
  - Telepsychiatry Operational Guidelines 2020: what can be prescribed online vs in-person, refill rules.
  - DPDP Act 2023: explicit consent, India data storage, deletion/export, breach notification.
- **FR-50:** What-to-validate list (blocks Beta): exact ID needed for e-Rx, psychotropic refill rules, risk escalation SOP - owner: psych friend.

### 5.11 Coordinator / Admin (Minimal V1)

- **FR-51:** Coordinator view: stuck cases (max-hops / timeout), queue overload, high-risk flags, offline doctors.
- **FR-52:** Coordinator actions: manual warm assign, ping patient (neutral template), ping doctor.
- **FR-53:** No access to chat content unless break-glass invoked + logged.

---

## 6. Non-Functional Requirements

| ID | Category | Requirement (V1 target) |
|----|----------|-------------------------|
| NFR-01 | Privacy | Alias + data minimization by default. PII encrypted at rest + in transit. Chat media auto-expire. |
| NFR-02 | Security | OTP-less auth must still resist spam (device attestation, rate limit, invisible captcha). PIN/biometric for app lock. OWASP MASVS-L1. |
| NFR-03 | Performance | Talk Now tap -> queue join <2s. Chat send -> delivery <1.5s p95. Brief open <2s. |
| NFR-04 | Availability | Talk Hours uptime 99.5% during 19-23 IST. Outside hours graceful degraded page. |
| NFR-05 | Scalability (pilot) | 100 concurrent queue + 20 concurrent audio sessions. Design must scale to 10x without rewrite (stateless app tier). |
| NFR-06 | Usability | 3-tap to human. 8th-grade reading level. Hindi + English V1, regional Phase 2. Audio-first for low literacy. |
| NFR-07 | Reliability | Zero lost briefs. Single-owner invariant holds even on crash (transactional handoff). |
| NFR-08 | Data residency | India storage only (DPDP). No cross-border backup without consent. |
| NFR-09 | Observability | Anonymized metrics only: wait time, drop-off, Yes-rate, hops. No chat content in logs. |
| NFR-10 | Accessibility | Works on low-end Android (2GB RAM), <5MB initial load (PWA/mobile-web first?), offline queue-position SMS fallback. |
| NFR-11 | Maintainability | Modular: TalkNow, Graph, Brief, Booking, Privacy services separable for Phase 2 fee insertion. |

---

## 7. Constraints & Assumptions

**Constraints:**
- C1: Start with 5-6 volunteers, fixed Talk Hours - no 24x7 promise.
- C2: Zero commission Phase 1 - infra funded by voluntary contribution.
- C3: Must pass college + 2 psychiatrists + 3 psychologists pilot before public launch.
- C4: Must work on cheap Android + patchy network.

**Assumptions:**
- A1: Listeners are supervised; docs know what intake to ask (we don't dictate).
- A2: Some spam acceptable cost for zero-friction entry.
- A3: Doctors will refer within trusted Circle if Yes/No/Suggest takes <60 sec.
- A4: Users tolerate ~3 min wait if humanity cue shown.

---

## 8. User Stories (V1 Slice)

- **US-01:** As seeker, I tap Talk Now and talk anonymously in <3 min so my family never knows.
- **US-02:** As seeker, I don't repeat my trauma story to the next doctor because my brief travels.
- **US-03:** As senior doc, I slide a vibe-mismatch case to a junior I trust in 2 taps and stay owner till he says yes.
- **US-04:** As junior doc, I get warm pre-briefed cases with patient consent and start earning.
- **US-05:** As listener, I see only what I need, mark Full when burnt out, and never get drowned.
- **US-06:** As coordinator, I catch stuck (3-hop) cases and warm-assign so no patient is dropped.
- **US-07:** As seeker at risk, I get human SOS fast, not an Uber queue.

---

## 9. Success Metrics (Pilot: 50 users)

- Talk Now -> human connect rate >80% during Talk Hours, median wait <3 min.
- First-help relief self-report (thumbs up) >70%.
- Talk Now -> follow-up book rate >25% (proves 2-day relief -> stabilize loop).
- Referral Yes-rate >50%, Suggest-rate tracked, zero cold drops, zero ownerless cases.
- Brief read time <90 sec (doc survey), repeat-intake complaints ~0.
- Privacy trust: zero PII leaks, 100% neutral notifications audit pass.
- Doctor NPS: seniors report load relief, juniors report first warm cases.

---

## 10. Open Questions (Must close before Design)

1. V1 queue: volunteer peers vs paid juniors for 7-11pm? Owner: psych friend.
2. Max hops: 2 vs 3 before coordinator takes over?
3. Contribution model: fixed monthly from docs vs voluntary chanda?
4. Language/gender matching mandatory for V1 or soft preference?
5. Exact e-Rx ID + psychotropic refill + escalation SOP per 2020 Guidelines?
6. Business friend join timing + Phase-2 fee split?
7. Platform form: native app (stealth need) vs PWA first for speed?

---

## 11. Glossary

- **Talk Now:** Anonymous 8-10 min free first contact (chat/audio).
- **Brief:** Doctor-made referral packet, expiring, consent-gated.
- **Circle:** Doctor's 5-10 trusted peers for referral.
- **Owner:** Single doctor responsible for case at any time.
- **Hop:** One A->B slide. Max 3.
- **Warm transfer:** Patient consents + slot booked, no repeat intake.
- **Chanda:** Voluntary contribution model Phase 1.

---

## 12. Requirement Traceability (to brainstorm)

- Zero-friction entry -> FR-01 to FR-09
- Graph referral -> FR-17 to FR-21
- Ownership/load balance -> FR-22 to FR-27
- Doctor freedom -> FR-31 to FR-35
- Brief packet -> FR-28 to FR-30
- Payments no-greed -> FR-36 to FR-39
- Privacy -> FR-40 to FR-46
- Safety/legal -> FR-47 to FR-50
*Next SDLC step: Design (architecture, data model, API, Talk Now screen-by-screen flow). Do NOT code before closing Open Questions Sec 10.*
