# CEREBRO Browser 1 · Fase 2 · Capacidad, aislamiento y rollback

Fecha: 2026-10-23
Rama: `cerebro/browser1-phase2-orchestrator-v1`
Entorno validado: `PREPROD`
Estado de promoción a PROD: **NO PROMOVIDO**

## Estado

- **HECHO**: Browser 1 serial V1 permanece conservado y operativo como rollback.
- **HECHO**: Orquestador V2 desplegado en paralelo en PREPROD.
- **HECHO**: Cola V2 separada de V1.
- **HECHO**: locking exclusivo por `browser_profile_id` / one-writer-per-profile.
- **HECHO**: cuotas por empresa y departamento.
- **HECHO**: idempotencia de benchmark por `run_id + run_attempt`.
- **HECHO**: cancelación, heartbeat, lease, retries y métricas V2.
- **HECHO**: autenticación de workers por GitHub Actions OIDC.
- **HECHO**: 0 secretos registrados en los benchmarks.
- **HECHO**: coste incremental medido = 0 €.
- **PARCIAL**: broker de credenciales V2 no promovido; la función V2 mantiene `credential_materialization_v2=false`.
- **PLANIFICADO**: promoción gradual a PROD solo tras completar credential broker, OLD vs NEW, canary y rollback probado en el flujo de producción.

## Capacidad física validada

### Distribuido 4

- 4 Browser 1 reales en paralelo.
- 2 empresas y 4 departamentos/perfiles aislados.
- Resultado: GREEN.

### Pool único 8

GitHub Actions run: `39987189978`, attempt 1.

- `stage_concurrency`: 8
- `seeded`: 8
- `successful`: 8
- `no_job`: 0
- `rejected`: 0
- duración total: 15.235 s
- pico de memoria del contenedor: 1,089,679,360 bytes (~1.09 GB)
- secretos registrados: no
- coste incremental: 0 €
- rollback serial V1 preservado: sí

Resultado: **GREEN**.

### Pool único 16

GitHub Actions run: `39987396238`, attempt 1.

- `stage_concurrency`: 16
- `seeded`: 16
- `successful`: 16
- `no_job`: 0
- `rejected`: 0
- duración total: 18.018 s
- pico de memoria del contenedor: 1,696,112,640 bytes (~1.70 GB)
- secretos registrados: no
- coste incremental: 0 €
- rollback serial V1 preservado: sí

Resultado: **GREEN de laboratorio**.

## Límite operativo decidido

Aunque 16 simultáneos han pasado físicamente, el benchmark no expone un límite duro de memoria del runner (`container_memory_limit_bytes=null`). Por seguridad y margen operativo:

- PREPROD `global_max_concurrent = 8`
- PREPROD `default_company_max_concurrent = 4`
- PREPROD `default_department_max_concurrent = 2`
- PROD V2 permanece `enabled = false`

**Capacidad probada de laboratorio: 16.**
**Techo operativo inicial recomendado: 8.**

## Estado de cola tras QA

- PREPROD V2: 152 `SUCCEEDED`.
- PREPROD V2: 8 `CANCELLED` conservados como evidencia de QA/benchmarks antiguos.
- PREPROD V2: 0 `QUEUED`.
- leases de perfil activos: 0.
- V1 permanece presente; no fue sustituido.

## Aislamiento

Un job V2 incluye como mínimo:

- `company_id`
- `engine_id`
- `department_id`
- `environment`
- `version`
- `browser_profile_id`
- `identity_id`
- `account_id`

La exclusión por perfil impide dos writers simultáneos sobre la misma sesión/perfil. Las cuotas evitan que una empresa o departamento monopolice el pool.

## Rollback

Rollback inmediato de Fase 2:

1. Deshabilitar V2 en `cerebro_browser_orchestrator_config_v2` para el entorno afectado.
2. Dejar de enviar nuevos jobs a `cerebro_browser_job_v2`.
3. Esperar/cancelar leases V2 activos de forma auditable; no borrar registros.
4. Volver a enrutar ejecución a Browser 1 serial V1.
5. Verificar cola V1, ejecución serial y ausencia de leases V2 activos.

Fase 2 no requiere eliminar ni modificar destructivamente la V1 para hacer rollback.

## Gate de promoción a PROD

No promover hasta tener en verde:

- broker de credenciales V2 con materialización efímera y sin fuga;
- OLD vs NEW sobre tareas representativas de producción;
- canary gradual;
- rollback ejecutado y medido;
- observabilidad y alertas;
- límites de capacidad fijados por host/runtime real;
- tests de aislamiento multiempresa y multidepartamento;
- cancel/retry/dead-letter;
- coste medido;
- tribunal/evaluación de CEREBRO;
- política de HUMAN_REQUIRED aplicable.

## Regla de promoción

`CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`

Nunca sustituir V1 por V2 de golpe.
