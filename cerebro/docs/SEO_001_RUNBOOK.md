# SEO-001 · Runbook operativo

## Estado

- Engine: `SEO-001`
- Runtime version observed: `0.4.1`
- Company scope: `MULTI_COMPANY`
- Current evidence: `CONFIRMED_OPERATIONAL`
- Autonomy: `OPERATIVE_GUARDED_PENDING_4_WEEK_VERIFICATION`
- PROD ordinary writes: locked by default.
- Additional-cost target: 0 €.

## Canonical context

Every run/change must carry:

`company_id + engine_id + environment + engine_version`

Current Fénix PREPROD defaults:

`FENIX_CAPITAL + SEO-001 + PREPROD + 0.4.1`

## Measurement path

Preferred order:

1. Official Google APIs using server-side credentials when property access is valid.
2. Existing Make OAuth bridge when the service-account path is unavailable.
3. Never require GSC Wizard payment for baseline operation.

Current canonical GA4 property: `518454210`.
Legacy/no-use measurement property: `484640617`.

Scheduled PREPROD runner: `fenix-seo-cerebro-preprod` v23.
PREPROD draft executor: `fenix-seo-executor-preprod` v8.
Existing GSC Make scenario: `9550706`.
Existing GA4 Make scenario: `9538231`.
Existing Google bridge scenario: `9694039`.

The measurement runner persists query→page pairs and an idempotent prioritized backlog in `seo_cerebro_backlog_preprod`. Multi-company routing is fail-closed: configured `FENIX_CAPITAL` runs; unknown companies return 409 until Company Registry supplies their configuration.

## WordPress repair loop

`detect → demonstrate → snapshot → minimal allowlisted change → verify live URL → rollback on failed verification → document → learn`

Do not expand the low-risk allowlist merely to increase autonomy. Ambiguous content, URLs, redirects, claims, legal text, pricing, financial promises and structural changes remain proposal/LAB/HUMAN_REQUIRED according to risk.

## Tests and gates

Required before stronger autonomy claims:

- Core Guard health green.
- STAGING PREPROD readiness green.
- STAGING smoke green.
- SEO E2E canary green.
- Snapshot + apply verification + rollback evidence.
- Published-inventory technical batch completed with no unresolved blocker.
- Google readiness batch completed with no unresolved blocker.
- Four consecutive weekly cycles where routine incidents are detected, handled correctly and documented without human correction.
- Query→page overlap candidates are proposal-first; never auto-redirect/canonicalize solely because multiple URLs receive impressions.

## Backup and rollback

WordPress:
- capture Core Guard/Cowboy snapshot before any write;
- rollback to captured state if post-write verification fails;
- checkpoint before multi-step maintenance.

Measurement runner:
- Edge Function versions are immutable historical versions; rollback by redeploying prior known-good source.
- Supabase schema migration is additive and retains existing rows.

Contracts/evidence:
- GitHub is the canonical versioned copy for CEREBRO binding contract and runbook.
- Notion keeps operational SEO evidence and business knowledge.

## Rebuild

Rebuild from:
1. FACT-001/GOV-001 canonical registry.
2. `registry/seo-001-runtime-binding.json`.
3. WordPress SEO bridge package + Core Guard.
4. Supabase migration history and runner source.
5. Existing Make scenario IDs/connections.
6. Notion SEO canonical contract and knowledge.
7. Fresh canary and measurement verification.

Do not rebuild by replacing the existing WordPress stack.

## Known non-blocking limitations

- Direct GSC service-account path currently lacks property permission; existing OAuth fallback is healthy.
- Fallback `ga4_active_users` is not canonical and must not drive decisions until a non-overcounting total is exposed.
- Elementor Pro is installed but is not a functional dependency.
- Imagify automatic optimization is disabled while its API key/quota are invalid.
- The legacy Supabase canary endpoint is not canonical because its old WordPress application credential is stale; use the green STAGING WordPress canary/Core Guard path.

## HUMAN_REQUIRED

Only:
`LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

## Intent map

`seo_cerebro_intent_map_preprod` stores scoped query → preferred URL decisions with confidence and decision state. The runner reads it on every cycle and enriches near-page-one and overlap findings. CONFIRMED does not authorize redirects; it only establishes the preferred target for optimization and internal-link planning.

## Weekly autonomy evidence

The first fully verified weekly cycle is `2026-09-14 → 2026-09-20`. Current longitudinal gate: `1/4`. Future weeks must be evidenced independently; they are never backfilled or invented.

## Experiment registry

`seo_cerebro_experiments_preprod` contains controlled experiments with explicit success metrics and safety constraints. Current active experiments: inheritance SERP CTR (no legal/tax claim mutation, no auto-publish), advisor URL ownership (no redirects/canonical changes), and broker synonym disambiguation (no new landing without evidence).

Current backlog disposition after live validation: 2 items DONE without mutation because metadata and rankings were already strong; 7 items are consolidated under LAB experiments. No item is HUMAN_REQUIRED.

## Autonomous experiment evaluator

The weekly runner now evaluates active experiments deterministically against explicit baselines and minimum observation windows. It records observations in `seo_cerebro_experiment_observations_preprod` and never promotes an experiment before the minimum window is reached.

The runner also performs a zero-cost public technical canary over robots.txt, sitemap index, home, Córdoba advisor, mortgage requirements, inheritance and new-build pillar pages. Weekly cycle evidence is written **only** when the trigger is the real scheduled `cron`; manual/test invocations cannot create or backfill weekly autonomy evidence.

## Runtime timing hardening

The technical canary fetches critical URLs in parallel to keep the weekly run comfortably inside the pg_net request window. Cron job 2 remains Monday 06:00 UTC and now calls the runner with `timeout_milliseconds = 30000`, while manual v18 validation completed HTTP 200 without timeout. This changes transport reliability only; it does not relax SEO policy or autonomy gates.

## Run freshness

`seo_cerebro_runs_preprod.measured_at` records the latest successful measurement time independently of the idempotent `run_key`. The health view orders by `measured_at`, so repeated validations inside the same 28-day GSC window no longer look stale. Manual v19 validation returned HTTP 200, technical canary GREEN, and did not create weekly autonomy evidence.

## Promotion, rollback, tribunal and doctor

SEO-001 separates measurement, experiment evaluation, promotion preparation, tribunal, doctor and execution.

- seo001_prepare_promotions_preprod only materializes a change after PASS/READY.
- LOW-risk URL-ownership work may become an auto candidate. Redirects, canonicals, slug changes, mass edits, legal/fiscal semantic edits and architecture changes remain blocked.
- Every candidate stores before/after state, risk class, policy and rollback state.
- seo001_rollback_change_preprod marks eligible changes rollback_required and preserves the exact rollback state.
- seo001_run_tribunal_preprod independently judges experiments; legal/fiscal and architecture-sensitive experiments are proposal-only.
- seo001_run_doctor_preprod checks multi-company scope, cycle integrity, measurement freshness, backup presence, tribunal state and unsafe autonomous promotion.
- seo001_state_snapshot_preprod and seo001_backup_state_preprod provide rebuildable state snapshots. Routine backups are cron-only.
- Manual v23 validation returned HTTP 200, doctor 7/7 PASS, tribunal 0 FAIL, no manual cycle write and no manual routine-backup write. Autonomy remains correctly gated at 1/4 real weekly cycles.
