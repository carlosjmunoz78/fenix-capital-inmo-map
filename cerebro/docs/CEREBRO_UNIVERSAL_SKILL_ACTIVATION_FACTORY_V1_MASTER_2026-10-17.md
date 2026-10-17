# CEREBRO OS · UNIVERSAL SKILL ACTIVATION FACTORY V1 · MASTER

## Objetivo operativo
FACT-001 convierte una skill/repositorio/URL en capacidad funcional sin integración artesanal por candidata.

Flujo canónico:
`SOURCE -> PROVENANCE/LICENSE -> FINGERPRINT -> NORMALIZE -> DEDUPE -> CAPABILITY/DOMAIN -> ENGINES -> CONTRACT -> ADAPTER -> REAL BINDING -> OLD/NEW -> QA/EVA/JDG -> LRN/OBSERV/FINOPS -> BACKUP/ROLLBACK/REBUILD -> FULL_SAFE_PREPROD | TERMINAL TRUTHFUL STATE`.

## Definición estricta de integrada
No cuentan como integración: descarga, inventario, normalización, manifest, wrapper plan-only, scaffold, binding declarado o test aislado.

`FULL_SAFE_PREPROD` exige consumo semántico real de todos los bindings pertinentes, mejora/no-regresión, Tribunal independiente, learning feedback, observabilidad/FinOps, rollback/rebuild e idempotencia. Browser/device/media action-capable exige evidencia física PREPROD. Nada de esto concede PROD.

Vista terminal estricta aditiva: `FULL_REAL | ABSORBED | REJECTED | BLOCKED_EXTERNAL | HUMAN_REQUIRED`. `ENGINEERING_TASK_REQUIRED` y `PARTIAL` son deuda/no cierre.

## Arquitectura
FACT-001 reutiliza runtime/JOB-001 y motores canónicos. No se crea servidor/agente por skill ni por profesión.

Capa técnica lógica:
`ARQUITECTO | CODE | SYSTEMS | MATH | DATA | SECURITY | QA | INTEGRATOR`.
Opcionales: `TECH SCOUT | PERFORMANCE`.

`CODE` usa identidad lógica `SOFTWARE_ENGINEERING` sobre capacidades reales existentes; no es un motor nuevo. SYSTEMS/DATA/SECURITY reutilizan runtime/JOB/device profile, DB-SAFE-NATIVE e IAM/credential foundation respectivamente.

## Estado certificado 2026-10-18
Rama: `cerebro/universal-skill-activation-factory-v1-20261017`
PR: `#784`
Código certificado: `0ba248c812ed21b2ddbea1f2b2010357615159c9`

GREEN exact-head 11/11:
- Factory V1 #95
- Scale184 V1 #42
- Scale184 V2 #38
- Repository E2E #38
- GitHub Live E2E #36
- B15 Integrity V1 #19
- B16 Current Evidence V1 #17
- B16 Web SEO Debt V1 #21
- Skill Supply Chain #843
- Governed Main Integration #657
- RSI Promotion Shadow #823

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

## B15 · AUTO ENGINEERING FAMILY COVERAGE + TERMINAL TRUTH · HECHO PREPROD
Providers genéricos certificados:
- `finance-accounting-payments`
- `math-optimization-simulation`
- `software-engineering-devops`
- `systems-platform-engineering`
- `data-database-supabase`
- `security-identity-privacy`

Controles añadidos/certificados:
- fuente legacy `184` acotada por item/candidate para impedir contaminación por evidencia de siblings;
- estados como `DEFINED_NOT_BUILT`, `SIMULATION_ONLY`, `SCAFFOLD_PLAN`, `NOT_PROMOTED` o `PHYSICAL_*_REQUIRED` no pueden convertirse en FULL por un family provider;
- provider disponible no equivale a integración cerrada;
- `FULL_SAFE_PREPROD` solo puede exponerse como `FULL_REAL` cuando toda la evidencia estricta está completa;
- deuda `ENGINEERING_TASK_REQUIRED` permanece no terminal.

## B16 · CURRENT EVIDENCE + WEB/SEO DEBT · HECHO PREPROD
Resultado certificado sobre el código `0ba248c812ed21b2ddbea1f2b2010357615159c9`:
- 184 items medidos y reconciliados item-scoped;
- `web-wordpress-frontend`: 17 candidatas, 7 con deuda de ingeniería;
- `seo-search-content`: 30 candidatas, 19 con deuda de ingeniería;
- deuda repetida sí, pero sin evidencia explícita de contrato genérico de ejecución + binding semántico, por lo que **NO** se fabrica un provider Web/SEO genérico por inferencia;
- se preservan SEO-001, WordPress, APPBOOT/FACT y la evidencia física ya existente;
- item 183 permanece `PARTIAL_PREPROD_STAGING_RENDER_AND_SIGNED_ANDROID_BUILD_GREEN_PHYSICAL_DEVICE_PENDING` y no se asciende artificialmente;
- la regresión completa inicialmente detectó 4 tests que importan módulos `.ts`; la causa fue el runner B16 fijado en Node 20 mientras el contrato raíz del repo exige Node 24.x;
- reparación mínima: Node 20 -> Node 24 en el workflow B16; sin excluir tests, sin añadir dependencias, sin rebajar gates;
- resultado final B16 y exact-head: GREEN 11/11 workflows;
- PROD/public deploy/auto-merge siguen no autorizados.

## PARCIAL / POR AUDITAR
- ARQUITECTO sigue siendo composición/reutilización existente, no una implementación transversal nueva.
- PERFORMANCE sigue posterior.
- `FULL_SAFE_PREPROD` no equivale a activación física universal ni autoridad PROD.
- Browser/device/media action-capable debe reconciliar configuración frente a evidencia física PREPROD actual; presencia de profile o binding declarado no cuenta como prueba física.
- `physical-adapter-audit-v1` contiene evidencia histórica útil pero debe auditarse contra la rama/código actual antes de usarla como certificación nueva.
- cualquier residual externo se clasifica por candidata como `BLOCKED_EXTERNAL` o, solo si aplica uno de los ocho motivos canónicos, `HUMAN_REQUIRED`.

## next_block
`B17_BROWSER_AUTOMATION_AND_PHYSICAL_GATES`

Orden:
1. inventariar Browser Bridge, authorized execution device profile, repair workflow, contratos y evidencia física existentes; no crear un proveedor duplicado;
2. separar configuración declarada de prueba física observable y conservar toda evidencia histórica válida;
3. verificar bindings de navegador/dispositivo en PREPROD con ejecución bounded/fail-closed, sin arbitrary shell, datos cliente, Trading, PROD ni dependencias nuevas;
4. exigir evidencia física para cualquier claim `FULL_REAL`/`FULL_SAFE_PREPROD` action-capable; si la superficie física no está disponible, registrar el residual exacto sin falso verde;
5. ejecutar targeted + full regression + exact-head CI, manteniendo rollback/rebuild/observabilidad;
6. mantener PR #784 sin auto-merge; promoción a `main` solo por gate/política gobernada.

## Política
`CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.
Coste adicional 0 € por defecto. PREPROD. No PROD write, no auto-merge, no Trading, no customer-data en tests. Solo ocho HUMAN_REQUIRED canónicos.
