# RSI-RECOVERY-005 · REAL EVENT WIRING

Fecha: 2026-10-08
Estado: SOFTWARE_GREEN / MAIN_ACTIVATION_PENDING / PHYSICAL_HOST_PENDING
Entorno: PREPROD
Coste adicional objetivo: 0 EUR
PROD authority: false
Trading access: false

## Objetivo

Eliminar el paso manual de entregar JSON al learning worker y construir un camino autónomo, auditado e idempotente desde la evidencia real de Skill Factory hasta `LRN-001`, sin elevar autoridad ni depender de Supabase, Make, ChatGPT Scheduler o credenciales nuevas.

## EXISTENTE conservado

`CEREBRO Skill Discovery Scout` ya genera `artifacts/cerebro-skill-improvement-events.json`, valida el shadow bridge actual y sube el evento como evidencia inmutable dentro del artifact `cerebro-skill-discovery-<run_id>`.

Los eventos Skill existentes permanecen como propuestas `GLOBAL_ONLY`, no publican PROD y preservan el boundary actual de Skill Supply Chain. No se modifica el contrato de descubrimiento para darle escritura persistente.

## HECHO

### 1. Registry de suscriptores LRN

`cerebro/registry/rsi-learning-subscribers.v0.json`

- `environment=PREPROD`;
- `engine_id=LRN-001`;
- suscripción Fénix explícita y tenant-scoped;
- local validation obligatoria;
- default para nuevas empresas = `DISABLED` hasta registro explícito;
- `prod_authorized=false`;
- `prod_write_authorized=false`;
- `trading_access=false`;
- coste adicional 0 EUR.

### 2. Tenant fan-out + outbox append-only

`cerebro/runtime/rsi-event-outbox.mjs`

Camino:

`GLOBAL_ONLY Skill event -> tenant-local PREPROD event -> immutable LRN batch -> company outbox index`

Propiedades:

- IDs deterministas por `company_id + origin_event_id`;
- preserva `origin_event_id` y `origin_company_id`;
- batch estable por tenant + source run/head;
- SHA-256 por batch;
- append-only;
- rerun idéntico = no-op;
- mismo batch con contenido distinto = conflicto fail-closed;
- evento tenant-specific nunca se fan-out a otro tenant;
- no PROD / no Trading / no coste adicional.

### 3. Publisher autónomo después de Skill Discovery

`.github/workflows/cerebro-rsi-learning-outbox-publisher-v0.yml`

- escucha `workflow_run` del `CEREBRO Skill Discovery Scout`;
- solo admite run `success` de `main`;
- descarga exactamente `cerebro-skill-discovery-<source_run_id>`;
- verifica source workflow, source branch y source HEAD;
- transforma solo `cerebro-skill-improvement-events.json`;
- serializa escrituras con concurrency única;
- guarda únicamente outbox LRN en rama dedicada `cerebro-rsi-learning-outbox-v0`;
- no modifica `main`, App, CRM, Supabase, WordPress, SEO, Notion, Training ni Trading;
- no consume secretos de proveedor ni API de pago.

La separación entre workflow read-only de descubrimiento y workflow writer de outbox es deliberada para no ampliar la autoridad del Scout.

### 4. Cliente remoto zero-credential

`cerebro/runtime/rsi-outbox-client.mjs`

- solo HTTPS;
- únicamente `raw.githubusercontent.com`;
- path fijado a la rama dedicada de outbox;
- sin token ni credencial nueva;
- descarga `index.json` tenant-scoped;
- valida contexto `company_id/LRN-001/PREPROD`;
- verifica SHA-256 antes de escribir;
- bloquea traversal;
- verifica tenant y autoridad de cada batch/evento;
- 404 antes de la primera publicación = estado vacío seguro;
- batch ya descargado idéntico = no-op;
- conflicto local = fail-closed.

### 5. Auto host

`cerebro/runtime/rsi-learning-auto-host.mjs`

Cada iteración PREPROD hace:

`remote outbox sync -> local inbox -> existing LRN host cycle -> shadow bridge -> policy/security gate -> local durable learning ledger`

El kill switch local impide también el pull remoto.

Los fallos remotos transitorios se toleran dos veces. El tercer fallo idéntico cambia estrategia a `HOLD_REMOTE_OUTBOX_SAME_ERROR_FAMILY`, cumpliendo el protocolo anti-loop.

### 6. Windows binding actualizado

`Install-CerebroLrn001Host.ps1` instala ahora la versión `0.5.0` y arranca `rsi-learning-auto-host.mjs`.

El remote outbox se configura sin credenciales y con URL restringida al branch/path dedicado. Se mantienen snapshot previo, rollback, Task Scheduler AtStartup, SYSTEM, restart acotado, heartbeat, backup, restore y kill switch.

## CI / aceptación de software

Gate RSI ampliado con pruebas de:

- fan-out multiempresa;
- aislamiento tenant;
- append-only / idempotencia;
- checksum/tamper;
- path traversal;
- zero-credential remote client;
- remote -> inbox -> LRN durable sin JSON manual;
- kill switch;
- anti-loop remoto;
- publisher workflow authority boundaries;
- Windows binding autónomo.

Durante el primer gate se detectaron dos fallos de expectativa de test, no de runtime: los contadores del host estaban correctamente dentro de `last_result` y un test confundía la palabra `trading_access=false` con autoridad Trading. Se corrigieron únicamente esas expectativas. El rerun del bloque completo quedó GREEN.

## PARCIAL / NO AFIRMADO

- El publisher workflow está construido en la recovery branch pero no puede considerarse operativo recurrente hasta estar reconciliado/promovido a `main`; `workflow_run` de producción del repositorio depende de la definición del default branch.
- La rama de estado `cerebro-rsi-learning-outbox-v0` todavía no se marca como evidencia viva de producción del outbox hasta que el publisher se active desde `main`.
- El PC Windows sigue pendiente de aceptación física `RSI-RECOVERY-004`.
- No se afirma aprendizaje 24/7 real todavía.
- No se autoriza PROD.

## OLD vs NEW funcional

OLD:
`Skill Discovery -> improvement-events.json -> shadow in-memory -> fin del ciclo`

NEW PREPROD candidato:
`Skill Discovery -> immutable artifact -> tenant outbox -> zero-credential client -> local inbox -> LRN worker -> durable ledger`

OLD se conserva hasta promoción. NEW no sustituye el camino existente mientras PR #502 siga DRAFT.

## Rollback

- deshabilitar/no promover publisher;
- detener Windows Scheduled Task o activar kill switch;
- conservar outbox batches, receipts, ledger y backups;
- volver al shadow in-memory sin pérdida del comportamiento previo;
- no requiere revertir App/CRM/Supabase/SEO/WordPress/Notion/Training.

## Next block

`RSI-RECOVERY-006 · AUTONOMOUS LEARNING ORCHESTRATOR`

Unificar EVENT / DAILY / WEEKLY / MONTHLY para learning + MetaLearn + supervisor, manteniendo límites de intentos, juez independiente, no self-promotion y coste adicional 0 EUR.
