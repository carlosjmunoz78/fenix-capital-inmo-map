# CEREBRO MISSION DAG V1 · PREPROD

## Estado

PREPROD_CANDIDATE. No sustituye ni detiene `CEREBRO Continuous Useful Worker V1`.

## Objetivo

Cerrar la pieza `MISSION -> RECURSIVE DECOMPOSITION -> DAG -> WORK UNITS -> CAPABILITY GATES -> EXECUTION ROUTING -> EVIDENCE` para las 28 raíces canónicas M01-M28.

## Conservación

Baseline main: `33ea122a9c09fa71d81dc4f2598225bb0cf69bcd`.

OLD permanece intacto:
- `cerebro/runtime/continuous-useful-work-factory-v0.mjs`
- `.github/workflows/cerebro-cloud-useful-continuous-worker-v1.yml`
- watchdog/refill existente.

NEW vive en rama PREPROD paralela `cerebro/mission-dag-v1-preprod-20261029`.

## Contrato V1

Cada work unit conserva `mission_id`, `work_unit_id`, `parent_id`, `company_id`, `engine_id`, `environment`, `version`, `route_class`, `dependencies`, `priority`, `risk`, `idempotency_key`, `source_fingerprint`, `acceptance_criteria`, `evidence_required`, coste y guards de seguridad.

La descomposición estándar por misión contiene 14 paquetes de fase. Cada paquete se descompone en seis unidades atómicas. Resultado esperado para 28 raíces: 2.772 work units totales, 2.352 unidades atómicas y 168 work units dedicados a capability audit/ensure/test/evaluate/register/unblock.

## Capabilities

Las capacidades son dependencias de primer nivel. La secuencia es:

`audit -> ensure-if-missing -> test -> evaluate -> register -> unblock`.

`ensure-if-missing` prohíbe reinstalar/recrear una capacidad ya GREEN.

## Seguridad

- Environment PREPROD obligatorio.
- `paid_ai_allowed=false`.
- `prod_write_allowed=false`.
- `trading_access=false`.
- coste adicional objetivo 0 EUR.
- deduplicación e idempotencia obligatorias.
- cycle detection obligatorio.
- PROD se rechaza desde el propio runtime.

## Fuente canónica de las 28 raíces

Authority: `CEREBRO_OS_TRASPASO_TOTAL_FULL_V2_2026-10-28/28_MACROFRENTES.md`.

Los IDs M01-M28 están fijados. El texto nominal completo del artefacto no está embebido en el repositorio en este cambio y no se inventa. Por ello existe un gate de `scope hydration`: antes de ejecutar implementación específica de una misión hay que resolver su alcance canónico y fingerprint. La generación del DAG y los preflights pueden ejecutarse ya; el runtime no debe fingir que un scope no hidratado está implementado.

## OLD vs NEW

OLD fabrica auditorías útiles rotativas por lane/cycle. NEW fabrica un backlog trazable a misión con DAG, dependencias, capabilities, evidencia y promoción. La estrategia de promoción prevista es `mission-derived queue first -> OLD deterministic audit factory as safe fallback`, nunca reemplazo destructivo.

## Tests y aceptación

Gate mínimo:
- exactamente 28 raíces únicas;
- >= 2.000 work units;
- >= 2.000 atomic units;
- exactamente 168 capability work units;
- cero IDs duplicados;
- cero idempotency keys duplicadas;
- dependencias resolubles;
- DAG acíclico;
- fingerprint estable para mismo input;
- rechazo explícito de PROD;
- cero paid AI / PROD writes / Trading.

El workflow PREPROD añade además 28 preflight workers, uno por raíz, para verificar físicamente su paquete de 99 work units sin tocar PROD.

## Rollback / rebuild

Rollback: cerrar o borrar la rama PREPROD. OLD sigue intacto en main.

Rebuild: recrear el DAG desde `mission-roots-v1.json` + runtime V1; mismo input debe producir el mismo `graph_fingerprint`.

## Siguiente gate

1. obtener GREEN físico del workflow PREPROD;
2. hidratar el texto canónico de cada M01-M28 sin inventar alcance;
3. conectar work units READY a un dispatcher durable con lease/heartbeat/retry/dead-letter;
4. consumir primero tareas read-only/deterministas y capability audits;
5. comparar OLD vs NEW;
6. solo después plantear promoción gradual.
