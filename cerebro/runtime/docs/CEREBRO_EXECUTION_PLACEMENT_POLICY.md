# CEREBRO OS · execution placement policy V0

Status: DEFINED
Goal: multi-company autonomy without multiplying recurring cost.

## Placement rules

### GitHub
Use for:
- source code;
- immutable manifests/contracts;
- tests;
- version history;
- release/promotion/rollback gates.

Do not use as:
- recurring business scheduler;
- daily supervisor runtime;
- polling engine;
- long-running research worker;
- memory/database substitute.

### Notion
Use for:
- human-readable Engine Registry;
- operating documentation;
- priorities and decisions;
- runbooks/changelogs;
- supervisor summaries and approved recommendations;
- business knowledge where Notion is already canonical.

Do not use as:
- high-frequency event bus;
- transactional database;
- hot polling backend;
- source-code repository;
- execution runtime.

### Hostinger / shared CEREBRO runtime
Use for:
- scheduler;
- lightweight workers;
- deterministic supervisor cycles;
- caches/snapshots;
- long-running non-transactional jobs;
- zero-cost/offloaded auxiliaries when resource limits permit.

### Supabase
Use for:
- App/CRM/Auth;
- critical transactional state;
- permissions/RLS;
- small audited control-plane state required by runtime.

Avoid using it for:
- heavy logs;
- long research;
- repeated polling;
- bulk experiments/training;
- jobs that can run safely outside.

## Supervisor and meta-learning cost contract

The supervisor is event/delta-driven. A normal cycle:
1. consume already-available signals;
2. deduplicate/idempotency check;
3. deterministic rules;
4. inspect only changed engines;
5. produce a bounded plan;
6. use external tools/model only if explicit policy and budget permit.

Meta-learning cannot run merely because the supervisor ran. It requires a
separate change signal and its own policy. Default is PARKED.

## GitHub Actions policy

- No browser QA on every runtime/doc commit.
- Full browser QA stays manual/release-gated.
- Runtime docs do not trigger factory/app compatibility jobs.
- Specialized deterministic unit/contract checks are acceptable.
- Old debug/patch workflows remain inventory items until separately retired;
  do not delete them without dependency/rollback review.
- PROD promotion/rollback workflows remain untouched by FinOps optimization.

## Notion relationship

Notion can absorb control/status/reporting work currently repeated in GitHub,
but it must not replace Git as the code/version source of truth. The intended
split is GitHub = code/evidence/release, Notion = operating knowledge/control
view, CEREBRO runtime = execution.
