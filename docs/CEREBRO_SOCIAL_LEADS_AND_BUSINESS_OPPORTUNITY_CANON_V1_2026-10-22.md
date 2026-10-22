# CEREBRO OS · SOCIAL LEADS & BUSINESS OPPORTUNITY DISCOVERY · CANON V1

**Fecha:** 2026-10-22  
**Estado:** DEFINIDO · UNIVERSAL · ADITIVO · PREPROD  
**company_id:** GLOBAL  
**version:** 1.0.0

## Regla universal por red

Toda Social Platform Family debe incorporar dos capacidades permanentes y obligatorias para cada empresa que opere en esa red:

1. **Lead Acquisition**: atraer, detectar, clasificar, cualificar dentro de límites aprobados y enrutar leads legítimos hacia la empresa, marca, línea de negocio y territorio correctos.
2. **Business Opportunity Discovery**: detectar oportunidades de negocio nuevas, adyacentes o emergentes relacionadas con la empresa o con movimientos relevantes del mercado/plataforma y enviarlas a CEREBRO para evaluación independiente.

Estas capacidades se aplican a Facebook, Instagram, LinkedIn, TikTok, YouTube, X, Pinterest y cualquier red futura.

## Lead Acquisition

Cada red debe explotar únicamente superficies permitidas y apropiadas: contenido orgánico, CTAs, comentarios públicos, conversaciones autorizadas, formularios de lead, grupos cuando sus normas lo permitan, Marketplace cuando aplique, creators/partnerships, paid media autorizado, retargeting autorizado, comunidad y referencias.

Cada lead debe transportar como mínimo:

`company_id + brand_id + business_line + platform_id + territory_id + intent + qualification_state + consent_state_when_applicable + attribution + crm_handoff_state`

Reglas:

- no scraping prohibido;
- no spam;
- no mezcla de datos privados entre empresas;
- deduplicación previa a CRM;
- no decisiones financieras/legales fuera de contratos aprobados;
- `CUSTOMER_HUMAN_REQUEST` si el cliente pide humano;
- medición de fuente → lead → resultado para que CEREBRO aprenda qué canales producen valor real.

## Business Opportunity Discovery

Cada red debe vigilar continuamente señales que puedan revelar:

- nuevos productos o servicios;
- líneas de negocio adyacentes;
- nuevos segmentos;
- nuevos territorios;
- alianzas y modelos B2B/B2C;
- nuevos lead magnets;
- nuevos canales de adquisición;
- comunidades o creator/affiliate models;
- nueva demanda;
- nuevos modelos de ingresos;
- tendencias emergentes;
- oportunidades que todavía no pertenecen al negocio actual pero presentan evidencia suficiente para ser evaluadas.

Fuentes: competencia, perfiles de referencia, comentarios y lenguaje del cliente, grupos públicos/autorizados, Ads Library, patrones de engagement, intelligence territorial, releases de plataforma, cambios regulatorios/mercado y nuevas tecnologías/herramientas.

## Opportunity Brief

Ningún agente social lanza un negocio nuevo directamente. Debe generar un brief con evidencia y enviarlo a CEREBRO.

Campos mínimos:

`opportunity_id, company_id_or_global_candidate, source_platform, discovery_date, observed_signals, provenance, problem_or_demand, proposed_opportunity, relationship_to_current_company, target_customer, territory, why_now, evidence_strength, value_hypothesis, cost_hypothesis, risks, capabilities_needed, reusable_engines, recommended_next_test`

Evento canónico:

`SOCIAL_BUSINESS_OPPORTUNITY_DISCOVERED`

Estados:

`DISCOVERED → EVIDENCED → CEREBRO_EVALUATION_REQUESTED → REJECTED | WATCHLIST | RESEARCH_REQUIRED | TEST_APPROVED | VENTURE_OR_ENGINE_ROUTED`

## Gobernanza

La Social Family puede descubrir y documentar. CEREBRO decide si investigar más, probar, reutilizar un motor existente, crear uno nuevo mediante FACT-001, enviar a Venture Factory/Business Discovery o descartar.

La red no puede por sí misma:

- crear una empresa;
- lanzar un negocio real;
- gastar dinero no autorizado;
- aumentar autoridad;
- promover la oportunidad a PROD.

## Herencia automática

FACT-001 debe incluir estas dos capacidades en cada nueva Platform Family y en cada nueva familia sectorial creada para una red.
