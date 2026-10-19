# CEREBRO OS · Universal Skill Activation Factory V1 · RUNBOOK

## Contexto
Repo: `carlosjmunoz78/fenix-capital-inmo-map`
Branch: `cerebro/universal-skill-activation-factory-v1-20261017`
PR: `#784`
Último código certificado: `a7df20aefca134086329273e9ee2be2aa3b6dd4a`
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
- Si el estado del item contiene deuda real, mantener `ENGINEERING_TASK_REQUIRED`; el provider de familia no puede fabricar evidencia.
- Provider disponible no es una afirmación FULL.
- Vista terminal estricta: `FULL_REAL | ABSORBED | REJECTED | BLOCKED_EXTERNAL | HUMAN_REQUIRED`.
- `ENGINEERING_TASK_REQUIRED` y estados parciales siguen no terminales.

## B16 · Current evidence + Web/SEO debt
Estado: HECHO PREPROD.

Resultado:
- 184 items reconciliados item-scoped.
- Web/WordPress/frontend: 17 candidatas / 7 deudas de ingeniería.
- SEO/search/content: 30 candidatas / 19 deudas de ingeniería.
- `NO_NEW_WEB_SEO_PROVIDER_JUSTIFIED` hasta existir contrato genérico de ejecución + binding semántico demostrados.
- Node 24.x alineado con el engine raíz; sin test exclusions, dependencias nuevas ni gate weakening.

## B17 · Browser automation + physical gates
Estado: HECHO PREPROD en gobernanza; residual físico actual `BLOCKED_EXTERNAL`.
Código certificado: `a7df20aefca134086329273e9ee2be2aa3b6dd4a`.
CI certificado: B17 #2 + exact-head 12/12 GREEN.

Reglas y resultado:
- Reutilizar Browser Transversal Autonomy, Authorized Execution Device Profile, Identity Session Lifecycle, Credential Lifecycle y Physical Adapter Audit; no crear provider/engine duplicado.
- `config/profile/binding declared` no es prueba física.
- `FULL_REAL/FULL_SAFE_PREPROD` action-capable requiere atestación fresca + observación física bounded/fail-closed en LAB/PREPROD.
- Observación válida: kill-switch visto, coste 0, sin PROD/public mutation, Trading ni customer data; campos inesperados se rechazan.
- La ruta sintética certifica lógica del gate, no disponibilidad física actual.
- El contexto de orquestación actual no puede observar la superficie física autorizada del Browser Bridge, por lo que el estado actual permanece `BLOCKED_EXTERNAL / PHYSICAL_EVIDENCE_PENDING` y `human_required=null`.
- Este residual es local y no bloquea trabajo independiente.

## B18 · LRN measured engineer outcome loop
Estado: EN CURSO / POR AUDITAR.

Procedimiento obligatorio:
1. Inventariar y reutilizar LRN, Safe Engineering, OLD vs NEW, QA/EVA/JDG, observabilidad y rollback existentes; no crear motor nuevo.
2. Elegir una fixture PREPROD determinista, sin datos cliente ni Trading, con baseline medible y un defecto/mejora concreta.
3. Generar evidencia medible del baseline y un artefacto LRN trazable que derive una decisión de ingeniería concreta.
4. Aplicar el cambio solo por el gate de ingeniería gobernada, reversible y acotado.
5. Medir post-cambio con exactamente la misma métrica/contrato; ejecutar OLD vs NEW.
6. Exigir evaluator/Tribunal independiente del código que propone/aplica el cambio.
7. Si NEW no mejora o regresa cualquier guardrail, rollback y registrar aprendizaje de rechazo; no promover.
8. Si mejora sin regresión, exigir evidencia de siguiente ciclo para demostrar que el learning alimenta la próxima decisión y no es metadata ornamental.
9. No aceptar plan-only, self-judging, synthetic-only ni `learning_artifact_created=true` como prueba suficiente.
10. Cerrar con targeted tests, full CEREBRO regression y exact-head CI.

## Telemetría mínima
Por candidata: `queue_wait_ms`, `manifest_ms`, `scan_ms`, `sandbox_ms`, `adapter_ms`, `tests_ms`, `ci_wait_ms`, `eval_ms`, `human_wait_ms`, `activation_ms`.

Si una etapa aún no tiene reloj independiente, se registra `null` y aparece en `unmeasured_fields`; nunca se fabrica una duración.

Métricas batch: p50/p95 activation, batch wall time, serial activation sum, parallel efficiency, human touches/skill, skill-specific code changes, content/preparation/baseline/adapter-family cache ratios, regression rate, idempotent rerun rate y distribución terminal.

## Tests principales
- `node --test cerebro/tests/universal-skill-*.test.mjs`
- `node --test cerebro/tests/cerebro-technical-specialists-v1.test.mjs`
- `node --test cerebro/tests/cerebro-math-solver-profile-v1.test.mjs`
- Full: `node --test cerebro/tests/*.test.mjs`

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

## Continuidad / SUPERLOOP
Trabajar continuamente: `EJECUTA -> PRUEBA -> CORRIGE -> VUELVE A PROBAR -> DOCUMENTA -> SIGUE`.
No pedir permiso para acciones seguras/reversibles en LAB/PREPROD y no detenerse tras commits, CI, docs o errores reparables.
Comunicar solo hitos importantes o ~20–30 min con: `HECHO: ... AHORA: ... BLOQUEO: ninguno.` y continuar sin esperar respuesta.
Detenerse únicamente por HUMAN_REQUIRED canónico.
Antes de saturación, actualizar HANDOFF/MASTER/RUNBOOK/state con estado, rama, HEAD, commits, tests/CI, archivos, decisiones, next_block, problemas y estas reglas.
