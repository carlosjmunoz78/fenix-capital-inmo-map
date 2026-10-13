# CEREBRO OS · CHANGELOG

## 2026-10-13 · COM-001 governed customer delivery router V1

- Added PREPROD `COM-001` delivery routing on the existing canonical engine ID; no new engine ID was introduced.
- `COM-001` consumes `SALE-001 delivery_intent` and applies exact-company isolation, contact permission, suppression/opt-out, dedupe, quiet-hours, channel preference and binding capability checks before any adapter may be selected.
- Only bindings with `environment=PREPROD`, `status=PREPROD_AUTHORIZED`, `access_profile=CUSTOMER_OPERATIONAL`, `customer_scope=true` and exact action support are eligible.
- Even with an eligible binding the output remains `dispatch_authorized=false`, `adapter_dispatch_authorized=false` and `external_side_effect_executed=false`; this block does not contact customers.
- The existing owner `mail_bridge.py` remains owner-only and is explicitly not reused as a customer transport.
- Current channel authority remains unchanged: customer WHATSAPP/PHONE/WEB_WIDGET/MOBILE/OTHER are future adapters until separately contracted/tested/authorized.
- Raw PII, secrets and message bodies are rejected; cost target remains 0 EUR; PROD writes false; Trading access false.
- Added revenue autonomy registry extension `cerebro/registry/revenue-engine-autonomy-state.v1.json` and dedicated contract/dependency/runbook/rollback/rebuild document `cerebro/docs/CEREBRO_REVENUE_COM_DELIVERY_ROUTER_V1_2026-10-13.md`.

## 2026-10-13 · SALE-001 deterministic commercial action V1

- Added PREPROD `SALE-001` deterministic commercial-state V1 on the existing canonical engine ID; no new engine was introduced.
- SALE-001 consumes governed `LEAD-001/NBA-001` decisions, enforces same-company PREPROD boundaries and preserves an explicit contact-permission snapshot before any commercial action.
- Added bounded commercial progression for contact SLA, follow-up, objections, no-show recovery, permission revocation, customer human request, WON/LOST and cooldown; event IDs are idempotent and terminal states cannot be silently reactivated.
- Any customer-contact action produces only a `delivery_intent` targeting `COM-001` with `dispatch_authorized=false`, `channel_binding_required=true` and no external side effect. WhatsApp/PHONE/WEB_WIDGET authority is not claimed by this block.
- Raw PII, secrets and raw message text are rejected from SALE-001 durable payload/state; only opaque references are accepted.
- `sale.plan-action` reuses `JOB-001` durable V1 + durable worker runner V1; no bespoke scheduler, paid service or Supabase dependency was introduced.
- Dedicated SALE gate covers focused revenue tests, canonical Engine Registry validation and full CEREBRO regression. Promotion remains PREPROD-only pending OLD vs NEW, tribunal and COM/channel-adapter gates.
- Cost target remains 0 EUR; PROD writes false; Trading access false.
- Dedicated state/runbook/dependency/rollback document: `cerebro/docs/CEREBRO_REVENUE_SALE_V1_2026-10-13.md`.

## 2026-10-13 · Durable JOB runtime + worker runner + LEAD-001/NBA-001 revenue V1

- PR #645 merged `JOB-001` durable V1 additively over the existing persistent runtime: context idempotency, exponential retry with deterministic jitter, worker leases, heartbeat, checkpoint/resume, watchdog, dead-letter and cancellation. Existing V0 remains preserved.
- PR #647 merged the bounded durable worker runner V1: registered handlers, timeout + AbortSignal, automatic heartbeat, checkpoint resume, fail-closed stale leases, global/per-company concurrency and fair multi-context dispatch. It explicitly does not claim distributed multi-writer semantics.
- Both runtime blocks passed dedicated focused tests, full CEREBRO regression, governed-main contract proof and RSI promotion/readiness shadows before merge.
- Added PREPROD `LEAD-001 + NBA-001` deterministic scoring/next-best-action V1 on canonical engine IDs already present in the Engine Registry; no new engine ID is introduced.
- Revenue scoring rejects raw PII/secrets, requires opaque evidence references, gates contact permission before commercial priority and propagates only the eight canonical HUMAN_REQUIRED reasons.
- `conversion_propensity_score` is explicitly uncalibrated heuristic output and is not represented as statistical probability.
- `lead.score-and-route` executes through the existing `JOB-001` durable V1 + worker runner V1; the capability performs no external contact and no PROD writes.
- Cost target remains 0 EUR; Supabase is not required by these local PREPROD capabilities; Trading remains isolated.
- Current commercial boundary: `LEAD-001/NBA-001 = PARCIAL / PREPROD IMPLEMENTADO`; `SALE-001 = next consumer block`; `CAP-001 = POR AUDITAR implementation evidence`.
- Dedicated technical/runbook/dependency/rollback state: `cerebro/docs/CEREBRO_REVENUE_LEAD_NBA_V1_2026-10-13.md`.

## 2026-10-08 · COMP-REG-001 + TENANT-001 PREPROD reference execution accepted

- PR #511 merged the additive hostless reference executor to `main` as `6710067e0f1beb28f930c038aceebfb9168f965a` after exact-head promotion/readiness gates passed.
- Automatic `main` run `37838584276` attempt 1 completed SUCCESS; deterministic attempt 2 also completed SUCCESS against the same immutable source/request.
- Both attempts completed 651 CEREBRO tests with 651 passed / 0 failed and reproduced execution SHA-256 `c1dc362d98ac5b5ad23d441a8299d64182d2bb4e6bfd271e13ca45538ad1cdc8`.
- Both produced `COMP_REG_TENANT_PREPROD_GREEN`: `COMP-REG-001` and `TENANT-001` GREEN, `COMP-ONB-001` READY, `SCAN-001`/`ENGACT-001` BLOCKED.
- A separate synthetic control tenant remained unchanged, verifying bounded tenant isolation; promotion remained denied with `PHASE4_NOT_ALL_GREEN`.
- Accepted state for both engines is `PREPROD_REFERENCE_EXECUTION_VERIFIED`, explicitly `IN_MEMORY_REFERENCE_ONLY`.
- Cost remained 0 EUR; PROD/PROD-write/Trading/Supabase-write/external-code authority remained false.
- Next gate: `DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED`; no durable Company Registry claim is made.

## 2026-10-08 · COMP-ONB-001 Structural Onboarding V0 accepted

- Added an additive multi-company structural adapter that composes the existing Phase 4 dependency graph with verified FACT-001 AutoFactory; no new canonical engine ID is introduced.
- A bounded new-company structural request prepares the 17 canonical Phase 4 engine scaffolds in tenant-scoped evidence while preserving the generic 18-file FACT scaffold bytes: 17 × 18 = 306 files.
- PR #509 merged additively to `main` as `cb46c0c95b4e628608990404e4c1ac38e889b79e` after exact-head promotion/readiness gates passed.
- Automatic `main` push run `37833181826` attempt 1 completed SUCCESS; deterministic attempt 2 also completed SUCCESS against the same immutable source/request.
- Both attempts ran 643 CEREBRO regression tests with 643 passed / 0 failed and produced the same structural aggregate SHA-256 `295be8b701fe80ea57b034e882da1698def79a97502b9831e9453871c7fc1ed6`.
- Both attempts produced `STRUCTURAL_BOOTSTRAP_GREEN`, 17 Phase 4 engines and 306 structural files, while preserving zero business engines GREEN from scaffold generation.
- COMP-ONB-001 autonomy state is promoted to `AUTOMATIC_COMPANY_SCAFFOLD_VERIFIED` for structural PREPROD/SCAFFOLD generation only.
- Workflow remains hostless and repository read-only; cost 0; PROD/PROD-write/Trading/Supabase-write/external-code authority false.
- `ACTGW-001 → cerebro_new_company_scaffold` remains DEFINED / POR AUDITAR LIVE. Real `COMP-REG-001 + TENANT-001` PREPROD execution is the next gate.
- Real scanning, keyword research, SEO, social/local audit, marketing, knowledge, CRM, App, automations, Training, TENANT activation and PROD remain downstream and are not claimed by this acceptance.

## 2026-10-08 · FACT-001 AutoFactory V0 accepted

- FACT-001 bounded request contract remains scoped by canonical `company_id`, `engine_id`, `environment`, `version` context and wraps the existing factory authority instead of replacing it.
- PR #507 merged the hostless/event-driven AutoFactory implementation to `main` as `a20b98ac9ff006ebbbd9a6fbd51f16d8cdf8cee4` after exact-head promotion/readiness gates passed.
- Merge to `main` automatically triggered run `37830400943` attempt 1 without manual launch: `FACTORY_SCAFFOLD_GREEN`, 18 structural files, 634 regression tests passed / 0 failed, no HUMAN_REQUIRED, cost 0, PROD/Trading false.
- Deterministic rerun `37830400943` attempt 2 completed SUCCESS against the same immutable source/request.
- Both attempts produced the same idempotency key `fact001:9d7a6ad8651866e85f7199b3cfdf38928a09a302fa29cf2e6a962853dfac6427`, same generated bundle SHA-256 `e55c45943dba3cf084c0f657cc1cb529a3a23e5b293e2549b2b51ffb36675b74` and same registry SHA-256 `92717b6109caade90e9c3c89940536122d8583cd8fe8695a4118119febe2caf8`.
- FACT-001 autonomy state is promoted to `AUTOMATIC_SCAFFOLD_VERIFIED` only for connected canonical SCAFFOLD request generation.
- Generated target engines remain SCAFFOLD-only: target behavioral evaluation, tribunal, PREPROD and any PROD promotion remain downstream gates.
- ACTGW-001 → `repository_dispatch` support is defined but remains POR AUDITAR LIVE; Git-backed automatic request execution is verified.
- Workflow permission remains `contents: read`; no new credentials, Supabase writes, production writes, Trading access or paid path were introduced.

## 2026-10-07 · Skill Supply Chain Step 4 PREPROD GREEN

- Evidence head `86369e0cd0d54c9c205bd39f309804a62b2c59d3`; workflow `37647914902` SUCCESS; artifact `11494354501`, digest `sha256:9dac9feec60dee265d3af9b2413f48394eaf54b7f4109f4ba96051f374770c10`.
- Ejecutado PREPROD runtime OLD vs NEW sobre `SharedRuntime`: 18 ejecuciones, 2 packages, fixtures sintéticos no cliente, coste adicional medido 0 €.
- Observabilidad/audit/FinOps persistentes locales activos; rollback físico del binding y rebuild default-disabled GREEN.
- Independent PREPROD Judge `GREEN_FOR_PREPROD_TRIBUNAL`; Tribunal `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`; blockers=[].
- `HUMAN_REQUIRED=HIGH_RISK`, `merge_authorized=false`, `prod_authorized=false`, `autonomous_promotion_authorized=false`.
- Sin datos PROD/cliente, código externo de skills, writes PROD, Trading ni paid fallback.
- Step 4 no ejecuta side effects externos de las skills: continúan como guidance no confiable detrás de wrappers CEREBRO.

## 2026-10-07 · Skill Supply Chain Step 3 closure

- PR #486 permanece DRAFT y sin autorización de merge/PROD.
- Congelada evidencia behavioral en `135fc29a9b41d7257381c08efea49015db1e71d9` antes del commit documental.
- Supabase/Postgres run `37642814017`: Behavioral proxy 6/6, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN y `READY_FOR_PREPROD_PROMOTION_REVIEW`; artifact `11492473830`, digest `sha256:2837ab122a2efbab92536f32519c971d7967c071ada5594dff2258f78796c3e0`.
- agent-browser run `37644374137`: Behavioral proxy 6/6, raw `STATIC_LAB_HOLD` preservado, normalized wrapper GREEN, Judge GREEN, rollback/rebuild GREEN, Tribunal GREEN y `READY_FOR_PREPROD_PROMOTION_REVIEW`; artifact `11494440533`, digest `sha256:0a1f97bf1e7271454627eb7553147dfa5930c28a26fac20232fd1acd58e06d5c`.
- Ambos quedaron `HUMAN_REQUIRED=HIGH_RISK`, sin merge/PROD/autopromotion.

## 2026-09-09 · Persistent EVT-001 / JOB-001 V0

- PR #168 merged as `26fb9c75b9a7361afccccdc111761ad10aac5fa4` after exact-head review of `16484fdf50760afbd98e1d85824ed352dd3a5585`.
- Added local/self-hosted PREPROD persistence for `EVT-001` and `JOB-001` as parallel single-writer adapters; existing in-memory EventBus/JobQueue remain preserved.
- Added exact persisted payload checksum, atomic temp-write/fsync/rename/directory-fsync, ancestor-directory fsync, deterministic replay, restart idempotency and corruption/kind fail-closed handling.
- Hardened caller-input snapshots, exact PREPROD operation boundaries, ambiguous post-rename durability poisoning and tenant/context isolation.
- Added durable restart recovery for jobs abandoned in `RUNNING`: retry to `QUEUED` when attempts remain, otherwise terminal `FAILED`.
- PREPROD Factory `34337677363` and App `34337677429` success on exact reviewed head.
- Codex exact-head review closed with no remaining P1/P2 suggestions.
- PROD Live Deploy `34340279918` and PROD Runtime Smoke `34340279922` success on exact merge SHA.
- `autonomous_prod=false`, `prod_writes=false`, no Supabase dependency and no new paid service.

## 2026-09-09 · Governance V0

- PR #167 merged as `c523da8f11dbf1a2618982aeeb5940670317bb6e`.
- `POL-001` and `HEX-001` structural/reference V0 completed with deterministic PREPROD-only policy evaluation and canonical HUMAN_REQUIRED exception routing.
- Hardened fail-closed policy inputs, isolation, priority/tie semantics, stable exception event identity and replay/idempotency behavior through iterative exact-head review.
- PROD Live Deploy `34330670776` and PROD Runtime Smoke `34330670550` success on merge SHA.
- No autonomous PROD promotion was enabled.

## 2026-09-09 · Phase 2 read-only evidence audit V0

- Audited all nine existing-engine bindings without activation, writes or new cost.
- `APP-001` moved at evidence level to `CONFIRMED_OPERATIONAL` for the existing App surface only, based on exact-SHA PROD deploy/smoke on `6bf6af92c1106884da87fb9a659f807093d47e0a` (`34293941974`, `34293942069`). This does not imply autonomous CEREBRO execution.
- `CORE-001`, `SUP-001`, `TRN-001`, `DOC-001` remain `DOCUMENTED_PARTIAL`.
- `CRM-001`, `SEO-001`, `WEB-001`, `LAB-TRD` remain `UNKNOWN_REQUIRES_AUDIT`; Trading stays isolated and requires separate audit.
- Added machine-validated evidence ledger and tests preventing partial/source-only evidence from being mislabeled as live confirmation.
- No binding was enabled for autonomous PROD execution.

## 2026-09-09 · Documentation closure

- PR #165 merged as `6bf6af92c1106884da87fb9a659f807093d47e0a`.
- Canonical state, dependency map, runbook, evidence, changelog, backup/rebuild and autonomy documentation aligned with Phase 4/5 evidence.
- Added explicit emergency rollback procedure tied to `docs/PROD_ROLLBACK_RUNBOOK.md`.
- PROD Live Deploy `34293941974` and PROD Runtime Smoke `34293941922` success on exact merge SHA.

## 2026-09-09 · Phase 5 Console/Gateway V0

- PR #164 merged as `c2eb030e2e8ed0ab45ca58775a7183e359e3d2e9`.
- Added Console/Gateway V0 for `CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001`.
- Added company-bound sessions/context, history, audit, engine consultation, Gateway-mediated command/chat.
- Hardened recursive cloning against shared memory, `WebAssembly.Memory` and accessors.
- Preserved authoritative `company_id/environment/version` and async operation context snapshots.
- Added separate failure audit and canonical HUMAN_REQUIRED escalation classification.
- PREPROD Factory/App green on exact reviewed head `2180258a3ae91697d6bd988361996afa62032f72`.
- Codex exact-head review found no major issues.
- PROD Live Deploy `34292739019` success and PROD Runtime Smoke `34292739031` success on merge SHA.

## 2026-09-09 · Phase 4 Multi-company Bootstrap V0

- PR #163 merged as `cd04fa8ccdbbb5c4945258d579e6bfb8efe1ea01`.
- Added deterministic bootstrap for 17 canonical multi-company engines.
- Enforced PREPROD-only, tenant isolation, canonical HUMAN_REQUIRED and no autonomous PROD promotion.
- Added shared-memory/WebAssembly guards and atomic evidence state transitions.
- Enforced `ENGACT-001` dependency on `TENANT-001` GREEN.
- PREPROD and exact-SHA PROD deploy/smoke gates green.

## Earlier structural milestones

- PR #162: Phase 2 existing-engine wrappers + Phase 3 shared runtime/zero-cost reference.
- PR #161: FACT-001 Factory V0 + GOV-001 Registry V0, 177 canonical IDs and reproducible scaffold generation.
- PR #160: Intervinientes/existing-document backfill production scope, already green and not to be redone.

## Status semantics

A merge/deploy entry records evidence only for its stated scope. `CONFIRMED_OPERATIONAL` for an existing surface does not grant autonomous CEREBRO PROD status.