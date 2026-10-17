# CEREBRO OS · UNIVERSAL SKILL ACTIVATION FACTORY V1 · MASTER

## Objetivo operativo
FACT-001 convierte una skill/repositorio/URL en capacidad funcional sin integración artesanal por candidata.

Flujo canónico:
`SOURCE -> PROVENANCE/LICENSE -> FINGERPRINT -> NORMALIZE -> DEDUPE -> CAPABILITY/DOMAIN -> ENGINES -> CONTRACT -> ADAPTER -> REAL BINDING -> OLD/NEW -> QA/EVA/JDG -> LRN/OBSERV/FINOPS -> BACKUP/ROLLBACK/REBUILD -> FULL_SAFE_PREPROD | TERMINAL TRUTHFUL STATE`.

## Definición estricta de integrada
No cuentan como integración: descarga, inventario, normalización, manifest, wrapper plan-only, scaffold, binding declarado o test aislado.

`FULL_SAFE_PREPROD` exige consumo semántico real de todos los bindings pertinentes, mejora/no-regresión, Tribunal independiente, learning feedback, observabilidad/FinOps, rollback/rebuild e idempotencia. Browser/device/media action-capable exige evidencia física PREPROD. Nada de esto concede PROD.

Estados: `FULL_SAFE_PREPROD`, `ABSORBED`, `REJECTED`, `BLOCKED_EXTERNAL`, `HUMAN_REQUIRED`; `ENGINEERING_TASK_REQUIRED` y `PARTIAL` son deuda/no cierre.

## Arquitectura
FACT-001 reutiliza runtime/JOB-001 y motores canónicos. No se crea servidor/agente por skill ni por profesión.

Capa técnica lógica:
`ARQUITECTO | CODE | SYSTEMS | MATH | DATA | SECURITY | QA | INTEGRATOR`.
Opcionales: `TECH SCOUT | PERFORMANCE`.

`CODE` usa identidad lógica `SOFTWARE_ENGINEERING` sobre capacidades reales existentes; no es un motor nuevo. SYSTEMS/DATA/SECURITY reutilizan runtime/JOB/device profile, DB-SAFE-NATIVE e IAM/credential foundation respectivamente.

## Estado certificado 2026-10-17
Rama: `cerebro/universal-skill-activation-factory-v1-20261017`
PR: `#784`
Código certificado: `5378bd9b7feb048fb26c3cb37c572a96ffe57775`

GREEN exact-head:
- Factory V1 #74
- Scale184 V1 #24
- Scale184 V2 #19
- Repository E2E #19
- GitHub Live E2E #17
- Skill Supply Chain #824
- Governed Main Integration #639
- RSI Promotion Shadow #805

## HECHO
- Safe Engineering consumido por FACT-001.
- Planner genérico dominio -> motores canónicos y contratos semánticos.
- Adapter Factory evidence-grounded y Real Binding genérico.
- OLD vs NEW, QA/EVA/JDG, LRN/OBSERV/FINOPS, backup/rollback/rebuild.
- Cola durable, source queue/event trigger e idempotencia.
- Catálogo 184 reconciliado sin falso “184 activas”.
- Repo desconocido y URL GitHub pública demostrados E2E.
- `MATH` V1 determinista.
- `SOFTWARE_ENGINEERING` / CODE fail-closed: worktree/sandbox, prechecks, tests, static analysis, regression, rollback, QA/EVA; HIGH_RISK para destructivo y SECURITY_INCIDENT para credencial crítica.
- SYSTEMS reutiliza runtime durable, concurrencia, retry/checkpoint/recovery y ejecución PREPROD fail-closed.
- DATA reutiliza DB-SAFE-NATIVE, tenant scope/RLS y bloquea mutación sin backup/rollback.
- SECURITY reutiliza IAM/credential foundation, mínimo privilegio y fail-closed sin exponer secretos.

## FACT FAST LANE INDUSTRIAL · HECHO PREPROD
Se industrializa el batch existente; no se crea otra arquitectura universal.

Capacidades demostradas:
- 10-50+ candidatas con concurrencia acotada; prueba inicial >=5 worker threads simultáneos.
- `fail_fast=false`: un bloqueo profundo no congela candidatas independientes.
- fingerprint/content-addressed dedupe; duplicado exacto -> `ABSORBED`.
- JOB-001 durable + rerun idempotente.
- caché durable de preparación para no repetir planner/provenance/dependency analysis del mismo fingerprint.
- OLD baseline cacheado por `engine_version|environment|contract_hash`.
- caché de blueprint de familia de adapter; el cache nunca salta la revalidación semántica/física de binding.
- blind batch real sobre reconciliación 184, con resultados terminales veraces y prohibición explícita de ascender metadata legacy a falso FULL.
- batch sintético multi-familia para demostrar el camino FULL sin código por candidate-id.
- telemetría de colas/activación y campos de etapa; lo no medido se deja `null`, no se inventa.
- métricas p50/p95, wall time, eficiencia paralela, human touches, code changes por skill, cache ratios, regression, rerun idempotency y distribución terminal.
- coste adicional 0 €, no PROD, no Trading, no datos cliente.

## PARCIAL / POR AUDITAR
- Auto Engineering aún no tiene provider de fabricación para todos los dominios. Providers demostrados: `finance-accounting-payments` y `math-optimization-simulation`.
- ARQUITECTO sigue siendo composición/reutilización existente, no una implementación transversal nueva.
- PERFORMANCE sigue posterior.
- `FULL_SAFE_PREPROD` no equivale a activación física universal ni autoridad PROD.

## next_block
`B15_AUTO_ENGINEERING_FAMILY_COVERAGE_AND_STRICT_TERMINAL_VIEW`

Orden:
1. ampliar providers genéricos solo para gaps reales repetibles, priorizando familias con `ENGINEERING_TASK_REQUIRED` observado;
2. reutilizar antes de fabricar y nunca sintetizar evidencia desde el contrato objetivo;
3. añadir vista terminal estricta aditiva `FULL_REAL | ABSORBED | REJECTED | BLOCKED_EXTERNAL | HUMAN_REQUIRED` sin borrar estados internos útiles;
4. repetir blind real-catalog + exact-head regression;
5. mantener PR #784 sin auto-merge: promoción a `main` solo por gate/política gobernada.

## Política
`CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.
Coste adicional 0 € por defecto. PREPROD. No PROD write, no auto-merge, no Trading, no customer-data en tests. Solo ocho HUMAN_REQUIRED canónicos.
