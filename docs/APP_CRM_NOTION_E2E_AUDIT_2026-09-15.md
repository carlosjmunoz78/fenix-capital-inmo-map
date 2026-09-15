# APP ↔ CRM ↔ Notion · E2E audit checkpoint · 2026-09-15

## Scope
Read-only/branch-safe audit for `app-crm-notion-sync-closure-20260915`.
No `main` mutation, no PROD deployment, no database/customer-data mutation, no legacy RPC revoke.

## Proven on this branch
- PROD operational detail no longer falls through to `fenix-notion-actions-test`.
- PROD reads use the canonical App Gateway compatibility layer.
- Expediente create/update are gateway-backed.
- Task reassign is gateway-backed through `/tareas/{task_code}/reassign` → `fenix_prod_reassign_task_server`.
- Task `state`, `complete` and `reopen` are deliberately `FAIL_CLOSED` until a physical canonical backend contract exists.
- Document-detail and signature-detail generic mutations remain `FAIL_CLOSED` unless mapped to an explicit lifecycle contract.
- Appraisal status uses the canonical Gateway status route; unmapped appraisal mutations fail closed.

## Physical backend evidence
`supabase/functions/fenix-app-gateway/index.ts` is the canonical server-side boundary currently visible in this repository. It exposes server RPC-backed routes for expediente create/list/get/update/workspace, task read/reassign, documents, banking, appraisals, signatures and additional operational resources.

The current repository does **not** contain a production Notion transport implementation identifiable by `api.notion.com`, `NOTION_TOKEN`, or `fenix-notion-bridge` code search. This is an evidence statement about the repositories currently connected to this audit, not proof that no external Make/Notion automation exists elsewhere.

## Notion workspace evidence
The connected Notion workspace contains:
- the active Fénix Capital architecture documentation stating the target flow `Usuario → app.fenixcapital.es → Frontend → API/backend → Supabase/Notion/automatizaciones → CEREBRO/Ana`;
- an explicit rule that the final App must consume a backend/API rather than direct Notion UI links;
- historical safe test pages for a `Fénix Notion Bridge` used only for non-operational archive/restore validation;
- governance stating automation is not production-green until physical permissions, execution, transport, idempotency, retries, rollback/contingency and reconciliation are tested.

These Notion pages prove historical/architectural intent and the existence of test-era bridge validation material. They do **not** prove that the current canonical PROD App Gateway writes are mirrored to Notion.

## Status matrix
| Capability | Status | Evidence / reason |
|---|---|---|
| App desktop restoration | HECHO | PR #385 CI: functional, probe, visual, build and rollback bundle green |
| App → canonical Gateway reads | HECHO | `notionRuntime.ts` PROD compatibility path uses `fetchAppApi` |
| Expediente create/update → Gateway | HECHO | `appRpcCompat.ts` / Gateway routes |
| Task reassign → Gateway | HECHO | physical route + server RPC |
| Task state/complete/reopen | PARCIAL / FAIL_CLOSED | no physical canonical contract demonstrated |
| Generic document/signature detail writes | PARCIAL / FAIL_CLOSED | explicit lifecycle mapping required |
| Gateway/Supabase → Notion physical mirror | POR_AUDITAR | no current transport implementation/evidence found in connected repos |
| Idempotent Notion reconciliation | POR_AUDITAR | architecture requires it; runtime evidence absent |
| End-to-end App ↔ CRM ↔ Notion | PARCIAL | cannot be promoted to HECHO from routing evidence alone |

## Promotion rule
`SAFE_TO_MERGE=NO` for any claim of full App↔CRM↔Notion closure until the physical transport is identified and its owner, direction, identifiers, idempotency key, retry/backoff, dead-letter/pending state, reconciliation and rollback/contingency are demonstrated.

## Next executable step
1. Inventory external transports already in use (Make/native Notion/webhook/other existing integration) before creating anything.
2. Identify owner and direction for each entity: expedientes, tareas, responsible/owner, status/lifecycle, critical fields.
3. If an existing transport is found, wrap and test it; do not replace it.
4. If no current transport exists, design a parallel zero-additional-cost outbox/reconciliation layer without modifying PROD until contract + tests + rollback are green.
