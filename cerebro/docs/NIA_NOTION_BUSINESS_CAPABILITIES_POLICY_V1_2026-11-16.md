# CEREBRO OS · NIA · Notion Business Capability Policy V1

> Documentation-only, additive, no new engine, no runtime automation, no PROD changes. Date: 2026-11-16. Additional cost target: EUR 0.

## Naming and ownership

- The native Notion AI assistant is named **NIA · Asistente de Notion**. This name is intentionally distinct from all existing CEREBRO agents and interfaces.
- NIA is a helper using Notion Business features, not the CEREBRO control plane, a replacement for a worker or an authority for decisions.
- CEREBRO/Gateway remains the policy/orchestration boundary. App/CRM/Supabase remains transactable system of record; GitHub retains code/contracts; runtime/workers execute ordinary jobs. Trading remains isolated.
- Do not create a new engine ID or a second CRM/scheduler. Reuse existing DOC/KNW/INT/FINOPS/FACT owners subject to their live contracts.

## Physical evidence (Notion connection, 2026-11-16)

- Notion skill created: https://app.notion.com/p/41a81b1a756d815ab877f0d264a6a0d4
- NIA policy/finops/operations runbook: https://app.notion.com/p/41a81b1a756d81ba8a0ffafe84554824
- Existing Notion AI instructions page renamed and updated: https://app.notion.com/p/55e81b1a756d83038626016963610cb6
- The skill is enabled, **use_automatically=true**, **use_in_connected_agents=true**, **show_in_chat=true** (verified via Notion connector). This enables relevant Notion-connected assistants to load it; it does **not** install a scheduler or prove that the CEREBRO Gateway executes it automatically.
- Owner connected their ChatGPT plan in native Notion settings with **Utiliza el plan de ChatGPT=ON** and **Usar el plan de Notion como respaldo=OFF**. A specific GPT selection uses ChatGPT allocation; Auto uses Notion Standard.
- Snapshot only: 5/1500 Standard credits used; 0/500 Select used; workspace 0/300 Notion credits used. Billing origin of 300 workspace credits is not established.
- Workspace default extra credits for members displayed **Sin acceso**; default limit for Custom Autofill/Workers displayed **Sin límite**, so do not start paid variants before auditing.
- Native Notion search demonstrated source-grounded document research in two reports. Existing Custom Agent recurring sessions show zero tool calls and zero credits in sampled logs; do not infer useful automatic work.

## Decision procedure for eligible work

1. Check if a real user/system request is within Notion scope: document search, knowledge hygiene, research, meetings, reusable instructions, or an event generated in Notion.
2. Determine source of truth, company_id, engine_id, environment, version, data classification and permissions. Read live contracts when possible.
3. Check whether CEREBRO already does the work. If yes, return NOOP for Notion unless it has measurable added value.
4. Prefer existing deterministic Notion properties/formulas/views, Basic Autofill with existing fields, and read-only MCP retrieval. For reasoning within Notion choose a specific GPT model with connected ChatGPT plan where practical; otherwise use included Standard/Select cautiously and monitor per-seat limits.
5. Do not silently use purchased/shared workspace credits. Keep fallback OFF, no automatic purchases, no unbounded Custom Agent/Worker actions.
6. For a new external event/webhook: inventory existing routes and consumers, authenticate source, minimize payload, dedupe/idempotence, correlation_id, observable logs, rollback, negative test, cost check, PREPROD/isolated LAB, tribunal then gradual promotion. No direct webhook-to-PROD write.
7. For each candidate, report HECHO/EXISTENTE/PARCIAL/DEFINIDO/PLANIFICADO/POR AUDITAR, evidence URL, delta vs existing capability, cost, tests and rollback. No evidence = no claim of autonomy.

## Use cases by category

| Category | Suitable Notion contribution | Restrictions |
|---|---|---|
| Knowledge | Summarize, compare, tag new non-sensitive documents; keep canonical GitHub contracts separate | Do not certify without evidence or overwrite history |
| Research | One-off comparative studies and verified recommendations | Do not duplicate persistent scouts or let output auto-promote |
| Skills | Load reusable NIA selection skill automatically when relevant; share via enabled MCP settings | Automatic skill availability is not ongoing autonomous execution |
| Meetings | Generate notes, decisions and action proposals with appropriate notice/consent | No automatic CRM entries or customer communications |
| Autofill | Basic Autofill for existing fields if supported; use separate proposed/approved properties | Do not use Custom Agent Autofill or Workers with unrestricted shared credit |
| Notion events | Optional native webhook to existing Gateway after contract and tests | No direct sensitive writes or duplicate Make flow |
| Images/Web/CRM | No new pipelines | Current engines and WordPress remain owners |

## Acceptance and states

- [x] One canonical name NIA established in instructions and reference artifacts.
- [x] Notion skill created, enabled and available for automatically relevant use in Notion-connected agents.
- [x] Historical Notion instructions corrected to avoid treating legacy Notion CRM/task tables as the transactable source of truth.
- [x] Runbook recorded in existing Notion intelligence center.
- [ ] Native Notion AI **Personalización → Nombre** renamed from previous UI value; current connector cannot mutate this setting. Owner must perform the single UI change.
- [ ] CEREBRO Gateway physical consumption of this skill/decision policy with observability, cost, fail-closed and rollback. Document-only PR does not implement this.
- [ ] Billing/credit origin of 300 shared credits and Workers/Autofill policy fully checked.
- [ ] Concrete MCP/webhook LAB E2E acceptance; none enabled by this PR.

## Safe fallback and reversal

- Notion skill can be disabled without deleting documentation; existing CEREBRO services are unaffected.
- Revert this documentation-only PR independently; do not merge before policy/ownership review. Notion page content is versioned by Notion and retains its prior history.
- No new recurring tasks, engines, payments, publication or production permissions.

## Canonical technical reference

- https://github.com/carlosjmunoz78/fenix-capital-inmo-map/blob/main/cerebro/registry/engine-registry.v1.json
- https://app.notion.com/p/40181b1a756d81828153d4104ae5f792
- https://app.notion.com/p/3be81b1a756d81ffa0a9f9444009b7df