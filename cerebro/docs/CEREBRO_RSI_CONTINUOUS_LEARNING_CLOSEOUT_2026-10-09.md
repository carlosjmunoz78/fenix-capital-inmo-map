# CEREBRO OS · RSI CONTINUOUS LEARNING · CLOSEOUT

**Fecha:** 2026-10-09  
**Ámbito:** `company_id=fenix` · `engine_id=LRN-001` · `environment=PREPROD`  
**Estado:** `CONFIRMED_OPERATIONAL_PREPROD`  
**Coste adicional observado/objetivo:** `0 €`  
**PROD authority:** `FALSE`  
**PROD writes:** `FALSE`  
**Trading access:** `FALSE`  
**MULTIEMPRESA continuation en esta misión:** `FALSE`  
**HUMAN_REQUIRED para el cierre PREPROD:** `NONE`

## 1. Decisión de cierre

La misión "CEREBRO aprende cada día, mejora los motores y mejora también cómo aprende" queda cerrada para su alcance PREPROD gobernado.

No se declara autonomía PROD. La promoción a producción es una misión separada y de riesgo alto; requiere autorización explícita y sus gates propios.

El cierre conserva la arquitectura canónica:

`OPERATE -> OBSERVE -> MEASURE -> LEARN -> CANDIDATE -> OLD vs NEW -> INDEPENDENT TRIBUNAL -> PREPROD SHADOW/CANARY -> MONITOR -> KEEP/ROLLBACK -> RELEARN -> NEXT VERSION`

## 2. Estado vivo usado como autoridad

- Repo: `carlosjmunoz78/fenix-capital-inmo-map`
- Runtime baseline de `main` verificado antes de este cierre documental: `aae57c7b463e4b60f811713c90fdf51dd1ee3eab`
- Durable outbox branch: `cerebro-rsi-learning-outbox-v0`
- Durable learning-state branch: `cerebro-rsi-learning-state-v0`
- Control plane: `CEREBRO RSI Learning Control Plane V0`
- Real-domain evidence workflow: `CEREBRO RSI Real Domain Evidence Wiring V0`
- Execution model: `HOSTLESS_BOUNDED_ITERATION`
- Cadence contract: `BEST_EFFORT_15_MINUTE_PLUS_EVENT`

El PC Windows no es dependencia central de este loop; puede actuar como EDGE RUNNER opcional para capacidades que lo necesiten.

## 3. Evidencia extremo a extremo ya cerrada

### 3.1 Learning + candidate pipeline

El durable Learning Control Plane ha quedado GREEN repetidamente después de corregir compatibilidad histórica sin reescribir el ledger. La política final mantiene `FIRST_SEEN_IMMUTABLE` y solo normaliza las formas heredadas ausente/null/vacío de `signal_id` y `source_environment`; cualquier cambio sustantivo del mismo `learning_id` sigue fallando cerrado.

PRs de cierre del conflicto vivo:

- `#541` · diagnóstico seguro por nombres de campos, sin valores.
- `#542` · diagnóstico estructural de presencia/ausencia.
- `#543` · compatibilidad estrecha de replay de procedencia heredada.
- `#544` · normalización estrecha de formas legacy null/absent/empty para los dos campos declarados.

Ninguna de estas correcciones amplía autoridad, presupuesto, PROD, Trading o equivalencia de contenido de negocio.

### 3.2 Evidencia real -> outbox

El workflow `CEREBRO RSI Real Domain Evidence Wiring V0` ejecutó sobre `main` y terminó SUCCESS en run `37942182281`.

Resultado operacional del job:

- `REAL_DOMAIN_EVIDENCE_GREEN`
- `events_total=3`
- `OUTBOX_GREEN`
- nuevo batch `lrn-batch:d7b101719a9f39885d1e542a`
- checksum `89845ec7e1ffb2e6e31dc3ac822a3f9d45d615d9ca044335e7bb51587edd1737`
- escritura solo en la rama append-only `cerebro-rsi-learning-outbox-v0`
- `prod_authorized=false`
- `trading_access=false`
- `additional_cost_eur=0`

### 3.3 Outbox real -> LRN durable -> candidates

Después del batch real anterior, el Control Plane volvió a ejecutarse y terminó GREEN con transporte remoto sano.

Último estado durable observado en este cierre:

- global status: `GREEN`
- remote outbox: `REMOTE_OUTBOX_GREEN`
- `index_batches_total=45`
- `processed_batches=2`
- `persisted_total=6` nuevos aprendizajes en esa iteración
- `held_total=0`
- `human_required=[]`
- candidate status: `CANDIDATES_GREEN`
- `source_learning_total=179`
- `candidate_total=179`
- `duplicates_total=173` reconocidos idempotentemente
- `next_gate=OLD_VS_NEW_EXPERIMENT`
- orchestrator: `ORCHESTRATOR_GREEN`
- horizons: `HORIZON_EXECUTORS_GREEN`
- meta-observability: `META_METRICS_GREEN`
- `prod_authorized=false`
- `prod_write_authorized=false`
- `trading_access=false`
- `additional_cost_eur=0`

Esto demuestra físicamente el circuito `real evidence -> outbox -> durable LRN -> candidate` sin depender de fixtures aislados.

## 4. Evaluación, tribunal, promoción y relearning

La parte posterior del circuito ya estaba cerrada antes de este último hardening:

- PR `#520`: OLD vs NEW sobre mismo fixture + evaluación/tribunal independiente + backup/rollback/rebuild gate.
- PR `#521`: `PREPROD -> SHADOW -> CANARY -> MONITOR -> KEEP_NONPROD/ROLLBACK -> RELEARN`.
- PR `#522`: certificación persistente completa de continuous evolution; incluye rechazo de regresión OLD vs NEW y rollback/relearning de una regresión post-adopción.

Por tanto el cierre no termina en generar candidatos: existe contrato y aceptación para experimentar, juzgar, adoptar de forma acotada, vigilar, revertir y devolver el resultado al aprendizaje.

## 5. Skills/capabilities nuevas

La ampliación transversal solicitada también está cerrada:

`NEW SKILL -> REGISTER/VERSION -> IMPACT -> TEST -> OLD vs NEW -> LRN -> SUPERVISOR/TRIBUNAL -> SAFE PROMOTION OR ROLLBACK -> FACT-001 GAP ONLY IF NEEDED`

- PR `#537`: Universal Skill Capability Evolution V0.
- PR `#538`: certificación.
- PR `#539`: auto-hook del Skill Discovery Scout hacia el capability evolution loop.

Regla preservada: extender un motor existente antes de fabricar uno nuevo. FACT-001 recibe un gap solo cuando no existe binding válido; no se crea un motor directamente por descubrir una skill.

## 6. Autonomía real alcanzada

La autonomía no es global.

Estado canónico de la misión de dominios:

- `LRN-001 / cerebro.learning.continuous_evolution` -> `PREPROD_AUTONOMOUS`
- `AUTO-001 / fenix.automation` -> `PREPROD_AUTONOMOUS`
- APP/CRM/DATA/KNW/WEB/SEO/MKT/TRN y demás dominios no certificados para autonomía permanecen `ASSISTED/HOLD` según su política y evidencia.

SEO conserva explícitamente el bloqueo independiente `HOLD_CORE_GUARD_CANONICAL_RECONCILIATION`. Este cierre RSI no lo salta.

## 7. Seguridad e idempotencia

Se conserva:

- ledger append-only / first-seen immutable;
- dedupe determinista;
- no reescritura de historia para hacer pasar tests;
- evidencia y procedencia;
- independent judge;
- anti-Goodhart;
- rollback/rebuild;
- kill switches por dominio donde aplique;
- coste medido;
- sin secretos/customer data en los flujos de evidencia aquí certificados;
- sin acceso Trading;
- sin autoridad de escritura PROD;
- sin ampliación silenciosa de permisos.

## 8. Rojo histórico corregido

El workflow de evidencia de dominio tenía un fallo técnico en el probe programado: Bash reserva `SECONDS` como variable aritmética y se le estaba asignando `curl time_total` decimal. PR `#540` lo corrigió renombrando únicamente esa variable a `ELAPSED_SECONDS`.

Un run nuevo con el YAML corregido terminó SUCCESS y produjo evidencia/outbox real. No se aceptó como prueba el simple re-run de un run histórico porque GitHub reutilizaba el workflow definition de aquel run.

## 9. Qué NO queda pendiente dentro de esta misión

No queda pendiente demostrar que:

- LRN puede ejecutarse hostless;
- puede repetir ejecuciones idempotentes;
- puede consumir evidencia real;
- puede persistir aprendizaje durable;
- puede crear candidatos versionados;
- existe OLD vs NEW;
- existe tribunal independiente;
- existe shadow/canary/monitor;
- existe rollback/relearning;
- una nueva skill puede entrar automáticamente en el loop;
- el coste adicional de este circuito puede mantenerse en 0 €;
- PROD y Trading permanecen fail-closed.

## 10. Deuda fuera de alcance / no bloqueante para este cierre

- PROD global: no autorizado por este cierre.
- MULTIEMPRESA runtime continuation: misión separada; no se finge completada.
- SEO/Core Guard: reconciliación física/canónica separada.
- Browser Bridge/Computer Use: gates físicos separados donde aplique.
- PR `#536`: intento anterior/superseded de capability evolution; no es autoridad del runtime aceptado por `#537/#538/#539`.

Ninguno de esos puntos invalida `CONFIRMED_OPERATIONAL_PREPROD` del Continuous Learning Loop de Fénix.

## 11. Runbook de continuidad

Al reanudar esta línea, NO reconstruir ni repetir A-M/B1-B4.

Verificar solo:

1. `main` actual.
2. último `CEREBRO RSI Learning Control Plane V0`.
3. `cerebro-rsi-learning-state-v0/.../last-control-plane-run.json`.
4. último índice/batch de `cerebro-rsi-learning-outbox-v0`.
5. que PROD/Trading siguen sin autoridad salvo promoción posterior explícitamente documentada.

Si esos puntos siguen verdes, continuar desde la siguiente mejora real detectada por el propio sistema, no desde una auditoría general.

## 12. Gate futuro de PROD

`PROD_PROMOTION = HUMAN_REQUIRED/HIGH_RISK` hasta autorización explícita.

Una futura promoción deberá verificar como mínimo: HEAD exacto, CI/evals, seguridad, permisos, backup, rollback/rebuild, impacto de workflows/deploy, canary/feature flag cuando aplique, observabilidad y post-monitoring.

**Este documento no concede esa autorización.**
