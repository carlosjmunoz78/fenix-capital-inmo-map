# CEREBRO OS · Universal Skill Activation Factory V1 · RUNBOOK

## Contexto
Repo: `carlosjmunoz78/fenix-capital-inmo-map`
Branch: `cerebro/universal-skill-activation-factory-v1-20261017`
PR: `#784`
Último código certificado: `0ba248c812ed21b2ddbea1f2b2010357615159c9`
Entorno autorizado: `PREPROD`.

## Inicio / reanudación
1. Leer HANDOFF, MASTER, RUNBOOK y state.
2. Comprobar únicamente HEAD de branch, PR #784 y CI exact-head.
3. Si el HEAD es descendiente documental del `certified_code_head_sha`, validar solo el delta documental/CI afectado; no reconstruir auditorías cerradas.
4. Entrar directamente en `next_block`.

## Gates de la Factory
- provenance/license
- fingerprint + content-addressed dedupe
- capability/domain classification
- canonical engine mapping
- exact semantic contract
- safe wrapper/adapter
- real semantic/physical binding según contrato
- OLD vs NEW
- QA/EVA/independent Tribunal
- LRN/OBSERV/FINOPS
- backup/rollback/rebuild
- idempotency / durable resume

## Fast Lane industrial
Entrada normal: 10-50+ candidatas, concurrencia acotada por `concurrency` y `max_jobs`.

Reglas:
- `fail_fast=false` entre candidatas independientes.
- Express/standard no esperan a un bloqueo deep ajeno.
- Duplicado exacto por fingerprint/content hash se absorbe sin repetir planner.
- Preparación durable se cachea por fingerprint de análisis.
- Baseline OLD se cachea por `engine_version|environment|contract_hash`.
- Blueprint de familia adapter se cachea; **nunca** omite revalidación del binding real.
- JOB-001 mantiene idempotencia, lease/retry/checkpoint semantics.
- Worker-thread solo cuando el payload/adapters son clonables; si no, fallback inline veraz y `parallel_execution_proven=false`.
- No afirmar paralelismo si no existen al menos 5 candidatas reclamadas y 5 workers activos en la prueba inicial.
- Cache, batch y binding permanecen PREPROD/0 €/no Trading/no PROD.

## B15 · Family coverage y terminal truth
Estado: HECHO PREPROD.

Providers Auto Engineering disponibles: finance, math, software engineering, systems, data y security.

Reglas obligatorias:
- Para fuentes `*-live-reconciliation.vN.json`, consumir solo el item exacto de la candidata legacy.
- Si el estado del item contiene deuda real (`DEFINED_NOT_BUILT`, `SIMULATION_ONLY`, `LIVE_AUDIT_REQUIRED`, `SCAFFOLD_PLAN`, `NOT_PROMOTED`, `PHYSICAL_*_REQUIRED`), mantener `ENGINEERING_TASK_REQUIRED`; el provider de familia no puede fabricar evidencia.
- Provider disponible no es una afirmación FULL.
- Vista terminal estricta: `FULL_REAL | ABSORBED | REJECTED | BLOCKED_EXTERNAL | HUMAN_REQUIRED`.
- `ENGINEERING_TASK_REQUIRED` y estados parciales siguen no terminales.

## B16 · Current evidence + Web/SEO debt
Estado: HECHO PREPROD sobre código certificado `0ba248c812ed21b2ddbea1f2b2010357615159c9`.

Resultado:
- 184 items reconciliados item-scoped.
- Web/WordPress/frontend: 17 candidatas / 7 deudas de ingeniería.
- SEO/search/content: 30 candidatas / 19 deudas de ingeniería.
- Recomendación: `NO_NEW_WEB_SEO_PROVIDER_JUSTIFIED` hasta existir contrato genérico de ejecución + binding semántico demostrados.
- Item 183 conserva su gate físico Android pendiente; no hay falso FULL.
- Runner B16 alineado de Node 20 a Node 24.x, que es el engine raíz del repo.
- No se excluyeron tests, no se añadieron dependencias y no se relajaron gates.
- Exact-head: 11/11 workflows GREEN.

## B17 · Browser automation + physical gates
Estado: EN CURSO / POR AUDITAR.

Procedimiento obligatorio:
1. Inventariar primero Browser Bridge, `authorized-execution-device-profile`, repair workflow, contratos y evidencia física existentes.
2. No fabricar un browser provider nuevo si el mecanismo actual cubre la capacidad.
3. Separar `config/profile/binding declared` de `physical evidence observed`; configuración sola no certifica acción real.
4. Reutilizar pruebas históricas solo si siguen aplicando al contrato/adapter actual; registrar branch/head/time cuando sean relevantes.
5. Ejecución PREPROD bounded/fail-closed: sin arbitrary shell, sin PROD/public mutation, sin customer data, sin Trading, sin dependencia externa nueva por defecto.
6. Para `FULL_REAL` / `FULL_SAFE_PREPROD` action-capable exigir prueba física PREPROD del binding pertinente.
7. Si la superficie física no puede observarse desde el runner disponible, no falsear GREEN físico: mantener residual verificable como `BLOCKED_EXTERNAL` o `HUMAN_REQUIRED` solo si aplica uno de los ocho motivos canónicos.
8. Cerrar con targeted tests, full CEREBRO regression y exact-head CI; conservar rollback/rebuild/observabilidad.

## Telemetría mínima
Por candidata: `queue_wait_ms`, `manifest_ms`, `scan_ms`, `sandbox_ms`, `adapter_ms`, `tests_ms`, `ci_wait_ms`, `eval_ms`, `human_wait_ms`, `activation_ms`.

Si una etapa aún no tiene reloj independiente, se registra `null` y aparece en `unmeasured_fields`; nunca se fabrica una duración.

Métricas batch: p50/p95 activation, batch wall time, serial activation sum, parallel efficiency, human touches/skill, skill-specific code changes, content/preparation/baseline/adapter-family cache ratios, regression rate, idempotent rerun rate y distribución terminal.

## Tests principales
- `node --test cerebro/tests/universal-skill-*.test.mjs`
- `node --test cerebro/tests/cerebro-technical-specialists-v1.test.mjs`
- `node --test cerebro/tests/cerebro-math-solver-profile-v1.test.mjs`
- Full: `node --test cerebro/tests/*.test.mjs`

Certificación Fast Lane exige además:
- blind synthetic multi-family: >=10 primarias, >=5 concurrentes, dedupe y rerun idempotente;
- blind real catalog: >=5 concurrentes, resultados iguales a la verdad legacy, **sin falso FULL** por metadata;
- full CEREBRO regression exact-head.

## Anti-loop
Ante fallo: evidencia exacta -> clasificar causa -> una variable -> test enfocado -> regresión afectada/full -> documentar. Tras tres fallos equivalentes, cambiar estrategia estructural.

## Seguridad
- No direct-main write.
- No auto-merge.
- No PROD mutation/publish/deploy.
- No raw external skill code execution sin contrato futuro explícito.
- No dependencias/instalaciones silenciosas.
- No gasto incremental automático.
- Trading aislado.
- HUMAN_REQUIRED únicamente: LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST.

## Rollback
Cambios permanecen en branch/PR hasta promoción gobernada. Revertir el commit defectuoso o restaurar su parent exacto; nunca corregir alterando PROD. Reejecutar tests y reconstruibilidad.

El binding mantiene backup/rollback/rebuild por candidata. La caché Fast Lane solo guarda plan/scheduling y metadatos de contratos/baselines; puede eliminarse y reconstruirse sin pérdida de autoridad ni estado transaccional.

## Continuidad
Actualizar HANDOFF/MASTER/RUNBOOK/state después de cambios arquitectónicos o antes de saturación. Mantener HECHO/PARCIAL/POR AUDITAR, code SHA certificado, CI, next_block y restricciones reales.

## Comunicación
Trabajar continuamente, sin usar al usuario como conductor. Solo hitos relevantes y muy breves. Un rojo ordinario se corrige sin interrumpir. Escalar únicamente HUMAN_REQUIRED real o una decisión estratégica nueva.
