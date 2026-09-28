# MAKE-001 · FinOps migration matrix · 2026-09-28

Status: AUDITED / PARALLEL MIGRATION REQUIRED / DO NOT BULK-DISABLE

Goal: reduce Make recurring dependence without breaking Fénix workflows.

## Live environment

- Organization: My Organization (4010217)
- Team: My Team (1927480)
- Current plan baseline already documented separately: Core, 10,000 credits/month.
- Scenario folders: AUDITORÍA/LEGACY, TEST, PROD, CORE/INTELIGENCIA, PREVENTIVO/RECUPERACIÓN, ALERTAS/MONITORIZACIÓN.

## High-value scheduled consumers found

| Scenario | Trigger | Observed credits/run | Approx cadence | Candidate replacement |
|---|---|---:|---|---|
| FENIX · CORE · Reconciliación universal · V1.1 | scheduled | 5 | every 2h | CEREBRO/Hostinger deterministic worker |
| FENIX · CORE · Redes · Watchdog T-72/T-48 · V1.1 | scheduled | 2 | hourly | Notion-native timing/webhook or CEREBRO event/delta |
| FÉNIX · PROD · SEO · GSC 30d → Inventario Notion · V2 | scheduled | 142–150 recent runs | weekly | CEREBRO GSC -> Notion adapter |
| FENIX · MASTER · Facebook · Control y analítica sin publicación · V1 | scheduled | 12 | daily | CEREBRO social analytics worker |
| FÉNIX · PROD · SEO · GA4 páginas 30d · Vigilancia semanal · V2 | scheduled | 1 | weekly | CEREBRO/GA4 read-only |
| FÉNIX · PROD · SEO · Search Console · Vigilancia semanal · V1 | scheduled | 1 | weekly | merge into GSC worker / SEO engine |

## Immediate safe action completed

Scenario 9840775 `TEMP CEREBRO · direct official executor` was ACTIVE daily at 03:00,
calling only the WordPress ability `fenix-core-guard/health/run`.

It is now **INACTIVE, NOT DELETED**.

Reason:
- it was explicitly temporary;
- its function is a read-only Core Guard health probe;
- SEO JOB-001 now has Hostinger-owned WP bridge probe/reconcile scheduling;
- deactivation is immediately reversible;
- no configuration/history/connection was deleted.

Expected avoided usage: one Make credit/day while it remains inactive.

Rollback: reactivate scenario 9840775.

## Detailed findings

### Reconciliación universal
Reads four records from Make Data Store 171764 and overwrites one reconciliation record.
No AI, no external API, no publication. This is a strong zero-cost migration candidate,
but cannot be switched off until its Data Store dependency is replicated or retired.

### Watchdog T-72/T-48
Every hour queries Notion data source e5158816-4ddd-4888-b768-130466420477 for:
- Estado publicación = Pendiente de publicar
- T-48 aprobado = false
- Recordatorio T-72 enviado = false
- Programación relacionada not empty

When a record enters the <=72h future window, it PATCHes:
- Recordatorio T-72 enviado = true
- Aviso T-72 = fixed warning text

This is polling. Prefer a Notion/CEREBRO event/timer design before disabling Make.

### GSC -> Notion
Weekly Search Console page-level metrics; each result queries Notion by URL and PATCHes
Clics, Impresiones, CTR, Posición media and Fecha última captura.
Recent runs cost 142–150 credits each. This is one of the highest-value migrations.

### Facebook master
Daily Notion + Make Data Store + Facebook read-only analytics/reconciliation.
Current Facebook connection reports status=expiring.
Do not disable until the replacement has authenticated Facebook read access,
idempotency, OLD-vs-NEW comparison and Notion write parity.

## Notion capabilities relevant to replacement

Notion paid-plan database automations support recurring triggers and webhook actions.
Integration webhooks can notify CEREBRO of page/database changes in real time.
Use these to replace polling where semantics permit.

Important limitation: recurring database automation triggers cannot use Edit property as
their action, so some time-relative watchdogs may still need webhook -> CEREBRO or a
bounded scheduler.

## Migration order

1. Remove proven redundant TEMP scheduled jobs. [started]
2. Reconciliación universal -> CEREBRO deterministic worker.
3. Watchdog -> Notion event/timer + webhook/CEREBRO.
4. Consolidate duplicate GSC weekly work into one CEREBRO/SEO path.
5. Move Facebook analytics only after connection/contract parity.
6. Recalculate Make credits over at least one stable observation window.
7. Downgrade/cancel Make only after actual usage fits the target and rollback is proven.

No scenario in this matrix should be deleted during migration.


## Reconciliación universal · cut-over 2026-09-28

Scenario 9527242 `FENIX · CORE · Reconciliación universal · V1.1` is now
**INACTIVE, NOT DELETED**.

Evidence before deactivation:
- scheduled every 2 hours;
- exactly 5 credits per run;
- four sampled runs across 26→28 Sep produced the same semantic reconciliation
  output; only run_id/first_seen_at/last_seen_at changed;
- the four source records themselves were old/stable (router/log/capture/quality
  last-seen values from July);
- no external API, AI, publication or Notion mutation exists in the scenario;
- it reads four Make Data Store records and overwrites one Make Data Store record.

A deterministic replacement contract now exists in:
- `cerebro/runtime/make_reconciliation_shadow.py`
- `cerebro/runtime/tests/test_make_reconciliation_shadow.py`

Expected avoided Make consumption: 12 runs/day × 5 credits = **60 credits/day**,
approximately **1,800 credits per 30 days** while inactive.

Rollback: reactivate Make scenario 9527242. No record, connection, blueprint or history
was deleted.

Remaining caveat: the Make Data Store is still a legacy state source for other scenarios.
Do not delete Data Store 171764 until its producers/consumers are fully mapped and migrated.


## T-72/T-48 watchdog · replacement prepared

The exact decision contract from Make scenario 9705138 is now modeled in:
- `cerebro/runtime/notion_t72_watchdog.py`
- `cerebro/runtime/tests/test_notion_t72_watchdog.py`

Parity preserved:
- publication status must be `Pendiente de publicar`;
- T-48 must be false;
- T-72 reminder must be false;
- schedule relation must exist;
- scheduled time must be in the future and <=72h;
- update is idempotent once `Recordatorio T-72 enviado=true`.

The Make scenario remains ACTIVE for now because its replacement transport/write path is
not yet live. Do not deactivate it until CEREBRO has an authenticated Notion read/write
path and OLD-vs-NEW evidence.

Current Make behavior burns 2 credits every hour even when no row is eligible. Recent
executions observed 2 credits/run with no downstream update. At that steady rate the
polling baseline is ~48 credits/day or ~1,440 credits/30d before useful work.

Target replacement: Notion event/webhook -> CEREBRO deterministic T-72 rule -> scoped
Notion PATCH, with a bounded timer only for time-window entry when no edit event occurs.


## Facebook master · interim schedule reduction 2026-09-28

Scenario 9533690 remains ACTIVE but its schedule was reduced from 86400s (daily) to
604800s (weekly).

Evidence:
- sampled runs 08/09, 14/09, 21/09, 25/09 and 28/09 all consumed 12 credits;
- the semantic result was the same idempotency state: BLOCKED_EXISTING_WINDOWS;
- recent runs made no Facebook GetPost/GetReactions/ListComments calls;
- the only recurring side effect was overwriting an informative Make Data Store record;
- Facebook connection status is currently expiring.

Expected Make usage changes from ~360 credits/30d to ~52 credits/30d, avoiding roughly
~308 credits/30d while the weekly schedule remains.

Rollback: restore interval 86400s. Scenario, modules, connections, history and Data Store
remain intact.

Do not deactivate yet: it still acts as a fallback for future new Facebook publication
analytics until an event-driven CEREBRO replacement has OLD-vs-NEW parity.


## Active-scenario count and downgrade constraint

Current live Make inventory returned **24 active scenarios**.

Therefore Make Free is not yet a viable target even if monthly credits fall below 1,000:
the current baseline previously recorded for Free allows only 2 active scenarios.

Cost and scenario-count migration are separate workstreams.

### Reversible deactivation candidates (not yet changed)

The following active on-demand SEO probes/pilots show only one-off Sep-20/21 usage,
several with failed legacy payloads, and no repository references were found for their
scenario IDs:

- 9839477 · WordPress ability registry probe
- 9839480 · Core Guard cache ability probe
- 9839504 · Snapshot piloto Jaén
- 9839517 · Publicar piloto Jaén
- 9839530 · Purga piloto Jaén
- 9839532 · Verificar piloto Jaén
- 9839543 · Comparar Córdoba vs Jaén
- 9839546 · Normalizar piloto Jaén
- 9839555 · Ajustar template piloto Jaén
- 9839622 · Cowboy update-post probe

They remain ACTIVE until dependency review is complete. Their deactivation would be
reversible and would preserve configuration/history, but no bulk action is authorized
without the dependency check.

Keep active for now:
- 9839632 WordPress city executor
- 9839483 image generation/upload
- 9839491 visual image QA
- 9694039 Google bridge fallback
because current/future SEO automation can still depend on them.
