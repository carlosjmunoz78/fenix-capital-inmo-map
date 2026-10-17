# CEREBRO OS · Universal Skill Activation Factory V1 · RUNBOOK

## Contexto
Repo: `carlosjmunoz78/fenix-capital-inmo-map`
Branch: `cerebro/universal-skill-activation-factory-v1-20261017`
PR: `#784`
Último código certificado: `e346c57bd177c62b151ed3de33e90d27c3d3f4da`
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
Estado: HECHO PREPROD sobre código certificado `e346c57...`.

Providers Auto Engineering disponibles: finance, math, software engineering, systems, data y security.

Reglas obligatorias:
- Para fuentes `*-live-reconciliation.vN.json`, consumir solo el item exacto de la candidata legacy.
- Si el estado del item contiene deuda real (`DEFINED_NOT_BUILT`, `SIMULATION_ONLY`, `LIVE_AUDIT_REQUIRED`, `SCAFFOLD_PLAN`, `NOT_PROMOTED`, `PHYSICAL_*_REQUIRED`), mantener `ENGINEERING_TASK_REQUIRED`; el provider de familia no puede fabricar evidencia.
- Provider disponible no es una afirmación FULL.
- Vista terminal estricta: `FULL_REAL | ABSORBED | REJECTED | BLOCKED_EXTERNAL | HUMAN_REQUIRED`.
- `ENGINEERING_TASK_REQUIRED` y estados parciales siguen no terminales.

## B16 · Current evidence reconciliation
Antes de programar un App Factory, Website Builder o provider Web/SEO:
1. leer evidencia actual de FACT-001/APPBOOT-001 y el estado legacy correspondiente;
2. reconciliar reporting stale sin borrar v2/v3 históricos;
3. preservar trabajo físico ya probado (PWA/STAGING/APK) y no repetirlo;
4. mantener separado cualquier gate físico todavía no demostrado (p. ej. instalación/render Android autorizado);
5. medir deuda real repetible de `web-wordpress-frontend` / `seo-search-content`;
6. reutilizar SEO-001, WordPress, App/CRM/Supabase y contratos existentes; ningún provider nuevo por conveniencia.

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
