# UMS-001 · LAB one-asset selective acquisition, CEREBRO orchestration seam

Status: CODED / LOCAL_TESTED. Runtime enabled only after isolated preflight and E2E.

- Keeps all prior Poly Haven, ambientCG and The Met search bindings intact.
- Only explicitly selected The Met object `met:436524`, JPEG < 600 kB, source `isPublicDomain=true`.
- Incoming image MIME and JPEG bytes checked; SHA-256 recomputed at producer and on read.
- Cloudflare LAB_KV keys are new: `media/ums001-met-selected/436524/original.jpg` and `meta/ums001/met-selected/v1/receipt/436524`. No writes to `meta/state-v0` or original media assets.
- `SCOUT_ACQUIRE_ENABLED=false`, `MET_SELECT_ENABLED=false` by default. Runtime flag can be enabled only for one guarded LAB acceptance; no public URL, cron or preview.
- Follow-up global CEREBRO attachment requires a genuine authenticated Service Binding from its own runtime. The code-level orchestrator adapter is not falsely claimed connected to PROD Supervisor. Do not modify App/CRM/PROD.
- Read/retrieval does not grant publication. All outputs: `production_approved=false`, `rights_review=PENDING`.

Risk/rollback: use flags OFF at both Workers, restore original clean versions and retain files for auditing. Existing Poly Haven storage and scheduling must remain unchanged.
