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
Último código B18 certificado: `ed92f8b7ff351d98318d57225b4d3f510e20b7a4`.

B17 mantiene su certificación histórica exact-head en `a7df20aefca134086329273e9ee2be2aa3b6dd4a`; B18 añade su propia certificación exact-head sin reescribir la evidencia B17.

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
- B18 demuestra un aprendizaje LRN medido que produce un cambio de ingeniería real, NEW mejor, Tribunal independiente y una decisión posterior distinta por el aprendizaje.

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
- métricas p50/p95, wall time, eficiencia paralela, human touches/skill, code changes por skill, cache ratios, regression, rerun idempotency y distribución terminal.
- coste adicional 0 €, no PROD, no Trading, no datos cliente.

## B15 · AUTO ENGINEERING FAMILY COVERAGE + TERMINAL TRUTH · HECHO PREPROD
Providers genéricos certificados:
- `finance-accounting-payments`
- `math-optimization-simulation`
- `software-engineering-devops`
- `systems-platform-engineering`
- `data-database-supabase`
- `security-identity-privacy`

Controles certificados:
- fuente legacy `184` acotada por item/candidate;
- estados de deuda no se convierten en FULL por family provider;
- provider disponible no equivale a integración cerrada;
- `FULL_SAFE_PREPROD` solo puede exponerse como `FULL_REAL` con evidencia estricta completa;
- `ENGINEERING_TASK_REQUIRED` permanece no terminal.

## B16 · CURRENT EVIDENCE + WEB/SEO DEBT · HECHO PREPROD
- 184 items medidos y reconciliados item-scoped.
- Web/WordPress/frontend: 17 candidatas, 7 deudas de ingeniería.
- SEO/search/content: 30 candidatas, 19 deudas de ingeniería.
- `NO_NEW_WEB_SEO_PROVIDER_JUSTIFIED` hasta existir contrato genérico de ejecución + binding semántico demostrados.
- Item 183 mantiene su gate físico Android pendiente.
- B16 se alineó de Node 20 a Node 24.x, sin excluir tests, añadir dependencias ni rebajar gates.

## B17 · BROWSER AUTOMATION + PHYSICAL GATES · HECHO PREPROD CON RESIDUAL EXTERNO
Código certificado: `a7df20aefca134086329273e9ee2be2aa3b6dd4a`.

Resultado:
- se reutilizan Browser Transversal Autonomy, Authorized Execution Device Profile, Identity Session Lifecycle, Credential Lifecycle y Physical Adapter Audit; no se crea proveedor/browser engine duplicado;
- configuración/perfil/binding declarado no cuentan como evidencia física;
- el gate exige atestación fresca y una observación física bounded/fail-closed en LAB/PREPROD, kill-switch observado, coste 0, sin PROD/public mutation, customer data ni Trading;
- evidencia con campos inesperados se rechaza para impedir que secretos/tokens se acepten como prueba;
- targeted tests, verdad actual sin evidencia inyectada y full CEREBRO regression pasan;
- la ruta sintética demuestra la semántica del gate pero NO certifica el runtime físico actual;
- estado actual `BLOCKED_EXTERNAL / PHYSICAL_EVIDENCE_PENDING`;
- no existe HUMAN_REQUIRED activo; este residual es local y no congela bloques independientes;
- PROD/public deploy/auto-merge siguen no autorizados.

## B18 · LRN MEASURED ENGINEER OUTCOME LOOP · HECHO PREPROD
Baseline real: `f17fd6481c27d11df3442fb5764ba63c414bbfea`.
Código certificado: `ed92f8b7ff351d98318d57225b4d3f510e20b7a4`.
Workflow run #2 / `run_id=39080643672`: SUCCESS.
Artifact `12119220118`, digest `sha256:f4dd30b155d31093507f6107c482a42e5ac5043a89644b58fdcdf7fa63429520`.

Prueba:
- fixture sobre código real `AUTO-001 PREPROD Patch Planner`;
- baseline seleccionaba el primer mapping certificado elegible con `find()`, por lo que dos mappings equivalentes podían producir distinto plan según orden;
- métrica predefinida `order_invariance_score`: OLD=0;
- LRN crea y persiste learning trazable desde esa evidencia;
- Safe Engineering autoriza únicamente cambio mínimo PREPROD reversible;
- cambio: selección estable determinista entre mappings equivalentes;
- misma métrica/contrato: NEW=1;
- `compareEngineeringOutcomes`: `NEW_BETTER`;
- Tribunal independiente: `APPROVE_PREPROD_NEXT_STAGE`;
- segundo ciclo real medido persiste nuevo learning y cambia la decisión posterior a `KEEP_NEW_MONITOR`;
- targeted + real OLD/NEW + full CEREBRO regression GREEN con exact PR head;
- coste 0 €, sin PROD, auto-merge, Trading ni customer data.

B18 reutiliza capacidades existentes; no crea motor nuevo.

## PARCIAL / POR AUDITAR
- ARQUITECTO sigue siendo composición/reutilización existente, no una implementación transversal nueva.
- PERFORMANCE sigue posterior.
- `FULL_SAFE_PREPROD` no equivale a autoridad PROD.
- Browser/device/media action-capable solo podrá cerrar el residual físico con evidencia PREPROD fresca real.
- cualquier residual externo se clasifica por candidata como `BLOCKED_EXTERNAL`; HUMAN_REQUIRED solo si aplica uno de los ocho motivos canónicos.
- B19/B20/B21 todavía deben certificarse.

## next_block
`B19_UNIVERSAL_E2E_REAL`

Criterio B19:
1. candidata gobernada PREPROD real;
2. `factory -> register -> evaluate -> LRN -> engineer -> re-evaluate -> tribunal -> promotion/hold -> rollback/rebuild -> audit`;
3. ninguna etapa se cierra por simulación que se auto-certifica;
4. targeted + full regression + exact-head evidence;
5. no PROD, no auto-merge, no Trading, no customer data, coste 0 €.

## Política
`CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.
Coste adicional 0 € por defecto. PREPROD. No PROD write, no auto-merge, no Trading, no customer-data en tests. Solo ocho HUMAN_REQUIRED canónicos.
