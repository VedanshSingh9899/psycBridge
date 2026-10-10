# Testing — pilot checklist (Phase 1 exit criteria)

> Tick these before calling Phase 1 done. Each row maps to the frozen spec
> ([specs/requirements.md](../specs/requirements.md) §9 metrics, FR/NFR in brackets).

## Seeker journey

- [ ] New user reaches a human in ≤3 taps, zero mandatory fields (FR-01, US-01)
- [ ] Median queue wait <3 min during Talk Hours with humanity cue shown (`online_count`, `eta_min`) (FR-05)
- [ ] Outside 19–23 IST: next slot + SOS shown, no dead-end (FR-06)
- [ ] First session free, 8-min wrap hint, 10-min close honored (FR-04)
- [ ] Post-help offers are optional/dismissable, never blocking (FR-08)
- [ ] Relief vote (👍/👎) recorded; thumbs-up >70% across pilot (FR-08, §9)

## Trust & safety

- [ ] Same device can't take 2nd free session within 24 h (`429 FREE_LIMIT`) (FR-07)
- [ ] Triage `yes` bypasses queue → SOS screen, accept `409`s (FR-47)
- [ ] Alias only: no name/phone/photo asked or shown anywhere (FR-40/41)
- [ ] Chats auto-expire (~48 h), nothing sensitive in logs (NFR-01/09)

## Listener side

- [ ] Accept / Skip works; Skip returns user to queue head, no drop (FR-12)
- [ ] Listener sees alias + lang + risk flag only, no PII (FR-40, §9 matrix)

## Pilot numbers (§9, 50 users)

- [ ] Talk Now → human connect rate >80% during Talk Hours
- [ ] Talk Now → follow-up intent >25% (proves relief → stabilize loop)
- [ ] Zero PII leaks, 100% neutral wording in any notification

## Not in Phase 1 (don't test for these)

Referral Yes/No/Suggest, 3-hop guard, brief packet, booking/UPI, stealth app,
coordinator dashboard — all Phase 2+ ([PHASES.md](../PHASES.md)).
