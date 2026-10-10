# Phase 2 — Care Graph (Circle + Referral Yes/No/Suggest C). NOT BUILT YET.
See requirements FR-17..21 + DesignER Sec 5.2/6.3.

Build after Phase 1 pilot works:
- circles CRUD (max 10/owner)
- POST /referrals (pending<3, hop<3 guards)
- GET /referrals/inbound (MASKED preview only)
- POST /referrals/:id/respond
- transfer_ownership() atomic (DesignER Sec 4 DDL function)
