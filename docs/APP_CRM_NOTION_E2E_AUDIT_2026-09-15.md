# APP ↔ CRM ↔ Notion · E2E audit checkpoint · 2026-09-15

## Scope
Read-only/branch-safe audit for `app-crm-notion-sync-closure-20260915`.
No `main` mutation, no PROD deployment, no database/customer-data mutation, no legacy RPC revoke.

## Proven on this branch
- PROD operational detail no longer falls through to `fenix-notion-actions-test`.
- PROD reads use the canonical App Gateway compatibility layer.
- Expediente create/update are gateway-backed.
- Task reassign is gateway-backed through `/tareas/{task_code}/reassign` → `fenix_prod_reassign_task_server`.
- At the original checkpoint, task `state`, `complete` and `reopen` were deliberately `FAIL_CLOSED` because no physical canonical backend contract had yet been demonstrated to this branch.
- Document-detail and signature-detail generic mutations remain `FAIL_CLOSED` unless mapped to an explicit lifecycle contract.
- Appraisal status uses the canonical Gateway status route; unmapped appraisal mutations fail closed.

## Physical backend evidence
`supabase/functions/fenix-app-gateway/index.ts` is the canonical server-side boundary currently visible in this repository. It exposes server RPC-backed routes for expediente create/list/get/update/workspace, task read/reassign, documents, banking, appraisals, signatures and additional operational resources.

The repository snapshot used by the original checkpoint did **not** contain a production Notion transport implementation identifiable by `api.notion.com`, `NOTION_TOKEN`, or `fenix-notion-bridge` code search. Subsequent read-only inspection of the live Supabase project demonstrates specialized Notion transports outside that repo snapshot; this correction is recorded below.

## Notion workspace evidence
The connected Notion workspace contains:
- the active Fénix Capital architecture documentation stating the target flow `Usuario → app.fenixcapital.es → Frontend → API/backend → Supabase/Notion/automatizaciones → CEREBRO/Ana`;
- an explicit rule that the final App must consume a backend/API rather than direct Notion UI links;
- historical safe test pages for a `Fénix Notion Bridge` used only for non-operational archive/restore validation;
- governance stating automation is not production-green until physical permissions, execution, transport, idempotency, retries, rollback/contingency and reconciliation are tested.

These Notion pages prove historical/architectural intent and the existence of test-era bridge validation material. They do **not** prove that the current canonical PROD App Gateway writes are mirrored to Notion.

## Live evidence addendum · 2026-09-15

### A. Existing Notion transports physically demonstrated
Read-only inspection of live Supabase PROD demonstrates that Notion connectivity does exist, but it is specialized rather than a generic App/CRM mirror:

- `fenix-ana-api` uses `NOTION_TOKEN` + `api.notion.com` to create/update Ana correction-learning records and associated governance tasks.
- `fenix-ana-knowledge` uses `NOTION_TOKEN` + `api.notion.com` for knowledge candidates, review tasks and decisions.
- `fenix-document-intelligence` uses `NOTION_TOKEN` + `api.notion.com` against the document data source for document-intelligence metadata.
- `fenix-crm-sync-once`, `fenix-directory-sync-once` and `fenix-prod-data-sync-once` still exist as deployed function names but are logically retired and return HTTP 410 `migration_endpoint_retired`.

Conclusion: a generic current `Gateway/Supabase → Notion` mirror for operational expedientes/tasks is still **not demonstrated**, but the previous wording “no production Notion transport” is too broad and is superseded by this addendum.

### B. Transactional source of truth and identifiers
The live PROD schema physically demonstrates:

- `fenix_prod.expedientes`: canonical transactional key `expediente_code`, owner `owner_actor_code`, optimistic version `version`.
- `fenix_prod.tareas`: canonical transactional key `tarea_code`, owner `owner_actor_code`, optimistic version `version`.
- `fenix_prod.actors`: canonical worker identity `actor_code`.
- No dedicated `notion_page_id`, `external_id`, `pending_sync` or equivalent sync-control column exists in the core `expedientes` or `tareas` schema.

Current row audit:

- `expedientes`: 46 real rows; 0 explicit Notion ID references detected in `payload_operacion`.
- `tareas`: 88 real rows; 85 carry historical Notion source URLs and source payloads; their Notion page identifier is retained as the generic legacy/source payload field `id`, not as the current canonical task identity.

The connected Notion workspace physically demonstrates the live data sources:

- Expedientes data source: `collection://993423d0-8d3e-411e-bd2c-dceae3cb893b`. Its human-facing `ID expediente` is a Notion formula (`EXP-` + Notion ID sequence); it is not demonstrated to be equal to Supabase `expediente_code`.
- Tareas data source: `collection://43718381-d24e-4264-b2c7-733307f9bc48`. This is also the TASK data source used by the specialized Ana governance transport.

Therefore the current safe contract is:

`Supabase codes + versions = transactional identity/state`

`Notion page IDs / TAR-* / EXP-* = external or legacy/workspace identity unless an explicit mapping contract proves otherwise`.

### C. Physical drift proves there is no generic bidirectional task mirror
A concrete cross-check was performed using Notion page `3bf81b1a-756d-8108-af8f-d34e2cdcbdc9` from `Tareas · Fénix Capital`.

Notion currently reports the task as `Estado=Pendiente`, `Completada=false`, `ID tarea=TAR-29`.
The corresponding Supabase row, located from the retained Notion source page ID, currently reports canonical `estado=Cancelada`, `version=2`, with `tarea_code=notion|3bf81b1a-756d-8108-af8f-d34e2cdcbdc9`.

This mismatch is direct evidence that imported Notion task provenance must not be interpreted as a live bidirectional mirror. No automatic reconciliation write was performed during this audit.

### D. Task and expediente action contracts now exist physically
Live PROD contains migrations `app_task_bulk_actions_v0` and `app_expediente_bulk_actions_v0` and deployed Edge Functions `fenix-task-actions` and `fenix-expediente-actions`.

`fenix_prod_task_bulk_action_server` physically supports:

- `complete`
- `reopen`
- `state`
- `reassign`

with whole-batch prevalidation, role checks, owner checks, `expected_version` conflict control, audit notes and version increments.

`fenix_prod_exp_bulk_action_server` physically supports `stage` only, also with batch prevalidation, role/owner checks, `expected_version`, stage validation, history, notes and version increments.

This means the original task `state/complete/reopen = FAIL_CLOSED because backend contract absent` statement is now stale relative to live PROD. However, the canonical `fenix-app-gateway` v17 still exposes only task read + single-task `reassign`; it does **not** expose the newer task bulk action contract. The `fenix-app-gateway-v2-canary` v1 is active but currently contains unrelated v2 routes and also does not expose these task/expediente bulk actions.

Promotion implication: do **not** make the frontend call `fenix-task-actions` directly. Preserve the architecture and expose any accepted action through the canonical Gateway compatibility boundary first, branch-safe, then test.

## Updated status matrix
| Capability | Status | Evidence / reason |
|---|---|---|
| App desktop restoration | HECHO | PR #385 CI: functional, probe, visual, build and rollback bundle green |
| App → canonical Gateway reads | HECHO | PROD compatibility path uses canonical App Gateway |
| Expediente create/update → Gateway | HECHO | Gateway routes + server RPCs |
| Task reassign → Gateway | HECHO | physical Gateway route + `fenix_prod_reassign_task_server` |
| Task state/complete/reopen backend contract | HECHO | live `fenix_prod_task_bulk_action_server` + `fenix-task-actions` |
| Task state/complete/reopen through canonical Gateway/App | PARCIAL / FAIL_CLOSED | backend exists, Gateway/App wiring not yet proven |
| Expediente bulk stage backend contract | HECHO | live `fenix_prod_exp_bulk_action_server` + `fenix-expediente-actions` |
| Generic document/signature detail writes | PARCIAL / FAIL_CLOSED | explicit lifecycle mapping still required |
| Specialized PROD Notion transports | HECHO | Ana knowledge/corrections + document intelligence physically demonstrated |
| Generic Gateway/Supabase → Notion operational mirror | NO DEMOSTRADO | no generic transport contract; task drift physically observed |
| Canonical operational source of truth | HECHO | Supabase codes/versions and server contracts govern App state |
| Idempotent Notion reconciliation | PARCIAL | dedup keys exist in specialized flows; durable outbox/retry/DLQ/reconciliation not demonstrated |
| End-to-end App ↔ CRM ↔ Notion as one bidirectional state system | NO DEMOSTRADO | systems have different roles; direct state equivalence is contradicted by physical task drift |

## Promotion rule
`SAFE_TO_MERGE=NO` for any claim of full App↔CRM↔Notion bidirectional closure.

The target should instead be split explicitly:

1. App ↔ canonical Gateway ↔ Supabase for transactional CRM state.
2. Notion as specialized knowledge/document/governance and retained legacy provenance where already used.
3. Explicit, entity-scoped synchronization only where a business contract requires it, with canonical ID mapping, idempotency, retry/backoff, pending/dead-letter state, reconciliation and rollback.

## Next executable steps
1. Wrap the already-existing task bulk action contract behind the canonical App Gateway in a branch-safe implementation; do not send frontend traffic directly to `fenix-task-actions`.
2. Update App compatibility code so `complete`, `reopen`, `state` remain fail-closed unless the canonical Gateway route is available and contract-tested.
3. Add contract tests for role permissions, `expected_version`, batch atomic prevalidation, invalid states, reassign target-role checks and error propagation.
4. Keep generic operational Notion mirroring disabled; treat the demonstrated task drift as a reconciliation test fixture, not as permission to overwrite either side.
5. Design a zero-additional-cost durable reconciliation/outbox layer only for specialized flows that actually require cross-system synchronization; do not deploy it to PROD before backup, PREPROD, OLD-vs-NEW tests and rollback are proven.
6. Re-run CI/contract probes and update this checkpoint before changing `SAFE_TO_MERGE`.
