# RSI-RECOVERY-004B · ALWAYS-ON CORE / HOSTLESS CONTROL PLANE

Fecha: 2026-10-08
Estado: DEFINIDO + IMPLEMENTADO EN RECOVERY · PENDIENTE DE EJECUCIÓN POST-MERGE EN DEFAULT BRANCH
Entorno: PREPROD
Coste adicional objetivo: 0 EUR
PROD authority: false
Trading access: false

## Problema corregido

El PC de Carlos NO permanecerá encendido de forma permanente. Por tanto no puede ser dependencia de disponibilidad para `LRN-001`, scheduler, MetaLearn ni supervisor.

El binding Windows construido en `RSI-RECOVERY-004` se conserva como EDGE RUNNER opcional para Browser Bridge, Computer Use y tareas locales cuando exista un equipo disponible. No se elimina ni se promociona a host central.

## Auditoría viva

### GitHub

- El repositorio ya usa GitHub Actions de forma extensiva para gates, factory, discovery y automatización.
- `CEREBRO RSI Learning Outbox Publisher V0` ya define un outbox append-only en rama dedicada `cerebro-rsi-learning-outbox-v0`.
- El outbox está diseñado sin secretos adicionales, sin proveedor de pago y sin autoridad PROD/Trading.

### Supabase PREPROD

- Proyecto PREPROD existente y `ACTIVE_HEALTHY`.
- Existen numerosas Edge Functions CEREBRO/Fénix activas.
- Existe `pg_cron`/scheduler operativo con jobs activos de SEO y Social, incluidos ciclos frecuentes.
- Esta evidencia demuestra que ya hay infraestructura cloud activa y capacidad de trigger.

Decisión: NO cargar el runtime persistente pesado de `LRN-001` en Supabase. Supabase conserva su papel principal de core transaccional y triggers ligeros; no se convierte en almacén de learning pesado ni en daemon de MetaLearn.

## Decisión V0

Implementar el control plane de `LRN-001` como ejecución **hostless/event-driven y periódica** sobre infraestructura ya disponible:

1. GitHub Actions aporta compute efímero.
2. `CEREBRO RSI Learning Outbox Publisher V0` publica evidencia append-only en `cerebro-rsi-learning-outbox-v0`.
3. `CEREBRO RSI Learning Control Plane V0` ejecuta una iteración acotada al recibir un outbox exitoso y además mediante schedule best-effort cada 15 minutos.
4. El estado durable de learning vive separado en `cerebro-rsi-learning-state-v0` bajo `cerebro/runtime/rsi-learning-state`.
5. `runAutoHostIteration()` sincroniza outbox verificado, persiste learning PREPROD, ejecuta horizontes DAILY/WEEKLY/MONTHLY y registra observabilidad MetaLearn.
6. Cada ejecución confirma explícitamente `prod_authorized=false`, `prod_write_authorized=false`, `trading_access=false`, `additional_cost_eur=0`.
7. Solo el subtree de estado durable se añade al commit automático; no se permiten mutaciones arbitrarias del repo.

## Por qué dos ramas de estado

`cerebro-rsi-learning-outbox-v0` y `cerebro-rsi-learning-state-v0` son deliberadamente distintas. El publisher y el learner no compiten escribiendo en el mismo ref, lo que reduce carreras y mantiene separados:

- evidencia de entrada;
- ledger/receipts/heartbeat;
- scheduler/orchestrator;
- resultados de horizontes;
- métricas MetaLearn.

## Semántica de disponibilidad

Este diseño NO se describe como un proceso daemon 24/7. Es un control plane autónomo de ejecuciones acotadas:

- inmediato tras evento de outbox cuando GitHub procesa el `workflow_run`;
- periódico mediante cron best-effort;
- reanudable desde estado durable;
- idempotente;
- independiente de que el PC esté encendido.

No se promete SLA exacto de 15 minutos porque GitHub schedule no es un reloj de tiempo real. Si en una fase futura aparece una necesidad de latencia estricta, el `pg_cron` existente podrá evaluarse como trigger ligero sin trasladar el runtime pesado a Supabase.

## Preservación

No se elimina ni sustituye:

- App Fénix;
- CRM;
- Supabase transaccional;
- Notion;
- WordPress;
- SEO;
- Social;
- Training;
- Browser Bridge;
- Windows EDGE RUNNER;
- Trading.

La migración sigue `CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`.

## Aceptación

Antes de considerar este control plane operativo:

1. workflow contract test GREEN en PR;
2. recovery gate GREEN en exact HEAD;
3. PR #502 reconciliada con gates PREPROD requeridos;
4. merge gradual a `main`;
5. primera ejecución real del control plane desde default branch;
6. creación automática de `cerebro-rsi-learning-state-v0`;
7. persistencia real de estado + segunda ejecución idempotente;
8. evento Skill Factory real → outbox real → LRN real;
9. rollback probado sin tocar PROD.

Hasta entonces el estado correcto es `SOFTWARE_GREEN / HOSTLESS_OPERATION_NOT_YET_PROVEN_ON_MAIN`.

## Próximo bloque

`RSI-RECOVERY-008 · HYG-001 AUDIT-ONLY + SUPERVISOR RECOVERY`: inventario no destructivo de ramas/snapshots/duplicados/artefactos y wiring de supervisor bounded-recovery sobre evidencia, sin borrado automático y sin autoridad PROD.
