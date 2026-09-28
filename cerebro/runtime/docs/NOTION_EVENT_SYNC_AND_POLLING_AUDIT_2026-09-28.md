# NOTION_EVENT_SYNC_AND_DUPLICATE_POLLING_REDUCTION · 2026-09-28

## Estado
PARCIALMENTE CERRADO en rama de trabajo. El diseño/event trigger y validación CI están verdes; la escritura automática real a Notion se activa únicamente tras push a la rama canónica `preprod-app-phase1` o `workflow_dispatch(apply=true)`.

## Fuente de verdad
- Git/FACT-001 sigue siendo source of truth del Engine Registry.
- `human-exception-queue-2026-09-07.json` sigue siendo source of truth de excepciones humanas abiertas versionadas.
- Notion actúa como mirror/control plane humano. No autoriza runtime ni PROD.

## Implementación
Se añadió `cerebro/runtime/notion_control_plane_sync.py`:
- solo stdlib Python;
- usa el secreto GitHub existente `NOTION_TOKEN`;
- upsert idempotente;
- nunca borra filas;
- no contiene secretos;
- fail-closed ante códigos HUMAN_REQUIRED no canónicos;
- normaliza estados no reconocidos a `UNKNOWN_REQUIRES_AUDIT`.

Targets Notion:
- Engine Registry mirror: data source `f9051714-19e2-462f-ac2b-c85837a672d9`.
- Human Exception Queue visible: data source `66843d2a-4e67-40f9-93d0-a66ea091d436`.

## Trigger
Workflow `.github/workflows/cerebro-notion-control-plane-sync.yml`:
- PR → tests + dry-run solamente.
- push a `preprod-app-phase1` con cambios de Registry/HEX/sync → apply automático.
- workflow_dispatch → apply solo si se solicita explícitamente.
- concurrency/cancel-in-progress evita runs superseded.
- coste adicional 0 €.

## Evidencia CI
Run `CEREBRO Notion Control Plane Sync #1`:
- validate: SUCCESS.
- deterministic contract tests: SUCCESS.
- dry-run plan: SUCCESS.
- sync: SKIPPED correctamente por tratarse de un PR.

En el mismo head:
- FACT-001 Factory V0: SUCCESS.
- FACT-001 App Compatibility: SUCCESS.
- FACT-001 RLS PREPROD: SUCCESS.

## Auditoría de polling Notion
1. Engine Registry / HUMAN_REQUIRED:
   - antes: no existía sync event-driven canónico;
   - nuevo: path-trigger GitHub → Notion;
   - decisión: NO crear polling periódico.

2. `social-t72-watchdog`:
   - definición conserva lógica determinista;
   - job 25 permanece staged pero retirado de `enabled_job_ids`;
   - no existe polling activo demostrado desde JOB-001;
   - no borrar hasta sustituir por evento/automatización Notion o timer CEREBRO probado.

3. `seo-gsc-notion-sync`:
   - mantiene frecuencia semanal existente;
   - NO es reporting duplicado: GSC es fuente externa temporal y requiere captura periódica;
   - conservar.

4. `src/notionRuntime.ts`:
   - request-time adapter, no scheduler;
   - cache GET ya introducida en FINOPS wave1;
   - no retirar.

5. GitHub synced databases / connected PR properties:
   - AI Search solo encuentra documentación que las propone;
   - no se encontró evidencia de una synced database física;
   - estado: POR AUDITAR, no sustituye el mirror actual.

## OLD vs NEW
OLD:
- mirrors parciales/manuales;
- riesgo de deriva entre Git y Notion;
- posibilidad futura de resolver con polling redundante.

NEW:
- Git conserva autoridad;
- Notion recibe upserts idempotentes solo cuando cambia el contrato;
- PR nunca escribe;
- cambios canónicos generan una sola sincronización;
- ningún delete automático;
- sin SaaS nuevo ni coste adicional.

## Rollback
1. Deshabilitar/eliminar únicamente `cerebro-notion-control-plane-sync.yml`.
2. Revertir `notion_control_plane_sync.py` y su test.
3. Notion conserva las filas ya visibles; no se borran ni alteran sistemas transaccionales.
4. Git Registry y HEX source-of-truth quedan intactos.

## Gate pendiente
Antes de declarar HECHO completo:
- aplicar una sincronización real mediante push canónico o workflow_dispatch autorizado;
- comprobar conteos/duplicados en Notion;
- verificar que ningún registro ajeno fue tocado.

No requiere intervención humana mientras se mantenga el PR DRAFT; el apply ocurrirá de forma natural al promover el cambio canónico.
