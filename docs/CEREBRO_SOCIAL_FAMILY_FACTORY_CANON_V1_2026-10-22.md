# CEREBRO OS · SOCIAL FAMILY FACTORY · CANON V1

**Fecha:** 2026-10-22  
**Estado:** DEFINIDO / DOCUMENTAL / PREPROD-ONLY  
**company_id:** GLOBAL  
**engine_id:** FACT-001  
**environment:** PREPROD  
**version:** 1.1.0

## 1. Decisión canónica

CEREBRO no debe construir una agencia de redes sociales distinta para cada empresa ni una arquitectura cerrada alrededor de una marca concreta.

Debe existir una **Social Family Factory multiempresa y multired** capaz de generar, especializar, probar, desplegar y mejorar equipos lógicos de marketing social para cualquier empresa que entre en CEREBRO.

La unidad reutilizable no es la empresa actual. La unidad reutilizable es:

`SOCIAL_CORE + SECTOR_FAMILY + PLATFORM_FAMILY + COMPANY_OVERLAY + BRAND_OVERLAY + TERRITORY_OVERLAY + CAMPAIGN_CONTEXT`

Por tanto, una empresa concreta es una **instancia**, nunca el nombre ni el límite de la arquitectura.

## 2. Familias sectoriales

### 2.1 Primera familia

**FINANCIAL_REAL_ESTATE** · Familia financiera / inmobiliaria.

Debe poder atender múltiples empresas diferentes pertenecientes a la misma familia: intermediación financiera, hipotecas, inmobiliarias, obra nueva, inversión, servicios inmobiliarios, captación, compraventa, valoración, B2B inmobiliario y futuras líneas compatibles.

Cobertura territorial objetivo: `Andalucía → resto de España`.

### 2.2 Segunda familia planificada

**TECH_PRODUCTS_AI** · Familia de productos tecnológicos e IA.

AION deberá encajar en esta familia o en una especialización derivada si la auditoría futura demuestra que necesita separación material.

### 2.3 Regla universal de nueva familia

Cuando entra una empresa de un sector no cubierto, CEREBRO investiga, intenta reutilizar una familia compatible y, si no existe, FACT-001 genera una nueva familia sectorial reutilizable. Nunca se mezcla conocimiento privado entre empresas.

## 3. Familias por red social

Cada plataforma social materialmente distinta dispone de su propia **Platform Family**. El conocimiento común se comparte; las diferencias de algoritmo, formatos, distribución, publicidad, conversación, grupos, comercio, vídeo, búsqueda y políticas se encapsulan en la familia de plataforma.

Secuencia inicial:

1. Facebook + FINANCIAL_REAL_ESTATE.
2. Facebook + TECH_PRODUCTS_AI.
3. Instagram + ambas familias.
4. LinkedIn + ambas familias.
5. Repetir con las restantes redes actuales y futuras.

## 4. Capas de conocimiento

El contexto de un agente o subagente social se compone por capas:

`COMMON_CEREBRO → SOCIAL_COMMON → SECTOR_FAMILY → PLATFORM_FAMILY → COMPANY → BRAND → TERRITORY → AUDIENCE/PERSONA → CAMPAIGN/OBJECTIVE → ROLE/SPECIALIST → LEARNING/PRECEDENTS`

El conocimiento compartido se referencia, no se duplica innecesariamente.

## 5. Facebook Family Factory V1

La primera Platform Family definida es **FACEBOOK** para **FINANCIAL_REAL_ESTATE**.

### Agentes funcionales principales

- FB-00 FAMILY FACEBOOK ORCHESTRATOR
- FB-01 MARKET INTELLIGENCE
- FB-02 TERRITORIAL INTELLIGENCE
- FB-03 AUDIENCE & BUYER PERSONA
- FB-04 FINANCIAL AUDIENCE SPECIALISTS
- FB-05 REAL-ESTATE AUDIENCE SPECIALISTS
- FB-06 STRATEGY
- FB-07 OFFER & FUNNEL
- FB-08 CONTENT PLANNING
- FB-09 COPY & PERSUASION
- FB-10 HOOK LAB
- FB-11 CTA LAB
- FB-12 SCRIPT FACTORY
- FB-13 CREATIVE DIRECTION
- FB-14 IMAGE FACTORY
- FB-15 VIDEO PRODUCTION
- FB-16 VIDEO POSTPRODUCTION
- FB-17 AUDIO FACTORY
- FB-18 REELS FACTORY
- FB-19 MEME & CULTURE
- FB-20 FACEBOOK PAGE
- FB-21 FACEBOOK GROUPS
- FB-22 MARKETPLACE
- FB-23 LIVE & EVENTS
- FB-24 CREATOR & INFLUENCER
- FB-25 COMMUNITY
- FB-26 SOCIAL LEAD
- FB-27 CONVERSATION & MESSENGER
- FB-28 META ADS
- FB-29 EXPERIMENTATION
- FB-30 PERFORMANCE & DATA
- FB-31 TRACKING & INTEGRATION
- FB-32 LEARNING
- FB-33 BRAND & COMPLIANCE
- FB-34 MULTICOMPANY GOVERNANCE

Son **roles lógicos**, no servidores independientes.

## 6. Supervisión obligatoria por combinación RED × FAMILIA

No existe un único supervisor genérico para todas las redes ni un único supervisor genérico para todas las familias sectoriales.

Cada combinación material de `PLATFORM_FAMILY × SECTOR_FAMILY` debe disponer de su propio **Family Platform Supervisor**, especializado y con conocimiento completo de esa rama.

Ejemplos:

- `SUP-FB-FINANCIAL_REAL_ESTATE`
- `SUP-FB-TECH_PRODUCTS_AI`
- `SUP-IG-FINANCIAL_REAL_ESTATE`
- `SUP-IG-TECH_PRODUCTS_AI`
- `SUP-LI-FINANCIAL_REAL_ESTATE`
- `SUP-LI-TECH_PRODUCTS_AI`

Cuando aparezcan nuevas familias o redes, FACT-001 debe poder generar sus supervisores correspondientes.

### 6.1 Función del supervisor

El supervisor no es un simple checklist ni un copy-editor final. Es el **responsable de coherencia integral y certificación operativa de la rama**. Debe poder reconstruir por qué se hizo cada pieza, qué conocimiento debía aplicarse, qué políticas estaban vigentes y si el resultado final se ajusta exactamente a ello.

Debe verificar como mínimo:

- objetivo de negocio y campaña;
- conocimiento profesional vigente;
- conocimiento de la plataforma/red;
- conocimiento de la familia sectorial;
- conocimiento de empresa y marca;
- territorio y mercado local cuando aplique;
- buyer persona/audiencia;
- oferta, funnel y CTA;
- copy, hooks, guion y narrativa;
- imagen, vídeo, audio, edición y formato;
- requisitos técnicos y de publicación de la red;
- paid media cuando aplique;
- conversación, community y handoff de leads;
- tracking, datos y atribución;
- brand, compliance, legal y políticas de plataforma;
- coste y límites económicos;
- resultados históricos y precedentes;
- conocimiento aprendido recientemente;
- cambios externos recientes que puedan invalidar conocimiento anterior.

### 6.2 El supervisor debe tirar de todo lo que se sabe

Antes de certificar una salida, el supervisor compone dinámicamente:

`COMMON_CEREBRO + SOCIAL_COMMON + PLATFORM_FAMILY + SECTOR_FAMILY + COMPANY + BRAND + TERRITORY + AUDIENCE + CAMPAIGN + ROLE_OUTPUTS + POLICY_CURRENT + LEARNING_PRECEDENTS + CURRENT_EXTERNAL_CHANGES`

No basta con que cada especialista haya hecho bien su parte aislada. El supervisor comprueba la **coherencia entre todas las partes**.

### 6.3 Subagentes internos del supervisor

Cada Family Platform Supervisor puede activar revisores especializados:

- KNOWLEDGE-COVERAGE-REVIEWER
- PLATFORM-RULES-REVIEWER
- SECTOR-EXPERT-REVIEWER
- COMPANY-BRAND-REVIEWER
- TERRITORY-REVIEWER
- AUDIENCE-FIT-REVIEWER
- FUNNEL-OFFER-REVIEWER
- COPY-HOOK-CTA-REVIEWER
- CREATIVE-QUALITY-REVIEWER
- VIDEO-AUDIO-FORMAT-REVIEWER
- PAID-MEDIA-REVIEWER
- COMMUNITY-CONVERSATION-REVIEWER
- TRACKING-DATA-REVIEWER
- CLAIMS-FACT-CHECKER
- LEGAL-POLICY-COMPLIANCE-REVIEWER
- COST-MONEY-GUARD
- KNOWLEDGE-FRESHNESS-REVIEWER
- LEARNING-APPLICATION-REVIEWER
- ANOMALY-RISK-REVIEWER
- ROLLBACK-READINESS-REVIEWER

Son perfiles lógicos y gates compartidos cuando sea seguro; no implican servidores separados.

### 6.4 Independencia respecto al Orchestrator

El Orchestrator organiza y ejecuta el trabajo. El Supervisor **no depende de la conclusión del Orchestrator para aprobarla**.

`AGENTES/SUBAGENTES → ORCHESTRATOR → FAMILY PLATFORM SUPERVISOR → PUBLICACIÓN/EJECUCIÓN O DEVOLUCIÓN`

El Supervisor puede aprobar, devolver a un especialista concreto, pedir otra variante, pedir conocimiento adicional a CEREBRO, ordenar una nueva comprobación, degradar temporalmente una capacidad a shadow/copilot, bloquear ejecución dentro de sus permisos o escalar únicamente por HUMAN_REQUIRED canónico.

### 6.5 El supervisor también aprende y evoluciona

El Supervisor está sujeto a la misma regla universal de aprendizaje continuo y evolución proactiva. Debe estudiar cambios de plataforma, políticas, regulación, formatos, algoritmos, prácticas profesionales, resultados de sus propias decisiones, falsos positivos/negativos, incidencias posteriores y mejoras de otros supervisores compatibles.

Un supervisor con conocimiento obsoleto no puede seguir certificando indefinidamente.

### 6.6 Supervisión por empresa sin duplicar toda la arquitectura

No se crea un supervisor físico independiente por cada empresa. El `Family Platform Supervisor` se instancia con overlays de empresa, marca, territorio y campaña.

Ejemplo:

`SUP-FB-FINANCIAL_REAL_ESTATE + company_id=A + brand_id=A1`

`SUP-FB-FINANCIAL_REAL_ESTATE + company_id=B + brand_id=B1`

Así varias empresas de la misma familia comparten conocimiento sectorial y de Facebook, pero conservan separadas sus reglas, marca, clientes, datos privados, claims, territorios y métricas.

### 6.7 Tribunal independiente

El Supervisor no se certifica a sí mismo. Para promociones de autonomía, cambios materiales, nuevas capacidades, nuevas familias, nuevas redes o decisiones de alto impacto, entra un **Tribunal independiente** que carga el contexto exacto de la combinación juzgada.

## 7. Contrato multiempresa mínimo

Toda ejecución debe transportar como mínimo:

- `company_id`
- `brand_id`
- `business_family`
- `business_line`
- `platform_id`
- `supervisor_id`
- `country`
- `autonomous_community`
- `province`
- `municipality`
- `territory_id`
- `engine_id`
- `environment`
- `version`

## 8. Bootstrap automático de redes para una empresa nueva

`COMPANY DISCOVERY → SECTOR CLASSIFICATION → FAMILY MATCH/CREATE → DIGITAL FOOTPRINT → SOCIAL NETWORK AUDIT → PLATFORM FIT → TEAM GENERATION → SUPERVISOR GENERATION/BINDING → KNOWLEDGE COMPOSITION → BASELINE → SHADOW → COPILOT → LIMITED AUTONOMY → AUTONOMOUS WITH GUARDS`

## 9. Relevo del sistema/equipo social actual

`INVENTARIO → BASELINE → SHADOW → COPILOT → LIMITED_AUTO → AUTONOMOUS_WITH_GUARDS → FALLBACK/ROLLBACK`

Nunca se elimina una relación, integración, automatización, calendario, cuenta, histórico, contenido, tracking o workflow existente sin inventario, dependencias, backup, contrato, tests, PREPROD, OLD vs NEW y rollback.

## 10. Estados de autonomía social

- DRAFT_ONLY
- APPROVAL_REQUIRED
- LIMITED_AUTO_PUBLISH
- AUTONOMOUS_WITH_GUARDS

La autonomía se certifica por capacidad, empresa, marca, red, territorio, supervisor y versión.

## 11. HUMAN_REQUIRED

Solo: LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST.

## 12. Aprendizaje cruzado gobernado

CEREBRO puede promover únicamente patrones generalizables y gobernados. Datos de clientes, credenciales, contratos, información bancaria, expedientes, pricing privado e inteligencia estratégica no compartible permanecen aislados.

## 13. Factory First

FACT-001 debe poder generar para una nueva familia/red: manifest, config, data contracts, roles/agentes/subagentes, supervisor de plataforma × familia, permisos, políticas, knowledge packs, eventos, jobs, APIs/adapters, tests, evaluación/tribunal, observabilidad, costes, backup, rollback, rebuild, documentación y hooks de learning/training.

## 14. Regla de coste

Coste adicional objetivo: **0 €**.

`determinista → open-source/local → herramientas contratadas → free tier → self-hosted → servicio externo barato → pago justificado`

## 15. Estado actual

### HECHO

- Arquitectura por familias sociales multiempresa definida.
- Primera familia sectorial: FINANCIAL_REAL_ESTATE.
- Facebook V1 como primera Platform Family.
- 35 agentes principales y subespecialidades asociadas definidos conceptualmente.
- Relevo progresivo y no destructivo definido.
- Regla canónica de supervisor especializado por combinación `PLATFORM_FAMILY × SECTOR_FAMILY`.

### DEFINIDO

- TECH_PRODUCTS_AI como segunda familia prevista, sujeta a auditoría para AION.
- Facebook → Instagram → LinkedIn → restantes redes.
- Supervisores específicos por red × familia con overlays por empresa/marca/territorio/campaña.
- Tribunal independiente para promoción y cambios materiales.

### PLANIFICADO

- Auditoría física de activos sociales actuales.
- Knowledge Baseline por agente/subagente y supervisor.
- Implementación de manifests y contratos ejecutables.
- Shadow Mode Facebook.
- Facebook TECH_PRODUCTS_AI.
- Familias Instagram.
- Familias LinkedIn.
- Extensión al resto de redes.

### POR AUDITAR

- Estado físico de cuentas, permisos, automatizaciones, CRM, tracking, herramientas, calendarios y pipelines sociales existentes por empresa.
- Taxonomía definitiva de AION dentro de TECH_PRODUCTS_AI.
- Plataformas que merecen activación real por empresa futura.

## 16. Regla final

**Una nueva empresa no debe empezar construyendo redes desde cero.** CEREBRO debe detectar qué es, asignar o crear su familia sectorial, estudiar cada plataforma, generar el equipo lógico y su supervisor especializado, cargar conocimiento, probarlo contra el sistema actual y promover solo las capacidades demostradas.

`CONSERVAR → ENTENDER → CLASIFICAR → REUTILIZAR/CREAR FAMILIA → ESPECIALIZAR POR RED → SUPERVISAR CON CONOCIMIENTO COMPLETO → PROBAR → COMPARAR → PROMOVER → APRENDER → REUTILIZAR`
