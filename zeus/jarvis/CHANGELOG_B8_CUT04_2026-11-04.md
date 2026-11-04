# CHANGELOG B8 CUT04 · 2026-11-04
- Added disposable PG17 fixture SQL with scoped composite PK and stored-procedure claim.
- Added B8 real PostgreSQL17 CI transport using existing `createJarvisB8CommitmentTracker` and psql; no new server outside isolated Actions service.
- Added workflow process restart and real backup/restore with two synthetic tenants.
- Live CI success: B8 PG17 `41786409397`, Node 413/413 `41786409345`, B7 `41786409404`, B4 PG17 `41786409344`, Governed `41786409313`.
- No change to PROD, main, B7/B6, 179 Engine Registry, subscriptions or IA paid.
- B8 STILL PARTIAL: no real JOB-001 Company Registry/IAM integration.
