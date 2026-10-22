# CEREBRO OS · Channel Intelligence V1

## Estado

DEFINIDO / IMPLEMENTACIÓN EN RAMA AISLADA.

Esta capacidad se construye en paralelo a la promoción STAGING→PROD de la web de Fénix Capital. PREPROD es una compuerta obligatoria de validación, no el destino final. La capacidad no se considerará terminada mientras no alcance PROD gobernado con evidencia suficiente.

## Objetivo

Crear una capa operativa permanente para Web y cada canal social activo que observe mercado, competencia, tendencias, formatos, audiencia y rendimiento; genere oportunidades y variantes; pruebe cambios de forma controlada; mida resultados; aprenda; y reutilice lo aprobado sin duplicar motores canónicos.

El objetivo no es detectar únicamente aquello que está flojo. El objetivo es mantener un ciclo de mejora continua proactiva: incluso cuando el estado actual sea bueno, CEREBRO debe buscar un challenger potencialmente mejor, probarlo y promoverlo solo si demuestra mejora o existe una justificación clara y gobernada.

Destino obligatorio:

`LAB → PREPROD → PROD`

Regla de cierre:

`NOT_DONE_UNTIL_PROD`

## Principio de arquitectura

CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

No se crean nuevos engine_id canónicos en V1. Se reutilizan y coordinan capacidades existentes:

- FACT-001 / GOV-001
- WEB-001 / WAUD-001
- MKT-001 / LAB-MKT
- COMPET-001 / MKT-002
- SOCAUD-001 / SOCBOOT-001
- FRC-001 / OPP-001 / INN-001 / EXP-001
- LRN-001 / EVA-001 / SUP-001
- EVT-001 / JOB-001
- POL-001 / HEX-001 / FINOPS-001
- Digital Build / Multimedia Factory existentes

## Mejora continua proactiva

Cada Web Operating Profile y cada Channel Pod deben ejecutar de forma recurrente el siguiente bucle:

`OBSERVE → COMPARE → DETECT OPPORTUNITY → GENERATE CHALLENGER → TEST → EVALUATE → PROMOTE IF BETTER → LEARN → REPEAT`

La baseline actual representa el suelo de comparación, no el estado final.

Los disparadores de mejora incluyen, como mínimo:

- tiempo/cadencia programada
- cambio de rendimiento
- cambio de tendencia
- movimiento de competencia
- cambio de plataforma o formato
- cambio en demanda de búsqueda
- feedback del propietario
- nueva evidencia de negocio

La ausencia de un error visual, de SEO, de conversión o de contenido no detiene el ciclo. El sistema debe buscar mejoras incrementales de forma permanente sin degradar estabilidad, marca, rendimiento, cumplimiento ni conversión.

## Aprendizaje del gusto y reducción progresiva de preguntas

La interacción con Carlos sigue un modelo `LEARN_THEN_AUTONOMOUS`.

### CALIBRATION_0

Al principio CEREBRO puede solicitar preferencias cuando la elección aporte señal útil para aprender gusto, tradeoffs y patrones aceptados/rechazados.

### CALIBRATION_1

Cuando exista evidencia suficiente, solo pregunta ante patrones nuevos o cuando la confianza de preferencia sea insuficiente.

### AUTONOMY_2

Con patrones validados, CEREBRO decide y mejora de forma autónoma dentro de política, usando conjuntamente gusto aprendido, marca y resultados reales.

### HUMAN_BY_EXCEPTION_3

El objetivo final es no hacer preguntas rutinarias. La intervención humana queda restringida a las razones canónicas:

- LEGAL_REQUIRED
- SIGNATURE_REQUIRED
- LOW_CONFIDENCE
- HIGH_RISK
- POLICY_CONFLICT
- SECURITY_INCIDENT
- MONEY_LIMIT
- CUSTOMER_HUMAN_REQUEST

Una pregunta de calibración temprana no se etiqueta como HUMAN_REQUIRED. Es una señal de aprendizaje no bloqueante.

La decisión creativa no se basa solo en gusto personal. Se ponderan:

`OWNER_TASTE + BRAND_SYSTEM + AUDIENCE_RESPONSE + OWN_PERFORMANCE + MARKET_TRENDS + COMPETITOR_SIGNALS + SEARCH_DEMAND + COMMERCIAL_VALUE - RISK - COST`

El objetivo es que el sistema aprenda el rollo progresivamente hasta poder aplicar por defecto decisiones que probablemente aprobaría Carlos, conservando evidencia y reversibilidad.

## Perfiles operativos

### WEB_OPERATING_PROFILE

Responsabilidades lógicas:

- auditoría visual y funcional
- UX/UI y CRO
- SEO y arquitectura
- tendencias visuales y de conversión
- análisis de competencia
- propuestas OLD vs NEW
- baseline visual y regresión
- generación continua de challengers
- aprendizaje de preferencias y resultados
- promoción gradual de mejoras demostradas hasta PROD

### CHANNEL_POD_PROFILE

Se instancia por `company_id + channel_id` y coordina roles lógicos, no nuevos servidores:

- Channel Director
- Trend Scout
- Competitor Scout
- Audience Intelligence
- Market Intelligence
- Creative Director
- Format Specialist
- Copy/Script
- Multimedia Producer
- Publisher/Verification
- Community
- Experimentation
- Analytics
- Forecasting
- Learning
- Brand Guardian
- Policy/QA

Cada POD opera permanentemente. No espera a que una publicación sea mala: estudia qué puede superar al patrón actual y prueba mejoras nativas del canal.

## Publisher Gateway

La auditoría vigente fija la topología actual así:

`SOC-001 / CEREBRO → BUFFER → Facebook / Instagram / LinkedIn`

Las rutas activas de Make auditadas para Facebook, Instagram y LinkedIn se consideran exclusivamente:

`plataforma social → lectura identidad/métricas → CEREBRO`

Reglas canónicas V1:

- Buffer es el publisher actual evidenciado.
- Make no es el publisher canónico; queda como puente transitorio de lectura/métricas donde ya existe.
- Buffer no se convierte en dependencia estructural permanente.
- CEREBRO expone un `Publisher Gateway` neutral a proveedor.
- Adaptadores directos futuros (`META_DIRECT`, `LINKEDIN_DIRECT`, otros) permanecen `PLANNED_NOT_BOUND` hasta superar gates.
- No se desactiva Buffer hasta que un sustituto pase PREPROD E2E, idempotencia, verificación física, OLD vs NEW contra Buffer, rollback probado y promoción gradual.
- La implementación inicial puede ser PREPROD-only, pero el destino requerido de la capacidad es PROD gobernado.

Topología objetivo:

`SOC-001 → Publisher Gateway → BUFFER | META_DIRECT | LINKEDIN_DIRECT | FUTURE_ADAPTER`

Así se podrá retirar Buffer posteriormente sin rehacer SOC-001, calendario, aprendizaje, diseño, métricas ni PODs.

## Inteligencia continua

Cada canal debe observar señales propias y clasificarlas al menos como:

`SEED → EMERGING → BREAKOUT → MAINSTREAM → SATURATED → DECLINING`

El sistema debe priorizar aceleración y adecuación al negocio, no solo volumen absoluto.

### Trend Opportunity Score

La evaluación V1 debe poder ponderar:

- momentum
- acceleration
- audience_fit
- brand_fit
- commercial_intent
- search_demand
- competitor_gap
- geographic_relevance
- cross_platform_diffusion
- saturation
- risk
- cost

Los pesos iniciales son deterministas y versionados. LRN-001 podrá proponer ajustes; los cambios relevantes deberán superar evaluación y tribunal antes de convertirse en regla estable de PROD.

## Contratos V1

Se introducen contratos de capability/data sin alterar los 177 IDs:

- `channel-manifest.v1`
- `channel-pod-profile.v1`
- `trend-signal.v1`
- `trend-opportunity.v1`
- `competitor-snapshot.v1`
- `visual-taste-profile.v1`
- `creative-decision.v1`
- `creative-variant.v1`
- `experiment-result.v1`
- `cross-channel-insight.v1`
- `channel-performance.v1`
- `publisher-topology.v1`
- `continuous-improvement-autonomy.v1`

El contrato `continuous-improvement-autonomy.v1` fija que PREPROD es gate, PROD es destino y la autonomía evoluciona desde calibración inicial hasta human-by-exception.

## Eventos V1

- `trend.detected`
- `trend.accelerating`
- `trend.breakout_predicted`
- `trend.saturated`
- `competitor.winner_detected`
- `competitor.strategy_changed`
- `market.signal_detected`
- `search.demand_changed`
- `creative.opportunity_detected`
- `creative.variant_ready`
- `experiment.started`
- `experiment.winner_detected`
- `improvement.challenger_created`
- `improvement.promoted`
- `improvement.rejected`
- `taste.calibration_requested`
- `taste.confidence_increased`
- `autonomy.level_changed`
- `channel.function_added`
- `channel.policy_changed`
- `channel.new_detected`
- `publisher.adapter_candidate`
- `publisher.migration_ready`
- `insight.cross_channel_ready`
- `learning.rule_candidate`

## Nueva red

La incorporación de una nueva red relevante debe seguir:

`NEW_CHANNEL_DETECTED → research → términos/API/políticas → formatos → métricas → audiencia → competencia → tendencias → channel manifest → instancia CHANNEL_POD_PROFILE → adapters → templates → LAB → PREPROD → E2E → PROD gobernado`

## Guardrails

- PREPROD es obligatorio como fase de validación, nunca como estado terminal del trabajo.
- PROD es el destino de toda capacidad aprobada.
- No escribir en WordPress PROD durante una migración o ventana protegida sin completar sus gates.
- No publicar por Make desde esta capability.
- No desactivar Buffer ni reconfigurar proveedor sin sustituto validado.
- No duplicar source-of-truth.
- No saltar POL-001/HEX-001.
- HUMAN_REQUIRED limitado a razones canónicas.
- Coste adicional objetivo: 0 €.
- Cross-company deny por defecto.
- Toda promoción requiere contratos, permisos, tests, evaluación, tribunal, observabilidad, backup/rebuild, coste medido, OLD vs NEW y rollback probado cuando aplique.
- Toda mejora autónoma en PROD debe ser reversible y observable.
- El sistema puede seguir buscando mejoras indefinidamente; cada challenger individual debe tener criterio de aceptación/rechazo finito para evitar loops improductivos.

## Criterio de aceptación V1

La V1 queda aceptada cuando:

1. Puede instanciar un Web Operating Profile y Channel Pods para Instagram/Facebook/LinkedIn sin nuevos engine IDs.
2. Puede registrar señales de tendencia/competencia/mercado y producir una oportunidad explicable.
3. Puede generar challengers aunque el estado actual no tenga un defecto manifiesto.
4. Puede generar una propuesta creativa/experimental sin publicar ni gastar durante LAB/PREPROD.
5. Puede transferir un insight entre canales sin copiar automáticamente la pieza creativa.
6. Puede fabricar el scaffold de un nuevo channel pod a partir de un `channel-manifest`.
7. Puede aprender preferencias explícitas, reducir preguntas conforme aumenta la confianza y alcanzar operación human-by-exception.
8. Tests demuestran aislamiento multiempresa, fail-closed y coste 0 por defecto.
9. Puede representar la topología de publicación actual con Buffer y bloquear Make como publisher.
10. Registry, dependencias, runbook y changelog quedan actualizados antes de promoción.
11. Existe camino demostrado LAB→PREPROD→PROD con OLD vs NEW, rollback y observabilidad.
12. La capacidad no se declara terminada hasta que el bloque aprobado correspondiente esté promovido a PROD.
