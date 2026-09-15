# APP ↔ CRM ↔ Notion · E2E audit checkpoint · 2026-09-15

## Scope
Read-only/branch-safe audit for `app-crm-notion-sync-closure-20260915`.
No `main` mutation, no PROD deployment, no database/customer-data mutation, no legacy RPC revoke.

## Proven on this branch
- PROD operational detail no longer falls through to `fenix-notion-actions-test`.
- PROD reads use the canonical App Gateway compatibility layer.
- Expediente create/update are gateway-backed.
- Task lifecycle `complete`, `reopen`, `state` and `reassign` is now branch-wired through canonical `/tareas/actions` → `fenix_prod_task_bulk_action_server`.
- The older single-task `/tareas/{task_code}/reassign` → `fenix_prod_reassign_task_server` route is preserved for compatibility.
- Document-detail and signature-detail generic mutations remain `FAIL_CLOSED` unless mapped to an explicit lifecycle contract.
- Appraisal status uses the canonical Gateway status route; unmapped appraisal mutations fail closed.

## Physical backend evidence
`supabase/functions/fenix-app-gateway/index.ts` is the canonical server-side boundary currently visible in this repository. It exposes server RPC-backed routes for expediente create/list/get/update/workspace, task read/lifecycle actions, documents, banking, appraisals, signatures and additional operational resources.

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

### D. Task and expediente action contracts physically demonstrated
Live PROD contains migrations `app_task_bulk_actions_v0` and `app_expediente_bulk_actions_v0` and deployed Edge Functions `fenix-task-actions` and `fenix-expediente-actions`.

`fenix_prod_task_bulk_action_server` physically supports:

- `complete`
- `reopen`
- `state`
- `reassign`

with whole-batch prevalidation, role checks, owner checks, `expected_version` conflict control, audit notes and version increments.

`fenix_prod_exp_bulk_action_server` physically supports `stage` only, also with batch prevalidation, role/owner checks, `expected_version`, stage validation, history, notes and version increments.

The active `fenix-task-actions` v1 is physically deployed with JWT verification and calls `fenix_prod_task_bulk_action_server`. This function is evidence of the backend contract, but the App does not need to call it directly.

### E. Canonical Gateway/App task lifecycle closure on branch
Branch HEAD routes the App task lifecycle through the canonical Gateway boundary:

`App operational action → taskActionsRuntime → POST /tareas/actions → fenix_prod_task_bulk_action_server`

The Gateway preserves the older single-task reassign route for compatibility while adding the generic task lifecycle route. `taskActionsRuntime` remains single-item/fail-closed at the App boundary and forwards `task_code`, `expected_version`, action-specific fields and optional comment to the Gateway.

GitHub Actions run `34956720546` completed `SUCCESS` for branch HEAD `b931db11c3b2a1ce6e6ff7a0094a8f587154ce44`. The job proves:

- `npm ci` PASS;
- canonical App/CRM/Notion routing contract tests PASS;
- TypeScript + Vite build PASS;
- no-PROD-mutation safety gate PASS.

The documentation-followup run `34956908400` also completed `SUCCESS`, proving the same contract/build/no-PROD-mutation gate after the final audit documentation update.

This is branch evidence only. The new Gateway route has **not** been deployed to PROD by this closure.

### F. Resilience / audit evidence
The live `fenix_prod_task_bulk_action_server` prevalidates the entire batch before any mutation and rejects stale `expected_version` values with `409 version_conflict`. That optimistic concurrency contract also prevents an identical retry with the same expected version from silently applying the same mutation twice.

Each accepted task action writes an audit record to `fenix_prod.task_action_notes` with task code, actor, action kind, optional comment and timestamp. The canonical task code is unique in `fenix_prod.tareas`; `task_action_notes` is indexed by `(tarea_code, created_at DESC)`.

Still not demonstrated for this generic task lifecycle path:

- explicit idempotency-key persistence independent of `expected_version`;
- automatic retry/backoff;
- durable outbox/DLQ;
- cross-system `pending_sync` reconciliation with Notion.

Those mechanisms are therefore **not** claimed as HECHO. They are only required if a future explicit cross-system synchronization contract needs them. Generic operational Notion mirroring remains disabled/fail-closed.

## Final branch delta and rollback boundary
The closure branch is exactly **12 commits ahead** of the canonical restoration branch `app-restoration-reconcile-current-main-20260915` and **0 commits behind** it. The closure-specific delta is limited to:

- `.github/workflows/app-crm-notion-sync-closure.yml`
- `docs/APP_CRM_NOTION_E2E_AUDIT_2026-09-15.md`
- `src/OperationalRecordDetail.tsx`
- `src/operationalRecordActions.ts`
- `src/taskActionsRuntime.ts`
- `supabase/functions/fenix-app-gateway/index.ts`
- `tests/app-crm-notion-sync-closure.spec.ts`

Rollback boundary is therefore explicit: the restoration branch HEAD `8c6934d4362c0f1877ee5d45ded6cb92b6026e09` is the pre-closure baseline. No PROD rollback is required because this closure branch has not been deployed.

Against `main`, the closure branch is 46 commits ahead and 0 behind because it includes the previously isolated restoration work plus these 12 closure commits. It must **not** be treated as a tiny standalone patch against `main` without preserving the restoration/promotion sequence.

## Updated status matrix
| Capability | Status | Evidence / reason |
|---|---|---|
| App desktop restoration | HECHO | PR #385 CI: functional, probe, visual, build and rollback bundle green |
| App → canonical Gateway reads | HECHO | PROD compatibility path uses canonical App Gateway |
| Expediente create/update → Gateway | HECHO | Gateway routes + server RPCs |
| Task lifecycle backend contract | HECHO | live `fenix_prod_task_bulk_action_server` + `fenix-task-actions` |
| Task lifecycle through canonical Gateway/App | HECHO EN RAMA | branch route `/tareas/actions`, App runtime mapping and CI green; no PROD deploy |
| Expediente bulk stage backend contract | HECHO | live `fenix_prod_exp_bulk_action_server` + `fenix-expediente-actions` |
| Generic document/signature detail writes | PARCIAL / FAIL_CLOSED | explicit lifecycle mapping still required |
| Specialized PROD Notion transports | HECHO | Ana knowledge/corrections + document intelligence physically demonstrated |
| Generic Gateway/Supabase → Notion operational mirror | NO DEMOSTRADO / DESACTIVADO | no generic transport contract; task drift physically observed |
| Canonical operational source of truth | HECHO | Supabase codes/versions and server contracts govern App state |
| Task action atomicity/concurrency/audit | HECHO | full prevalidation + expected_version + task_action_notes |
| Generic cross-system retry/outbox/reconciliation | PARCIAL / NO REQUERIDO PARA EL CIERRE TRANSACCIONAL | not demonstrated; only needed for explicit future synchronization contracts |
| End-to-end App ↔ CRM transactional closure | HECHO EN RAMA | canonical Gateway/Supabase path contract-tested and build-green |
| End-to-end App ↔ CRM ↔ Notion as one bidirectional state system | NO DEMOSTRADO Y NO ES EL OBJETIVO | systems have different roles; direct state equivalence is contradicted by physical task drift |

## Promotion rule
`SAFE_TO_MERGE=NO` remains unchanged for PR #385 until its own final restoration/promotion gates are explicitly closed.

For this App/CRM/Notion closure branch, the transactional target is now frozen as:

1. App ↔ canonical Gateway ↔ Supabase for CRM state.
2. Notion as specialized knowledge/document/governance and retained legacy provenance where already used.
3. Explicit, entity-scoped synchronization only where a business contract requires it, with canonical ID mapping, idempotency, retry/backoff, pending/dead-letter state, reconciliation and rollback.

## Macroblock closure
- A · Transport audit: HECHO.
- B · Source of truth + IDs: HECHO.
- C · Operation coverage: HECHO EN RAMA.
- D · Resilience/audit: HECHO for App↔CRM transactional scope; cross-system outbox/retry intentionally not claimed.
- E · Generic Notion bridge: NO APLICA / DESACTIVADO by evidence; no generic mirror should be built without an explicit business contract.
- F · CI, documentation and rollback boundary: HECHO.

`MACROBLOQUES_TOTAL=6`
`HECHOS=6`
`RESTANTES=0`
`BLOQUEADO=0`

This closes the App↔CRM transactional synchronization audit/branch work without altering PROD or `main`. The next independent workstream is the PR #385 restoration promotion checklist and responsive/mobile closure; that work must preserve this evidence and must not reinterpret Notion as transactional source of truth.
