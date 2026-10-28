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

La ruta preferente es reutilizar un publisher gobernado ya existente del Browser Bridge 1.4.1. La evidencia viva confirma transporte cloud ONLINE, pero la superficie recuperada todavía no expone un contrato de publicación JOB-001 reutilizable sin reconstruir el Bridge por memoria.

El fallback canónico mínimo ya está preparado en PREPROD:

- tabla `public.cerebro_job001_telemetry_preprod`;
- una única fila latest-only por `(company_id, engine_id, environment, device_id)`;
- RLS habilitado;
- acceso server-side solamente; anon/authenticated sin grants de tabla;
- TTL del payload: 120 s;
- multiempresa por clave y contrato;
- coste adicional objetivo: 0 EUR;
- sin históricos pesados ni logs;
- sin PROD ni Trading.

El publisher está en `cerebro/runtime/job001-remote-telemetry-v1.mjs`. Un fallo de publicación es **no fatal**: el supervisor y JOB-001 siguen trabajando localmente.

**Regla de credenciales:** no colocar una `service_role` nueva en el PC por comodidad. El publisher remoto solo se activa cuando el host ya dispone de una referencia server-side autorizada o cuando el Browser Bridge exponga un transporte gobernado reutilizable. La alineación 48/64 no depende de esa credencial.

## Supervisor entrypoint V1

`cerebro/runtime/cerebro-supervisor-entrypoint-v1.mjs` envuelve, no sustituye, `cerebro-supervisor-daemon-v0.mjs`.

V0 consume estos nombres de entorno y V1 los fija antes de importarlo:

- `CEREBRO_INITIAL_CONCURRENCY=48`;
- `CEREBRO_MAX_CONCURRENCY=64`;
- `CEREBRO_MAX_PER_COMPANY=48`;
- `CEREBRO_MAX_DEEPSEEK_CONCURRENCY=8`;
- `CEREBRO_MAX_REPO_WRITE_CONCURRENCY=1`;
- `CEREBRO_SUPERVISOR_ENV=PREPROD`.

Si existe un `CEREBRO_MAX_CONCURRENCY` explícitamente más restrictivo que 48, V1 no lo supera y deriva de él el límite por empresa. En el despliegue canónico 48/64 el instalador valida físicamente 48/64/48/8/1.

El publisher se arma **antes** de importar V0 porque el daemon tiene top-level await y es long-lived. V0 sigue siendo el único daemon; el publisher usa un timer del mismo proceso. Si faltan referencias autorizadas para telemetría remota, V0 arranca igualmente.

## Instalador Windows PREPROD canónico

Ruta: `cerebro/scripts/install-supervisor-preprod-windows.ps1`.

El instalador:

1. conserva el task `CEREBRO-Supervisor-PREPROD` y exporta su XML antes de cambiarlo;
2. crea backup del `cerebro` actualmente instalado;
3. copia el árbol nuevo de forma paralela;
4. ejecuta un smoke **aislado y coste 0** con Work Pump, repo sandbox y telemetría remota deshabilitados;
5. exige heartbeat smoke PREPROD con 48/64/48/8/1 y PROD/Trading false;
6. registra el mismo task con `RunLevel Limited`, apuntando al entrypoint V1;
7. espera heartbeat **fresco real** del task y vuelve a exigir 48/64/48/8/1;
8. si algo falla, restaura app anterior + XML del task anterior automáticamente.

El state root vuelve a coincidir con el default histórico de V0: `%LOCALAPPDATA%\CEREBRO\SupervisorRuntime`. No se crea un segundo journal.

## Tests

```bash
node --test cerebro/tests/job001-ledger-control-plane-v1.test.mjs
node --test cerebro/tests/job001-remote-telemetry-v1.test.mjs
node --test cerebro/tests/cerebro-supervisor-entrypoint-v1.test.mjs
```

Los workflows `CEREBRO JOB-001 Ledger Control Plane V1` y `CEREBRO Runtime Durable Supervisor V0` validan contrato, aislamiento, sanitización, ordering del publisher, nombres de entorno V0, instalador y límites 48/64/48/8/1.

## Dependencias conservadas

- `DurableJobRuntimeV1`;
- `AdaptiveHierarchicalAgentWorkPumpV3`;
- `DynamicConcurrencyPolicyV1`;
- `cerebro-supervisor-daemon-v0.mjs` y su heartbeat existente;
- task Windows `CEREBRO-Supervisor-PREPROD`;
- Browser Bridge 1.4.1 sin reconstruirlo ni sustituirlo.

No se sustituye ninguna de estas piezas.

## OLD vs NEW

**OLD**

- Ledger target: 40;
- max company: 40;
- daemon V0 default inicial: 40;
- instalador apuntaba directamente a V0;
- smoke y scheduled task no validaban físicamente 48/64/48/8/1;
- heartbeat local solamente;
- `dynamic_concurrency` proyectado completo por el lector Ledger.

**NEW PREPROD**

- Ledger target: 48;
- max company: 48;
- max global: 64;
- DeepSeek: 8;
- repo-write: 1;
- entrypoint V1 configura los nombres de entorno que V0 realmente consume;
- publisher se arma antes del daemon long-lived;
- instalador canónico conserva el task existente y verifica heartbeat fresco 48/64/48/8/1;
- `dynamic_concurrency` se proyecta por whitelist;
- fallback remoto latest-only, TTL 120 s, server-side y no fatal.

## Rollback

Rollback físico del instalador: si la prueba live falla, el script restaura automáticamente el árbol anterior y el XML anterior de `CEREBRO-Supervisor-PREPROD`.

Rollback manual del runtime: volver a arrancar directamente `cerebro-supervisor-daemon-v0.mjs`; V0 no se elimina ni se modifica para conseguir 48/64.

Rollback de Git: revertir el PR del bloque.

Rollback de almacenamiento PREPROD, solo si ya no existe ningún consumidor y después de snapshot/verificación:

```sql
DROP TABLE public.cerebro_job001_telemetry_preprod;
```

La tabla no contiene jobs, payloads ni journal; solo la última proyección sanitizada.

## Gate de promoción

No promover capacidad autónoma nueva a PROD desde esta pieza. Antes de cualquier promoción posterior: contratos, permisos, tests, evaluación, Tribunal, observabilidad, backup/rebuild, rollback probado, coste medido, política y comparación OLD vs NEW.
