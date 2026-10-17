# CEREBRO UNIVERSAL SKILL ACTIVATION FACTORY V1 · MASTER

Fecha: 2026-10-17
Issue canónica: #780
PR: #784
Branch: `cerebro/universal-skill-activation-factory-v1-20261017`
Estado: IN_PROGRESS
Entorno: LAB/PREPROD
PROD: NO TOCAR
Coste adicional objetivo: 0 EUR

## 1. Objetivo

Convertir la incorporación de skills/repositorios en un proceso industrial y automático. El efecto objetivo es equivalente a "pegar una URL y, poco después, CEREBRO sabe usarla", pero con gobierno, pruebas, trazabilidad, OLD vs NEW, rollback y aprendizaje.

Entradas: skill, repositorio, capability/package/librería, wrapper normalizado o capacidad interna que necesite bindings reales.

Salidas terminales válidas: `FULL_SAFE_PREPROD/FULL_REAL`, `ABSORBED`, `REJECTED`, `BLOCKED_EXTERNAL`, `HUMAN_REQUIRED`.

Una skill NO cuenta como integrada por discovery, descarga, catálogo, normalización, documentación, wrapper, scaffold o test aislado.

## 2. Definición de FULL

FULL exige por cada binding relevante: provenance/licencia válida; ruta segura de reuse/wrapper; target engine gobernado; consumo semántico real; OLD vs NEW PASS; QA/EVA/Tribunal PASS; no regresión; backup/rollback/rebuild; OBS/Audit/FinOps; feedback LRN persistente e idempotente; restart/fail-closed; coste 0 o excepción aprobada; evidencia física PREPROD cuando aplique; invocación ordinaria sin humano.

## 3. Principios

CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. Factory First. Existing-engine-first. Motor ≠ IA. No forzar skills en todos los motores. No ejecutar código externo crudo sin aislamiento/evaluación/autoridad. Multiempresa. Trading aislado. Supabase no como runtime universal pesado. No PROD.

## 4. Arquitectura

`INGEST → PROVENANCE/LICENSE → CAPABILITY DISCOVERY → DEDUPE/ABSORB → DOMAIN CLASSIFICATION → TARGET ENGINE PLANNER → SAFE ENGINEERING → ADAPTER → PARALLEL LAB → SEMANTIC BINDINGS → OLD VS NEW → QA/EVA/TRIBUNAL → LRN/OBS/FINOPS → BACKUP/ROLLBACK/REBUILD → PHYSICAL PREPROD → TERMINAL STATE`

El planner resuelve `skill/repo → capacidades → dominios → motores relevantes` usando Registry/señales gobernadas, no tablas por skill concreta.

## 5. Bootstrap de ingeniería

Safe Engineering Profile V1 se reutiliza como brazo técnico de FACT. No crear agente programador aislado. Mantener permisos/coste/PROD cerrados.

## 6. Generalización del binding real

V1 sustituye rutas hardcodeadas por ActivationPlan, familias de contratos semánticos y un executor N candidates × M bindings con receipts, OLD vs NEW, Tribunal, LRN/OBS/FinOps y rollback/rebuild.

## 7. Paralelismo

Reutilizar JOB-001 durable. FAST_LANE/ENGINEERING/DEVICES/GROWTH/MEDIA/BUSINESS/GENERAL; EXPRESS/STANDARD/DEEP; una candidata lenta no bloquea las demás; corregir por familia.

## 8. Capacidades expertas posteriores

Tras cerrar la Factory: Math/Solver/Optimization, Systems Engineering, Data Engineering, Security Engineering y futuras capabilities se incorporan usando la propia Factory. Math no bloquea la Factory; Safe Engineering sí se usa desde el bootstrap.

## 9. Métricas objetivo

Presupuesto V1: 14–18 h técnicas; reevaluación estructural a 20 h si persiste trabajo manual por skill. SLO objetivo posterior: sencilla 1–5 min, normal 5–15 min, repo mediano 10–30 min, compleja 20–60 min, externo/hardware hasta bloqueo terminal. Son objetivos a medir, no garantías.

## 10. Comunicación

Solo hitos relevantes y breves. No pedir intervención salvo HUMAN_REQUIRED real.

## 11. Continuidad entre chats

Actualizar MASTER + STATE + RUNBOOK + HANDOFF antes de saturación o tras bloque mayor. El siguiente chat lee evidencia viva y entra en `next_block`, sin reconstruir por memoria.

## 12. Bloques

- B0 Persistencia/contrato: GREEN.
- B1 Engineering bootstrap: GREEN.
- B2 Generic Activation Planner: GREEN.
- B3 Semantic Contract Families: GREEN.
- B4 Generic Real Binding Executor: GREEN.
- B5 Automatic Adapter + Durable Batch: GREEN.
- B6 Blind Batch Certification: GREEN.
- B7 Scale184 Truthful Certification: GREEN.
- B8 Auto Engineering Fulfillment: IN_PROGRESS.
- B9 Unseen Repository E2E + SLO: PLANNED.
- B10 Continuous Trigger + Final Factory Certification: PLANNED.

## 13. Evidencia certificada B0–B7

HEAD certificado `e663bb404cf7022d5469e6384759195bbdd5e1c1`.

Runs: Factory `39031138379` SUCCESS; Scale184 `39031138363` SUCCESS; Governed Main `39031138343` SUCCESS; RSI Readiness `39031138350` SUCCESS.

Artifact Scale184 `12100228380`, digest `sha256:64d62a173cdaae86eede9cef56c44bac6c73b9775fe5fc05605bdb7a67315c86`.

Matriz 184: 35 ABSORBED, 59 REJECTED, 79 BLOCKED_EXTERNAL, 11 ENGINEERING_TASK_REQUIRED; 58 atravesaron runtime; 126 terminaron por evidencia/estado previo; `full_claim=false`.

Esto demuestra clasificación/batch/verdad a escala, no 184 activaciones físicas.

## 14. Gap estructural actual

El adapter factory ya puede reutilizar adapters existentes o generar adapters declarativos cuando existe evidencia semántica segura y exacta. Cuando falta esa evidencia, genera una `ENGINEERING_TASK_REQUIRED` gobernada. El batch actualmente propaga ese estado: todavía no ejecuta automáticamente la ingeniería necesaria hasta obtener implementación + pruebas + evidencia y reintentar el binding.

Ese es el cuello de botella restante para conseguir el efecto "meto una skill/repo y queda funcionando" sin chat conductor.

## 15. B8 · Auto Engineering Fulfillment

FACT debe convertir una `ENGINEERING_TASK_REQUIRED` en trabajo durable ejecutable: Safe Engineering → aislamiento → inventario/dependencias/reuse → tests → implementación mínima/wrapper → probe real → evidencia → rerun del binding → OLD vs NEW/gates → terminal state.

No se acepta generar evidencia copiando constraints del contrato. No se acepta código por ID de candidata. Los fallos se agrupan por familia. Evidencia física sigue siendo física.

Criterio mínimo B8: una candidata que antes terminaba `ENGINEERING_TASK_REQUIRED` avanza automáticamente sin integración escrita específicamente para ella.

## 16. B9/B10

B9 debe tomar una entrada no preparada (repositorio/skill) y demostrar E2E real, además de medir SLO. B10 conecta trigger continuo y certifica que el proceso opera sin chat conductor.

## 17. Regla de éxito final

La Factory no termina porque compile o porque la matriz 184 sea GREEN. Termina cuando una entrada nueva no preparada puede atravesar el circuito automáticamente y quedar en un estado terminal verdadero, y las candidatas ordinarias que necesitan ingeniería no requieren trabajo artesanal por candidata.
