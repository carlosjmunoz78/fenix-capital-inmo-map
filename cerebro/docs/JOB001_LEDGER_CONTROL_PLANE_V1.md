# JOB-001 Ledger Control Plane V1

## Estado

PREPROD. Aditivo. Coste adicional: 0 EUR. No autoriza PROD ni Trading.

## Objetivo

Exponer una vista gobernada y sanitizada del ledger/runtime JOB-001 existente para que coordinadores, watchdogs y CEREBRO Console puedan medir saturación real sin inferirla desde GitHub Actions.

La superficie NO crea una segunda cola, NO crea un scheduler y NO crea un segundo daemon. `requestRefill()` delega únicamente en `AdaptiveHierarchicalAgentWorkPumpV3.reconcile()` ya existente.

## Contrato 48/64

- target útil por defecto: **48** jobs `runnable + running` cuando exista backlog seguro;
- máximo global: **64**;
- máximo por empresa por defecto: **48**;
- DeepSeek: máximo **8**;
- repo-write: máximo **1**;
- contexto obligatorio: `company_id`, `engine_id`, `environment`, `version`;
- environment permitido: PREPROD;
- Trading: denegado;
- PROD / PROD-write: denegado.

El target 48 no es una cola nueva ni un número arbitrario: `AdaptiveHierarchicalAgentWorkPumpV3` ya define como rango normal `model_capacity=8 × backlog_multiplier=6 = 48`, con techo 64. Este bloque alinea el control plane y el arranque del supervisor con ese contrato existente.

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

No imprime secretos ni el journal completo.

## Telemetría remota sanitizada V1

La ruta preferente era reutilizar un publisher gobernado ya existente del Browser Bridge 1.4.1. La evidencia viva confirma transporte cloud ONLINE, pero no expone un contrato reutilizable para publicar el heartbeat JOB-001 sin reconstruir el Bridge por memoria.

Por tanto se usa el fallback canónico mínimo permitido por el traspaso:

- tabla PREPROD `public.cerebro_job001_telemetry_preprod`;
- una única fila latest-only por `(company_id, engine_id, environment, device_id)`;
- RLS habilitado;
- acceso server-side solamente (`service_role`); anon/authenticated sin grants de tabla;
- TTL del payload: 120 s;
- multiempresa por clave y contrato;
- coste adicional objetivo: 0 EUR;
- sin históricos pesados ni logs;
- sin PROD ni Trading.

El publisher está en `cerebro/runtime/job001-remote-telemetry-v1.mjs`. Un fallo de publicación es **no fatal**: el supervisor y JOB-001 siguen trabajando localmente.

## Supervisor entrypoint V1

`cerebro/runtime/cerebro-supervisor-entrypoint-v1.mjs` envuelve, no sustituye, `cerebro-supervisor-daemon-v0.mjs`.

Antes de importarlo fija los defaults seguros:

- `CEREBRO_INITIAL_GLOBAL_CONCURRENCY=48`;
- `CEREBRO_MAX_GLOBAL_CONCURRENCY=64`;
- `CEREBRO_MAX_COMPANY_CONCURRENCY=48`;
- `CEREBRO_MODEL_CAPACITY=8`.

Si existe una política más restrictiva (`max_global < 48`), no la supera. Después carga el daemon V0 en el mismo proceso. Si existen referencias server-side a Supabase PREPROD + `device_id`, activa el publisher latest-only dentro del mismo proceso; si faltan, el daemon arranca igualmente.

No existe segundo daemon ni segundo scheduler.

## Tests

```bash
node --test cerebro/tests/job001-ledger-control-plane-v1.test.mjs
node --test cerebro/tests/job001-remote-telemetry-v1.test.mjs
node --test cerebro/tests/cerebro-supervisor-entrypoint-v1.test.mjs
```

El workflow `CEREBRO JOB-001 Ledger Control Plane V1` valida contrato, aislamiento, sanitización, TTL y límites 48/64/48/8/1.

## Dependencias conservadas

- `DurableJobRuntimeV1`;
- `AdaptiveHierarchicalAgentWorkPumpV3`;
- `DynamicConcurrencyPolicyV1`;
- `cerebro-supervisor-daemon-v0.mjs` y su heartbeat existente;
- Browser Bridge 1.4.1 sin reconstruirlo ni sustituirlo.

No se sustituye ninguna de estas piezas.

## OLD vs NEW

**OLD**

- Ledger target: 40;
- max company: 40;
- daemon V0 default inicial: 40;
- heartbeat local solamente;
- `dynamic_concurrency` proyectado completo por el lector Ledger.

**NEW PREPROD**

- Ledger target: 48;
- max company: 48;
- max global: 64;
- DeepSeek: 8;
- repo-write: 1;
- entrypoint V1 fija arranque 48 sin modificar V0;
- `dynamic_concurrency` se proyecta por whitelist;
- telemetría remota latest-only, TTL 120 s, server-side y no fatal.

## Rollback

Rollback de runtime: volver a arrancar directamente `cerebro-supervisor-daemon-v0.mjs`; no requiere borrar ni modificar V0.

Rollback de Git: revertir el PR de este bloque.

Rollback de almacenamiento PREPROD, solo si ya no existe ningún consumidor y después de snapshot/verificación:

```sql
DROP TABLE public.cerebro_job001_telemetry_preprod;
```

La tabla no contiene jobs, payloads ni journal; solo la última proyección sanitizada.

## Gate de promoción

No promover capacidad autónoma nueva a PROD desde esta pieza. Antes de cualquier promoción posterior: contratos, permisos, tests, evaluación, Tribunal, observabilidad, backup/rebuild, rollback probado, coste medido, política y comparación OLD vs NEW.
