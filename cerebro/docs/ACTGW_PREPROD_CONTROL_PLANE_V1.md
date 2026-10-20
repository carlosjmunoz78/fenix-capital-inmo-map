# CEREBRO · ACTGW-001 PREPROD CONTROL PLANE V1

Estado: CANDIDATO EN RAMA, NO PROD
Empresa: multiempresa por `company_id`
Entorno: PREPROD
Coste adicional objetivo: 0 EUR

## Objetivo

Cerrar el gap entre CEREBRO Console y ejecución real de capacidades seguras sin convertir Console en ejecutor directo y sin habilitar escrituras PROD.

Ruta objetivo:

`Console -> ACTGW-001 -> capability registrada -> auditoría -> resultado`

## Baseline verificado antes del cambio

- `cerebro/console/gateway.mjs` ya permite registrar comandos, mantiene contexto y auditoría, pero no enlaza por sí solo un runtime de acciones.
- `cerebro/registry/console-v0.json` declara dependencia de `ACTGW-001` y marca `action_execution.status = PARTIAL_BINDING_REQUIRED`.
- La rama histórica `cerebro-action-gateway-v0-20260911` contiene un ACTGW plan-only con `executed:false`.
- `cerebro/runtime/owner-executor-capability-registry.v0.json` no debe interpretarse como prueba de ejecución actual general; la promoción de este candidato requiere evidencia nueva.

## Implementación candidata

### `cerebro/gateway/action-gateway-v1.mjs`

- PREPROD-only.
- Ejecuta únicamente capabilities registradas explícitamente en memoria.
- Requiere `company_id`, `engine_id`, `environment`, `version`.
- Requiere autorización explícita por acción.
- Bloquea PROD writes, autonomous PROD y trading.
- Bloquea coste adicional > 0 EUR.
- Bloquea riesgo HIGH y firmas obligatorias mediante `HUMAN_REQUIRED`.
- Mantiene idempotencia y auditoría.
- Falla cerrado ante capability desconocida.

### `cerebro/console/action-gateway-binding-v1.mjs`

- Registra el comando `action.execute` en Console V0.
- Convierte el contexto seleccionado de Console al contexto técnico de `ACTGW-001` sin cambiar `company_id`, `environment` ni `version`.
- Console continúa siendo interfaz/gateway de órdenes, no ejecutor de capacidades.

## HUMAN_REQUIRED permitido

Únicamente:

- LEGAL_REQUIRED
- SIGNATURE_REQUIRED
- LOW_CONFIDENCE
- HIGH_RISK
- POLICY_CONFLICT
- SECURITY_INCIDENT
- MONEY_LIMIT
- CUSTOMER_HUMAN_REQUEST

## Tests candidatos

`cerebro/tests/action-gateway-v1.test.mjs` cubre:

1. ejecución real PREPROD de capability registrada LOW;
2. idempotencia sin doble ejecución;
3. capability desconocida -> LOW_CONFIDENCE;
4. bloqueo de PROD/trading/firma/HIGH/coste > 0;
5. recorrido E2E lógico Console -> ACTGW -> capability.

## Pasos de promoción

1. Ejecutar test Node del bloque.
2. Ejecutar suite CEREBRO relevante y build existente.
3. Revisar diff y confirmar que no modifica PROD ni credenciales.
4. Comparar OLD vs NEW: histórico ACTGW plan-only frente a V1 executable PREPROD.
5. Tribunal/evaluación del candidato.
6. Merge gradual sólo si CI está GREEN.
7. Actualizar capability registry y estado `PARTIAL_BINDING_REQUIRED` únicamente después de evidencia en main.
8. Registrar runbook, changelog y evidencia de rollback.

## Rollback

Antes del merge: cerrar PR / borrar rama candidata.
Después del merge: revertir el commit/PR del bloque. No existe migración destructiva ni cambio de datos.

## Fuera de alcance de V1

- Escrituras PROD.
- Auto-merge.
- Trading.
- Credenciales nuevas.
- Suscripciones nuevas.
- Ejecución arbitraria de shell/código.

Este bloque es una capa de control ejecutable segura, no una autorización general de producción.
