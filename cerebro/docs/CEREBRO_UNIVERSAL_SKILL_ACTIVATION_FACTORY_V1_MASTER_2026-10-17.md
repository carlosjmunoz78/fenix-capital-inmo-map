# CEREBRO UNIVERSAL SKILL ACTIVATION FACTORY V1 · MASTER

Fecha 2026-10-17 · Issue #780 · PR #784 draft · Branch `cerebro/universal-skill-activation-factory-v1-20261017` · LAB/PREPROD · PROD NO TOCAR · coste adicional 0 EUR.

## Objetivo
Efecto operativo tipo Cloud: una skill/repositorio/URL entra y CEREBRO la convierte automáticamente en capacidad funcional en sus motores relevantes, o devuelve un estado terminal preciso, sin integración artesanal individual.

Pipeline: `INGEST → PROVENANCE/LICENSE → DISCOVERY → DEDUPE → DOMAIN/ENGINE PLAN → SAFE ENGINEERING → ADAPTER → REAL SEMANTIC BINDINGS → OLD VS NEW → QA/EVA/TRIBUNAL → LRN/OBS/AUDIT/FINOPS → BACKUP/ROLLBACK/REBUILD → PHYSICAL PREPROD WHEN REQUIRED → TERMINAL STATE`.

Terminales: FULL_SAFE_PREPROD/FULL_REAL, ABSORBED, REJECTED, BLOCKED_EXTERNAL, HUMAN_REQUIRED. FULL exige evidencia real, no catálogo/scaffold/wrapper.

## Arquitectura preservada
Safe Engineering es brazo técnico de FACT; JOB-001 es runtime durable; Planner usa Capability Signals + Engine Registry; contratos semánticos son por dominio; adapter factory acepta solo evidencia segura/exacta; B4 aplica OLD vs NEW/Tribunal/LRN/telemetría/rollback; FACT Skill Native hace registro gobernado. Motor ≠ IA. Existing-engine-first. Multiempresa. Trading aislado.

## B0–B7
Persistencia, bootstrap, planner, semantic contracts, real bindings, adapter/batch, blind batch y escala 184 truthful: GREEN.

## B8 · GREEN primer family provider
`universal-skill-auto-engineering-v1.mjs` convierte `ENGINEERING_TASK_REQUIRED` en trabajo ejecutable por familia. Finance provider consume evidencia de fuente y ejecuta benchmark determinista; no copia constraints del contrato. Item real #128 pasó automáticamente a FULL_SAFE_PREPROD en 6 bindings.

## B9 · GREEN
Repositorio dinámico no preparado: FULL_SAFE_PREPROD + registro nativo. Entrada GitHub pública real: `https://github.com/ericrisco/rsc-harness/tree/main/skills/finance-ops` → lectura read-only, SHA fijado, licencia, `SKILL.md` inferido, planner, auto-engineering, 6 bindings, gates y registro nativo → FULL_SAFE_PREPROD. Sin clone/token/install/code execution externo.

## B10 · GREEN_PREPROD_CONTROL_PLANE
`universal-skill-source-queue-v1.mjs` usa JOB-001 para lotes de URLs, concurrencia, idempotency key, restart/reuse de resultado y estados terminales. Workflow `cerebro-universal-skill-continuous-intake-v1.yml` define repository_dispatch/workflow_dispatch. En rama se certifica el control plane; activación event-driven en default branch queda para promoción gobernada, no se afirma operativa todavía.

HEAD certificado `876ae431e67b278b447fc21006c48c4bb94bb592`. Runs SUCCESS: Factory 39032881903; Scale184 V1 39032881926; Scale184 V2 39032881910; GitHub live 39032881905; Repository E2E 39032881906; Governed Main 39032881956; RSI 39032881917.

## Scale184 V2
35 ABSORBED, 59 REJECTED, 79 BLOCKED_EXTERNAL, 10 ENGINEERING_TASK_REQUIRED, 1 FULL_SAFE_PREPROD. `full_claim=false`. Artifact 12101021987 digest `sha256:adfbfb754c29928a9e034fb7f72b77ea49d03cd25b185386d205bc17857855a7`.

## B11 · IN_PROGRESS
Cuello actual: cross-domain. Legacy normalizer usa top owner-overlap y los empates pueden sobrerutear items a dominios colaterales. Corregir inferencia usando evidencia textual/manifest + owners, luego fabricar providers reutilizables por domain contract y reejecutar los 10 gaps. Nunca hardcodear IDs ni fabricar evidencia. Physical remains physical.

## B12
Certificación final multi-familia y SLO. Objetivos posteriores: simple 1–5 min, normal 5–15 min, repo mediano 10–30 min, compleja 20–60 min; medir, no prometer. Presupuesto V1 14–18 h, reevaluación estructural a 20 h si reaparece trabajo manual por skill.

## Math/Engineering posterior
No proyecto separado antes de Factory. Safe Engineering ya acelera FACT. Tras B11/B12, usar Factory para absorber Math/Solver/Optimization, Systems Engineering, Data Engineering y Security Engineering.

## Comunicación/continuidad
Solo hitos relevantes y breves. Antes de saturación o cierre mayor actualizar MASTER/STATE/RUNBOOK/HANDOFF y continuar desde `next_block`, nunca por memoria.
