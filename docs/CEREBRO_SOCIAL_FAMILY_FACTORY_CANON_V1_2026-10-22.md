# CEREBRO OS · SOCIAL FAMILY FACTORY · CANON V1

**Fecha:** 2026-10-22  
**Estado:** DEFINIDO / DOCUMENTAL / PREPROD-ONLY  
**company_id:** GLOBAL  
**engine_id:** FACT-001  
**environment:** PREPROD  
**version:** 1.0.0

## 1. Decisión canónica

CEREBRO no debe construir una agencia de redes sociales distinta para cada empresa ni una arquitectura cerrada alrededor de una marca concreta.

Debe existir una **Social Family Factory multiempresa y multired** capaz de generar, especializar, probar, desplegar y mejorar equipos lógicos de marketing social para cualquier empresa que entre en CEREBRO.

La unidad reutilizable no es la empresa actual. La unidad reutilizable es:

`SOCIAL_CORE + SECTOR_FAMILY + PLATFORM_FAMILY + COMPANY_OVERLAY + BRAND_OVERLAY + TERRITORY_OVERLAY + CAMPAIGN_CONTEXT`

Por tanto, una empresa concreta —incluida la primera empresa financiera hoy conectada a CEREBRO— es una **instancia**, nunca el nombre ni el límite de la arquitectura.

## 2. Familias sectoriales

### 2.1 Primera familia

**FINANCIAL_REAL_ESTATE** · Familia financiera / inmobiliaria.

Debe poder atender múltiples empresas diferentes pertenecientes a la misma familia: intermediación financiera, hipotecas, inmobiliarias, obra nueva, inversión, servicios inmobiliarios, captación, compraventa, valoración, B2B inmobiliario y futuras líneas compatibles.

Cobertura territorial objetivo:

`Andalucía → resto de España`

La territorialidad es una dimensión separada de la familia. Una misma familia debe poder operar por país, comunidad autónoma, provincia, municipio, ciudad, barrio o zona sin duplicar la arquitectura.

### 2.2 Segunda familia planificada

**TECH_PRODUCTS_AI** · Familia de productos tecnológicos e IA.

AION deberá encajar en esta familia o en una especialización derivada si la auditoría futura demuestra que necesita separación material. No se fuerza la taxonomía antes de auditar producto, mercado, compradores, canales y modelo de negocio.

### 2.3 Regla universal de nueva familia

Cuando entra una empresa de un sector no cubierto:

1. CEREBRO investiga sector, subsegmentos, cliente, competencia, regulación, geografía, canales y modelos de adquisición.
2. Busca si una familia existente cubre el caso con suficiente similitud.
3. Si sí: reutiliza la familia y crea overlays específicos.
4. Si no: FACT-001 genera una nueva familia sectorial estándar.
5. La nueva familia se convierte en patrimonio reutilizable para empresas futuras compatibles.

Nunca se mezcla conocimiento privado entre empresas.

## 3. Familias por red social

Cada plataforma social materialmente distinta dispone de su propia **Platform Family**. El conocimiento común se comparte; las diferencias de algoritmo, formatos, distribución, publicidad, conversación, grupos, comercio, vídeo, búsqueda y políticas se encapsulan en la familia de plataforma.

Secuencia inicial acordada:

1. **Facebook + FINANCIAL_REAL_ESTATE** — diseño actual.
2. **Facebook + TECH_PRODUCTS_AI** — futura especialización para AION y productos tecnológicos.
3. Investigación profunda de **Instagram** y creación de las dos familias sectoriales sobre Instagram.
4. Investigación profunda de **LinkedIn** y creación de las dos familias sectoriales sobre LinkedIn.
5. Repetir con las restantes redes relevantes, una por una, incluyendo futuras plataformas.

CEREBRO mantendrá un catálogo de capacidades para todas las redes estudiadas, pero una empresa nueva solo activará en producción las plataformas con encaje demostrado. No se debe obligar a toda empresa a publicar en todas las redes sin evidencia de valor.

## 4. Capas de conocimiento

El contexto de un agente o subagente social se compone en este orden:

1. `COMMON_CEREBRO`
2. `SOCIAL_COMMON`
3. `SECTOR_FAMILY`
4. `PLATFORM_FAMILY`
5. `COMPANY`
6. `BRAND`
7. `TERRITORY`
8. `AUDIENCE/PERSONA`
9. `CAMPAIGN/OBJECTIVE`
10. `ROLE/SPECIALIST`
11. `LEARNING/PRECEDENTS`

El conocimiento compartido se referencia, no se duplica innecesariamente.

## 5. Facebook Family Factory V1

La primera Platform Family definida es **FACEBOOK** para la familia **FINANCIAL_REAL_ESTATE**.

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

Estos son **roles lógicos**, no 35 servidores. Comparten runtime, workers, datos, eventos, observabilidad y tooling siempre que el aislamiento sea seguro.

Cada agente principal puede activar subagentes especializados: investigadores, buyer-persona analysts, trend scouts, hooks, CTAs, copywriters, guionistas, diseñadores, fotógrafos, iluminación, locución, sonido, editores, Reels, animación, VFX, memes, grupos, Marketplace, creators, community, leads, Messenger, media buyers, analítica, experimentación, tracking, compliance y aprendizaje.

## 6. Contrato multiempresa mínimo

Toda ejecución de una Social Family debe transportar como mínimo:

- `company_id`
- `brand_id`
- `business_family`
- `business_line`
- `platform_id`
- `country`
- `autonomous_community`
- `province`
- `municipality`
- `territory_id`
- `engine_id`
- `environment`
- `version`

Los campos territoriales pueden ser nulos cuando no apliquen, pero el contrato debe soportarlos.

## 7. Bootstrap automático de redes para una empresa nueva

Cuando Company Registry incorpore una nueva empresa, CEREBRO debe poder ejecutar:

`COMPANY DISCOVERY → SECTOR CLASSIFICATION → FAMILY MATCH/CREATE → DIGITAL FOOTPRINT → SOCIAL NETWORK AUDIT → PLATFORM FIT → TEAM GENERATION → KNOWLEDGE COMPOSITION → BASELINE → SHADOW → COPILOT → LIMITED AUTONOMY → AUTONOMOUS WITH GUARDS`

Para cada red:

- estudiar presencia actual;
- estudiar competencia;
- estudiar usuarios y buyer personas;
- identificar formatos y capacidades necesarias;
- seleccionar agentes/subagentes;
- cargar conocimiento sectorial, de red, empresa, marca y territorio;
- conectar datos, CRM y tracking permitidos;
- probar sin efectos reales;
- comparar OLD vs NEW;
- promover progresivamente.

## 8. Relevo del sistema/equipo social actual

La Factory no sustituye de golpe lo existente.

Secuencia obligatoria:

`INVENTARIO → BASELINE → SHADOW → COPILOT → LIMITED_AUTO → AUTONOMOUS_WITH_GUARDS → FALLBACK/ROLLBACK`

Fases:

1. **Shadow:** CEREBRO propone pero no ejecuta.
2. **Copilot:** prepara trabajo y el sistema/humano actual valida.
3. **Limited Auto:** asume únicamente capacidades certificadas.
4. **Autonomous With Guards:** ejecuta trabajo ordinario y escala excepciones.
5. **Fallback:** el sistema anterior permanece disponible hasta demostrar rollback y estabilidad.

Nunca se elimina una relación, integración, automatización, calendario, cuenta, histórico, contenido, tracking o workflow existente sin inventario, dependencias, backup, contrato, tests, PREPROD, OLD vs NEW y rollback.

## 9. Estados de autonomía social

Estados canónicos iniciales:

- `DRAFT_ONLY`
- `APPROVAL_REQUIRED`
- `LIMITED_AUTO_PUBLISH`
- `AUTONOMOUS_WITH_GUARDS`

La autonomía se certifica por capacidad, empresa, marca, red, territorio y versión. No existe una promoción global implícita.

## 10. HUMAN_REQUIRED

Solo se permiten los motivos canónicos:

- `LEGAL_REQUIRED`
- `SIGNATURE_REQUIRED`
- `LOW_CONFIDENCE`
- `HIGH_RISK`
- `POLICY_CONFLICT`
- `SECURITY_INCIDENT`
- `MONEY_LIMIT`
- `CUSTOMER_HUMAN_REQUEST`

## 11. Aprendizaje cruzado gobernado

CEREBRO debe aprender de todas las empresas sin mezclar datos confidenciales.

Puede promover a capas compartidas únicamente patrones generalizables y gobernados, por ejemplo:

- estructura de hooks;
- formatos de vídeo;
- patrones de retención;
- métodos de experimentación;
- aprendizajes de plataforma;
- heurísticas creativas;
- buenas prácticas de reporting;
- procesos de QA y compliance.

Datos de clientes, precios privados, contratos, expedientes, credenciales, información bancaria o inteligencia estratégica específica permanecen en su ámbito autorizado.

## 12. Factory First

FACT-001 debe poder generar automáticamente para una nueva familia/red:

- manifest;
- config;
- data contracts;
- roles/agentes/subagentes;
- permisos;
- políticas;
- knowledge packs;
- eventos;
- jobs;
- APIs/adapters;
- tests;
- evaluación/tribunal;
- observabilidad;
- costes;
- backup;
- rollback;
- rebuild;
- documentación;
- hooks de learning/training.

No se crean decenas de servicios físicos cuando roles lógicos compartidos son suficientes.

## 13. Regla de coste

Coste adicional objetivo: **0 €**.

Orden de preferencia:

`determinista → open-source/local → herramientas contratadas → free tier → self-hosted → servicio externo barato → pago justificado`

La IA de pago no es requisito para que exista una familia social.

## 14. Estado actual

### HECHO

- Decisión conceptual de arquitectura por familias sociales multiempresa.
- Definición de la primera familia sectorial: `FINANCIAL_REAL_ESTATE`.
- Definición de Facebook V1 como primera Platform Family.
- Lista funcional inicial de 35 agentes principales y subespecialidades asociadas.
- Decisión de relevo progresivo, no destructivo.

### DEFINIDO

- Segunda familia prevista: `TECH_PRODUCTS_AI`, sujeta a auditoría antes de especializar AION.
- Orden de expansión: Facebook → Instagram → LinkedIn → restantes redes.
- Reutilización automática para futuras empresas y creación automática de nuevas familias cuando no exista encaje.

### PLANIFICADO

- Auditoría física de activos sociales actuales.
- Knowledge Baseline por agente/subagente.
- Implementación de manifests y contratos ejecutables.
- Shadow Mode Facebook.
- Familia Facebook `TECH_PRODUCTS_AI`.
- Investigación y familias Instagram.
- Investigación y familias LinkedIn.
- Extensión al resto de redes.

### POR AUDITAR

- Estado físico de cuentas, permisos, automatizaciones, CRM, tracking, herramientas, calendarios y pipelines sociales existentes por empresa.
- Taxonomía definitiva de AION dentro de `TECH_PRODUCTS_AI`.
- Qué plataformas merecen activación real para cada empresa futura.

## 15. Regla final

**Una nueva empresa no debe empezar construyendo redes desde cero.**

CEREBRO debe detectar qué es, asignarle o crear su familia sectorial, estudiar cada plataforma, generar el equipo lógico apropiado, cargar conocimiento, probarlo contra el sistema actual y promover solo las capacidades demostradas.

`CONSERVAR → ENTENDER → CLASIFICAR → REUTILIZAR/CREAR FAMILIA → ESPECIALIZAR POR RED → PROBAR → COMPARAR → PROMOVER → APRENDER → REUTILIZAR`
