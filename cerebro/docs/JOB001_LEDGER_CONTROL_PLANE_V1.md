# JOB-001 Ledger Control Plane V1

## Estado

PREPROD. Aditivo. Coste adicional: 0 EUR. No autoriza PROD ni Trading.

## Objetivo

Exponer una vista gobernada y sanitisada del ledger/runtime JOB-001 existente para que coordinadores, watchdogs y CEREBRO Console puedan medir saturación real sin inferirla desde GitHub Actions.

La superficie NO crea una segunda cola, NO crea un scheduler y NO crea un daemon. `requestRefill()` delega únicamente en `AdaptiveHierarchicalAgentWorkPumpV3.reconcile()` ya existente.

## Contrato de capacidad

- target útil inicial: 40 jobs `runnable + running` cuando exista backlog seguro;
- máximo global: 64;
- máximo por empresa por defecto: 40;
- DeepSeek: máximo 8;
- repo-write: máximo 1;
- contexto obligatorio: `company_id`, `engine_id`, `environment`, `version`;
- environment permitido: PREPROD;
- Trading: denegado.

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

Proyecta solo campos sanitisados del `heartbeat.json` ya emitido por el supervisor. Rechaza heartbeat obsoleto, PROD, Trading y `company_id` distinto.

Ejemplo local PREPROD:

```powershell
$env:CEREBRO_CONTROL_PLANE_SCOPES='cerebro:ledger:read'
node cerebro/runtime/job001-ledger-control-plane-cli-v1.mjs status
```

No imprime secretos ni el journal completo.

## Tests

```bash
node --test cerebro/tests/job001-ledger-control-plane-v1.test.mjs
```

El workflow `CEREBRO JOB-001 Ledger Control Plane V1` valida contrato, aislamiento y límites.

## Dependencias conservadas

- `DurableJobRuntimeV1`;
- `AdaptiveHierarchicalAgentWorkPumpV3`;
- `DynamicConcurrencyPolicyV1`;
- `cerebro-supervisor-daemon-v0.mjs` y su heartbeat existente.

No se sustituye ninguna de estas piezas.

## Rollback

Rollback exacto: revertir el commit/PR que añade:

- `cerebro/runtime/job001-ledger-control-plane-v1.mjs`;
- `cerebro/runtime/job001-ledger-control-plane-cli-v1.mjs`;
- `cerebro/tests/job001-ledger-control-plane-v1.test.mjs`;
- `.github/workflows/cerebro-job001-ledger-control-plane-v1.yml`;
- este documento.

Como V1 es aditivo y no modifica el journal ni el supervisor, el rollback no requiere migración de datos.

## Gate de promoción

No promover capacidad autónoma nueva a PROD desde esta pieza. Antes de cualquier promoción posterior: contratos, permisos, tests, evaluación, Tribunal, observabilidad, backup/rebuild, rollback probado, coste medido, política y comparación OLD vs NEW.
