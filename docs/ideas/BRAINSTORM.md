# psycBridge - Brainstorm Source of Truth
Date: 2026-09-29
Team: psych student (domain) + tech (builder) + business (to join)
Status: brainstorming, no code yet

## Core Thesis
- App like Uber / Urban Company for psychiatrists + psychologists.
- Killer moat = privacy so deep even family doesn't know if user wants that.
- Network-first, not extractive marketplace. Let doctors do what they want.
- Emotion-first, not greedy. Don't monetize despair.
- Users in India come late - beyond borderline depression. Build for moderate-severe first, not wellness journaling.

## 1. Zero-Friction Entry (No login for first help)
Principle: "3-year-old can get free try. If it helps, he'll come again."
- Open app -> Big "Talk Now" -> auto nickname (e.g. QuietFox) -> queue. No phone, no photo ID, no OTP, no 10 questions upfront.
- First contact: 8-10 min free, chat/audio only (no video pressure). Listener = trained peer / junior psych under supervision.
- Doctors ask only what THEY need, what user is comfortable with. We don't force intake. Docs know what to do.
- AFTER help, ask for follow-up: optional mobile for reminder, create account to see history/prescription.
- OTP is also a drag. Make it optional/post-help.
- Abuse control without login: 1 free session per device per 24h, device UUID, invisible captcha, queue cap. Accept some spam as cost.
- Legal: anonymous vent = OK. Prescription step needs name/age/gender per India Telemedicine / Telepsychiatry Guidelines 2020. Stepped ID: anonymous -> minimal ID only when meds needed.
- Need "person waiting for you" feeling: show "2 listeners online, ~3 min wait". Start with fixed Talk Hours (e.g. 7-11pm) with 5-6 volunteers from psych friend's college to avoid 24x7 burnout.

## 2. Graph Referral Network (Care Graph)
User elaboration (2026-09-29): "I can do this but my friend can do it better / click better. He reads file, says yes/no, or suggests perfect guy. File slides node to node until perfect person. Minimize interchange."
- Every doctor connected to 5-10 trusted people = My Circle.
- Interdisciplinary by design: clinical psych + 2 neuro + psychiatrist + de-addiction + GP etc. We also suggest them to befriend outside their field. Helps doctor mental health too.
- Handshake protocol:
  1. Doc A creates Brief (see Sec 4) -> taps Refer -> picks 1-2 from Circle (on-app or off-app via link/SMS).
  2. Doc B sees masked preview (issue type, age-band, language, risk-level — NO name/photo) -> Yes / No / Suggest C.
  3. On Yes: patient gets one-tap consent "Share my brief with Dr. B?" -> warm transfer, slot booked, no repeat intake.
  4. On Suggest C: file slides to C with chain history (A->B->C), patient sees only final doc, not chain drama.
- Rules to protect consumer: max 3 hops, then STOP and assign best-fit + human coordinator pings patient. Never cold "go find this guy". Always warm slot.
- Click fit matters as much as skill: language, gender preference, age vibe, issue expertise. B can decline for "won't click" — valid reason.
- Off-app allowed: if B not on app, A sends expiring link. If B joins later, A gets credit.

## 2b. Ownership + Load Balancing (2026-09-29 update)
- Rule: till case is given or surely passed, its his domain / responsibility.
- Whoever holds file owns patient. A owns till B says Yes + patient says Yes, then B owns. Never thrown in air, always one owner, no limbo.
- Until yeah-sure one found, do NOT move user here-there. Only pass files behind scenes, read and pass.
- Silent routing densifies network day by day: every slide creates/strengthens edge, system learns who is good at what.
- Load balancing effect: overworked seniors pass mild/fit-mismatch to juniors with space. Juniors earning less get warm trusted cases. Seniors keep severe/meds-heavy.
- Docs set "full / space for X" status. Prefer space + fit when sliding. Cap max 3 pending briefs per doc, pausable to avoid drowning famous docs.
- Timeout: if owner inactive X hrs, ping + coordinator helps slide faster, ownership stays with A till handoff.

## 3. Freedom for Psychologists / Doctors
- Full freedom inside + outside. If they want to leave platform and consult privately, they can. No penalty, no algorithm punishment.
- They set fees, slots, modality (audio-only OK), cancellation, language.
- They own client relationship + notes, can export.
- Can bring own existing clients to use our video/notes/prescription tools.
- Community: anonymized peer supervision, case discussions. Solves isolation/burnout.
- Early model: figure out what fits as things progress. No lock-in.

## 4. Doctor Brief Packet (Kill Repeat Trauma)
- When referring, doctor makes a brief file and shares. Next doc reads and decides yes/no.
- Contains: presenting issue 5 lines, since when, risk flag, PHQ/GAD scores if done, meds tried, what helped/didn't, language preference.
- Patient one-tap consent, expiring link (e.g. 7 days), auto-burn, no WhatsApp PDF floating.
- Goal: 90-sec context, patient doesn't re-live trauma for hours with each new doc.
- Format to standardize with psych friend (SBAR-like for mental health).

## 5. Payments - No greed phase
User idea: no payment thing on system initially. Money goes completely to workers. Ask them to contribute as much we need and divide. Add fee to both sides only after both are onboard.
- Phase 1: off-system / direct (UPI to doctor). No commission, no paywall before help. Optional transparent contribution to server costs.
- Phase 2 (after supply + demand onboard): small disclosed fee to both sides.
- Billing must stay discreet when we do it: neutral statement `PB WELLNESS`, neutral SMS, no "psychiatry" word.
- Don't do advance wallet / paywall before help.
- Follow-up truth: first vent gives ~2 days relief only. After that need proper sessions + meds. So monetization (when it comes) is on follow-up care, never on first cry for help. Docs decide what data they need for that stage — we don't dictate intake.

## 5b. Follow-up Loop (Relief -> Stabilize -> Maintain)
- Day 0 Relief: free Talk Now.
- Week 1-4 Stabilize: 45-min sessions (therapy) + psychiatrist eval if meds needed.
- Maintain: homework, 48-hr chat check-in, refill reminders.
- If user doesn't return, gentle neutral nudge once, no guilt-trip.

## 6. Privacy Non-negotiables
- Alias mode, in-app calling/chat only, no number exposed, no call-log trace.
- Stealth app: neutral icon/name, PIN+biometric, blur in recents.
- Neutral notifications: "Reminder 7pm tomorrow" not "Therapy with Dr. X".
- Auto-expiring chats, one-tap wipe, data delete/export per DPDP Act 2023.
- Virtual-first + plain-clothes home visits (no branding) + private cabin partners for users with no private room at home.
- Discreet e-prescription + plain packaging delivery.
- Tradeoff: anonymity by default, but break-glass for self-harm with prior consent + optional emergency contact.

## 7. Safety + Legal (India)
- Mental Healthcare Act 2017: consent, confidentiality.
- Telepsychiatry Operational Guidelines 2020: what can be prescribed online vs in-person.
- DPDP Act 2023: consent, India storage, deletion.
- Triage + red-flag + SOS to partner helpline. No Uber-model for active crisis.
- To validate with psych friend: exact ID needed for prescription, psychotropic refill rules, risk escalation protocol.

## Open Questions
- V1 queue: volunteer peers vs paid juniors for 7-11pm?
- Interchange limit: max 2-3 hops before we stop sliding file and tell user?
- Contribution model: fixed monthly from docs vs voluntary?
- Language / gender matching mandatory for V1?
- Business friend pitch: when to bring in?

## Next: Talk Now flow screen-by-screen
Pending.
