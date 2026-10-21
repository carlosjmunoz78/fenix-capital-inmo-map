# CEREBRO OS · Channel Intelligence V1

## Estado

DEFINIDO / IMPLEMENTACIÓN EN RAMA AISLADA.

Esta capacidad se construye en paralelo a la promoción STAGING→PROD de la web de Fénix Capital y no realiza escrituras sobre WordPress PROD.

## Objetivo

Crear una capa operativa permanente para Web y cada canal social activo que observe mercado, competencia, tendencias, formatos, audiencia y rendimiento; genere oportunidades y variantes; pruebe cambios de forma controlada; mida resultados; aprenda; y reutilice lo aprobado sin duplicar motores canónicos.

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
- aprendizaje de preferencias y resultados

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
- Adaptadores directos futuros (`META_DIRECT`, `LINKEDIN_DIRECT`, otros) permanecen `PLANNED_NOT_BOUND`.
- No se desactiva Buffer hasta que un sustituto pase PREPROD E2E, idempotencia, verificación física, OLD vs NEW contra Buffer, rollback probado y promoción gradual.
- Esta V1 no autoriza escrituras externas de publicación; solo planifica y valida topología/gates.

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

Los pesos iniciales son deterministas y versionados. LRN-001 podrá proponer ajustes; nunca promocionará automáticamente reglas sensibles.

## Contratos V1

Se introducirán contratos de capability/data sin alterar los 177 IDs:

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
- `channel.function_added`
- `channel.policy_changed`
- `channel.new_detected`
- `publisher.adapter_candidate`
- `publisher.migration_ready`
- `insight.cross_channel_ready`
- `learning.rule_candidate`

## Nueva red

La incorporación de una nueva red relevante debe seguir:

`NEW_CHANNEL_DETECTED → research → términos/API/políticas → formatos → métricas → audiencia → competencia → tendencias → channel manifest → instancia CHANNEL_POD_PROFILE → adapters → templates → LAB → PREPROD → E2E → promoción gobernada`

## Guardrails

- `environment=PREPROD` en V1 de referencia.
- `prod_execution_enabled=false`.
- `autonomous_prod=false`.
- No escribir en WordPress PROD durante la migración actual.
- No publicar por Make desde esta capability.
- No desactivar Buffer ni reconfigurar proveedor sin sustituto validado.
- No duplicar source-of-truth.
- No saltar POL-001/HEX-001.
- HUMAN_REQUIRED limitado a razones canónicas.
- Coste adicional objetivo: 0 €.
- Cross-company deny por defecto.
- Toda promoción requiere tests, evaluación, observabilidad, backup/rebuild y rollback cuando aplique.

## Criterio de aceptación V1

La V1 queda aceptada cuando:

1. Puede instanciar un Web Operating Profile y Channel Pods para Instagram/Facebook/LinkedIn sin nuevos engine IDs.
2. Puede registrar señales de tendencia/competencia/mercado y producir una oportunidad explicable.
3. Puede generar una propuesta creativa/experimental sin publicar ni gastar.
4. Puede transferir un insight entre canales sin copiar automáticamente la pieza creativa.
5. Puede fabricar el scaffold de un nuevo channel pod a partir de un `channel-manifest`.
6. Tests demuestran aislamiento multiempresa, PREPROD-only, fail-closed y coste 0 por defecto.
7. Puede representar la topología de publicación actual con Buffer y bloquear Make como publisher.
8. Registry, dependencias, runbook y changelog quedan actualizados antes de promoción.
