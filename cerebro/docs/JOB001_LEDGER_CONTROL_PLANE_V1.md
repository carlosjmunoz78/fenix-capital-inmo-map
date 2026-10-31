# JOB-001 Ledger Control Plane V1

## Estado

PREPROD. Aditivo. Coste adicional: 0 EUR. No autoriza PROD ni Trading.

## Objetivo

Exponer una vista gobernada y sanitizada del ledger/runtime JOB-001 existente para que coordinadores, watchdogs y CEREBRO Console puedan medir saturación real sin inferirla desde GitHub Actions.

La superficie NO crea una segunda cola, NO crea un scheduler y NO crea un segundo daemon. `requestRefill()` delega únicamente en el Work Pump ya existente.

## Contrato Enterprise 360

- target útil por defecto: **360** jobs `runnable + running` cuando exista backlog seguro;
- máximo global: **360**;
- máximo por empresa por defecto: **360**;
- DeepSeek: máximo **8**;
- repo-write: máximo **1**;
- contexto obligatorio: `company_id`, `engine_id`, `environment`, `version`;
- environment permitido: PREPROD;
- Trading: denegado;
- PROD / PROD-write: denegado.

El entitlement vivo verificado para la organización es 360 jobs simultáneos. Ese techo físico no amplía por sí mismo las autoridades sensibles: DeepSeek permanece limitado a 8 y repo-write a 1.

## Continuidad de trabajo después del Mission DAG

El Mission DAG V1 tiene **2.352 unidades únicas** y sigue ejecutándose exactamente una vez. Su agotamiento ya no significa que JOB-001 deba quedarse sin actividad.

El worker sostenido usa dos fuentes ordenadas:

1. mientras exista una unidad única del Mission DAG, ejecuta `mission-derived-useful-work-v1.mjs`;
2. cuando ese DAG se agota, cambia a `continuous-useful-work-factory-v0.mjs` y mantiene el self-refill con mantenimiento, cobertura, deuda, tests, gobernanza, dependencias, documentación, calidad y continuidad.

El fallback continuo no se presenta como un programador general. Si una tarea necesita una capacidad de implementación que no existe, debe permanecer `WAITING_CAPABILITY`; no se sustituye por evidencia ficticia.

## Scopes

- lectura: `cerebro:ledger:read`;
- solicitud de refill: `cerebro:refill:request`.

Fail-closed si falta scope, contexto, heartbeat fresco o coincidencia de empresa.

## Superficies

### `Job001LedgerControlPlaneV1.inspect()`

Lee `DurableJobRuntimeV1.listForContext()` y devuelve conteos por estado y por contexto: `runnable`, `running`, `useful`, `blocked`, `done`, headroom al target y límites.

### `Job001LedgerControlPlaneV1.requestRefill()`

No encola trabajo por su cuenta. Ejecuta una única reconciliación del Work Pump existente y devuelve el antes/después y telemetría de capacidad.

### `readSupervisorHeartbeatV1()` / CLI

Proyecta solo campos sanitizados del `heartbeat.json` ya emitido por el supervisor. Rechaza heartbeat obsoleto, PROD, Trading y `company_id` distinto. El TTL máximo aceptado es **120 segundos**.

`dynamic_concurrency` NO se devuelve completo. La whitelist V1 expone únicamente:

- `target_global_concurrency`;
- `max_global_concurrency`;
- `max_company_concurrency`;
- `max_deepseek_concurrency`;
- `max_repo_write_concurrency`;
- `decision`.

Quedan fuera payloads, prompts, journals, tokens, cookies, auth headers, API keys, storage state, secretos y cualquier filesystem/shell arbitrario.

Ejemplo local PREPROD:

```powershell
$env:CEREBRO_CONTROL_PLANE_SCOPES='cerebro:ledger:read'
node cerebro/runtime/job001-ledger-control-plane-cli-v1.mjs status
```

## Telemetría remota sanitizada V1

La tabla canónica PREPROD es `public.cerebro_job001_telemetry_preprod`, latest-only por `(company_id, engine_id, environment, device_id)`, RLS habilitado, server-side, TTL 120 s, multiempresa, sin históricos pesados, sin PROD ni Trading. Un fallo de publicación es no fatal.

## Supervisor entrypoint V1

`cerebro/runtime/cerebro-supervisor-entrypoint-v1.mjs` envuelve, no sustituye, `cerebro-supervisor-daemon-v0.mjs`.

V1 fija antes de importar V0:

- `CEREBRO_INITIAL_CONCURRENCY=360`;
- `CEREBRO_MAX_CONCURRENCY=360`;
- `CEREBRO_MAX_PER_COMPANY=360`;
- `CEREBRO_MAX_DEEPSEEK_CONCURRENCY=8`;
- `CEREBRO_MAX_REPO_WRITE_CONCURRENCY=1`;
- `CEREBRO_SUPERVISOR_ENV=PREPROD`.

Un límite explícito inferior se conserva como safety cap. V0 sigue siendo el único daemon.

## Instalador Windows PREPROD canónico

Ruta: `cerebro/scripts/install-supervisor-preprod-windows.ps1`.

El instalador conserva backup y rollback, ejecuta smoke aislado sin paid work, exige heartbeat PREPROD con **360/360/360/8/1**, registra el mismo task con `RunLevel Limited`, comprueba heartbeat fresco y restaura la versión anterior automáticamente si algo falla.

## Tests

```bash
node --test cerebro/tests/job001-ledger-control-plane-v1.test.mjs
node --test cerebro/tests/job001-remote-telemetry-v1.test.mjs
node --test cerebro/tests/cerebro-supervisor-entrypoint-v1.test.mjs
node --test cerebro/tests/continuous-worker-job001-control-plane-binding-v1.test.mjs
node --test cerebro/tests/continuous-worker-entitlement-drain-canary-v1.test.mjs
```

Los workflows `CEREBRO JOB-001 Ledger Control Plane V1` y `CEREBRO Runtime Durable Supervisor V0` validan contrato, aislamiento, sanitización, instalador, continuidad post-DAG y límites 360/360/360/8/1.

## Dependencias conservadas

- `DurableJobRuntimeV1`;
- Work Pump existente;
- `DynamicConcurrencyPolicyV1`;
- `cerebro-supervisor-daemon-v0.mjs`;
- task Windows `CEREBRO-Supervisor-PREPROD`;
- Browser Bridge existente.

## OLD vs NEW

**OLD**

- contrato canónico todavía retenía el cap histórico 180;
- worker sostenido terminaba cuando el Mission DAG finito quedaba agotado;
- self-refill publicaba `UNIQUE_MISSION_BACKLOG_EXHAUSTED` y la lane moría.

**NEW PREPROD**

- target/global/company: 360/360/360;
- DeepSeek: 8;
- repo-write: 1;
- Mission DAG mantiene ejecución única, sin replay duplicado;
- al agotarlo, la lane cambia a `continuous-useful-work-factory-v0`;
- self-refill continúa mientras exista esa fuente útil;
- no se crean sleeps, jobs vacíos, segunda cola, segundo scheduler ni segundo daemon.

## Rollback

El instalador restaura árbol y XML previos ante fallo. El runtime V0 se conserva. El cambio Git es reversible mediante revert de la PR. La tabla PREPROD no contiene jobs, payloads ni journal; solo la última proyección sanitizada.

## Gate de promoción

No promover capacidad autónoma nueva a PROD desde esta pieza. Antes de cualquier promoción posterior: contratos, permisos, tests, evaluación, Tribunal, observabilidad, backup/rebuild, rollback probado, coste medido, política y comparación OLD vs NEW.
