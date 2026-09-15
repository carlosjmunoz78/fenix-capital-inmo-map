# Task bulk actions · restoration evidence · 2026-09-14

## Status

- HECHO BACKEND: additive table `fenix_prod.task_action_notes` with RLS fail-closed and no authenticated grants.
- HECHO BACKEND: server-only `public.fenix_prod_task_bulk_action_server(text,jsonb,text,text,text,text)` granted only to `service_role`.
- HECHO BACKEND: Edge Function `fenix-task-actions` v1, `verify_jwt=true`, authenticated actor resolution, max 100 items.
- HECHO REHEARSAL: transactional rollback test completed one controlled task update and rolled the transaction back.
- HECHO UI EN RAMA: Agenda uses canonical `/tareas`, supports multi-select, select-all-visible, state change, shared comment, preview and explicit confirmation.
- HECHO BUILD: commit `89e913479ed3a605d803c4f0fc6be113e22f9bbf`, workflow run `34844222659`, conclusion `success`.
- PENDIENTE PROD UI: PR #380 remains isolated from main; no public App promotion yet.

## Atomicity and concurrency

The server function prevalidates the entire selection before any update. Every task must exist, belong to the actor scope (unless Dirección), and match `expected_version`. A conflict returns 409 before applying the batch. Only after all items pass validation are mutations written.

Supported states: `Activa`, `Pendiente`, `En curso`, `Esperando tercero`, `Completada`, `Cancelada`.

Each successful mutation records the shared comment in `fenix_prod.task_action_notes` with task, actor, action and timestamp. The normal user/client has no direct table access.

## Security evidence

After the migration, Supabase Security Advisor still reports 16 pre-existing authenticated SECURITY DEFINER warnings; the new bulk wrapper is not included because authenticated users cannot execute it directly. `task_action_notes` appears as an intentional RLS-with-no-policy INFO item, matching the fail-closed design used by the rest of `fenix_prod`.

## Rollback

If this feature must be removed, first disconnect the UI/Edge Function, then remove only these additive objects after exporting any note history that must be retained:

```sql
revoke execute on function public.fenix_prod_task_bulk_action_server(text,jsonb,text,text,text,text) from service_role;
drop function if exists public.fenix_prod_task_bulk_action_server(text,jsonb,text,text,text,text);
drop table if exists fenix_prod.task_action_notes;
```

Do not touch `fenix_prod.tareas`, existing task wrappers, App Gateway task routes, or historical task data during rollback.

## CEREBRO App Factory learning

1. Bulk actions must never be a client-side loop with hidden partial success when a single atomic server contract can prevalidate versions first.
2. Every bulk UI must show count, intended mutation and shared comment before confirmation.
3. A shared comment must be persisted as auditable data, not silently discarded or overloaded into an unrelated field.
4. The list used for mutation must expose the same canonical IDs and versions used by the write contract.
5. RLS fail-closed + server-only wrapper is the default pattern for internal bulk mutation surfaces.
