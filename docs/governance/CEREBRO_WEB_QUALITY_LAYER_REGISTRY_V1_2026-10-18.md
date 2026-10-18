# CEREBRO WEB QUALITY LAYER REGISTRY V1

**Fecha:** 2026-10-18  
**Ámbito:** multiempresa · `company_id + environment + version`  
**Objetivo:** contrato canónico de auditoría web/SEO/diseño PREPROD sin crear motores duplicados.  
**Regla:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## Decisión arquitectónica

CEREBRO ya dispone de `SEO-001` y `WEB-001`; `WAUD-001` está definido como Website Audit Engine y su gap canónico ya incluye SEO técnico, arquitectura, CWV, indexabilidad, schema, contenidos, conversión, formularios y seguridad básica. Por tanto **NO se crean 25 motores nuevos**. Este registro define 25 **capabilities/checklists de auditoría** que WAUD-001 debe orquestar y delegar al motor propietario.

`SEOBOOT-001` deberá consumir estas salidas al dar de alta una empresa. `FACT-001` deberá poder generar/versionar las skills de capa que falten, con tests, evaluación, observabilidad, coste, backup/rollback/rebuild y documentación.

## Capas obligatorias

| ID | Capa | Owner primario | Estado de cobertura estructural |
|---|---|---|---|
| L01 | Crawlability & Indexability | SEO-001 + WAUD-001 | DEFINIDO |
| L02 | Technical SEO | SEO-001 + WAUD-001 | DEFINIDO |
| L03 | Architecture & Internal Linking | SEO-001 + WAUD-001 | DEFINIDO |
| L04 | URL, Canonical & Redirect Hygiene | SEO-001 + WEB-001 | DEFINIDO |
| L05 | On-page Metadata & Headings | SEO-001 | DEFINIDO |
| L06 | Content, Semantics & Topical Authority | SEO-001 + DOC/Content capabilities | DEFINIDO |
| L07 | Keyword Intent & Cannibalization | KW-001 + SEO-001 | DEFINIDO |
| L08 | Local SEO | SEO-001 + LOCALP-001 | DEFINIDO |
| L09 | Image & Multimedia SEO | SEO-001 + WEB-001 + Multimedia capabilities | DEFINIDO |
| L10 | Structured Data & Entity Graph | SEO-001 + WAUD-001 | DEFINIDO |
| L11 | Off-page Authority, Backlinks & Reputation | SEO-001 + REP/COMPET capabilities | DEFINIDO |
| L12 | AEO / GEO / LLM SEO | SEO-001 + RSH/Content capabilities | DEFINIDO |
| L13 | E-E-A-T, Trust & YMYL | SEO-001 + DOC-001 + Policy | DEFINIDO |
| L14 | Web Engineering / Web Creator / WordPress | WEB-001 + WAUD-001 | DEFINIDO |
| L15 | UX & Information Experience | WEB-001 + Marketing/CRO capabilities | DEFINIDO |
| L16 | UI & Visual Web Design | WEB-001 + Brand capability | DEFINIDO |
| L17 | Brand System Compliance | WEB-001 + BRANDBOOT capability | DEFINIDO |
| L18 | Mobile & Responsive | WEB-001 + WAUD-001 | DEFINIDO |
| L19 | Accessibility / WCAG Readiness | WEB-001 + WAUD-001 | DEFINIDO |
| L20 | Performance & Core Web Vitals Readiness | WEB-001 + WAUD-001 | DEFINIDO |
| L21 | CRO, Conversion & Lead Generation | Marketing/CRO + WEB-001 | DEFINIDO |
| L22 | Forms, CRM & Lead Integrity | WEB-001 + CRM-001 + Automation | DEFINIDO |
| L23 | Analytics, Tracking, Consent & Attribution | OBS/Marketing + WEB-001 | DEFINIDO |
| L24 | Security, Privacy & Legal Web | WEB-001 + SEC/Policy + Legal | DEFINIDO |
| L25 | Content Operations, Maintainability & Continuous QA | WAUD-001 + WEB-001 + SEO-001 + QA/EVA/LRN | DEFINIDO_PARA_AUTOMATIZAR |

## Contrato mínimo por ejecución

Cada ejecución debe guardar: `company_id`, `engine_id/capability_id`, `environment`, `version`, timestamp, baseline/evidence hashes, alcance, métricas, hallazgos, severidad, confianza, acciones, owner, OLD vs NEW cuando haya cambios y estado de promoción.

Estados válidos de trabajo: **HECHO / EXISTENTE / PARCIAL / DEFINIDO / PLANIFICADO / POR AUDITAR**. Un audit `HECHO` significa que la capa fue evaluada con la evidencia disponible; no significa que esté libre de incidencias.

## Gold Standard obligatorio desde V5

Referencia canónica: `docs/governance/CEREBRO_WEB_GOLD_STANDARD_V1_2026-10-18.md`.

WAUD-001 / SEO-001 / WEB-001 deben añadir, sin crear motores nuevos, estos gates transversales a toda auditoría PREPROD:

- `URL_STANDARD_GATE`
- `PAGE_PURPOSE_GATE`
- `LANDING_STANDARD_GATE`
- `LOCAL_DIFFERENTIATION_GATE`
- `ARTICLE_STANDARD_GATE`
- `YMYL_TRUST_GATE`
- `FENIX_VISUAL_POLICY_GATE` para Fénix
- `MOBILE_SECTION_ORDER_GATE` para Fénix y como capability configurable para otras empresas.

### Reglas Fénix explícitas y vinculantes

1. **UI web sin estética morada ni rosa.** La interfaz debe priorizar blanco, negro/antracita, grises y acentos naranja/amarillo. El `#870064` puede seguir existiendo en el manual y activos oficiales, pero no será color protagonista de fondos, botones, cards, gradientes o acentos recurrentes salvo excepción documentada/activo inseparable. Esto no autoriza a modificar el logo oficial.
2. **Móvil: heading → imagen → contenido.** Cuando una sección tenga heading e imagen asociada, el orden objetivo es `H2/H3 → imagen → contenido → CTA`. Se debe corregir en template/componente cuando sea causa común y validar que el DOM/orden accesible no se degrade.
3. **Causa raíz antes que parche por URL.** Si un defecto procede de template, CSS global, bloque reutilizable o componente, se repara ahí y se ejecuta regresión sobre todas las URLs afectadas.
4. **“Mejor URL / landing / artículo” es un contrato auditable, no una opinión estética.** Debe existir intención propietaria, estructura adecuada al arquetipo, evidencia, UX/CRO, YMYL cuando corresponda y OLD vs NEW.

### Arquetipos mínimos que WAUD-001 debe clasificar

`HOME`, `SERVICE_PILLAR`, `PRODUCT_TYPE`, `AUDIENCE_PROFILE`, `LOCAL_B2C`, `LOCAL_B2B`, `B2B_SERVICE`, `PROCESS_GUIDE`, `IMPROVEMENT_SERVICE`, `RESOURCE_TOOL`, `ARTICLE_INFORMATIONAL`, `CASE_STUDY`, `ABOUT_TRUST`, `LEGAL`, `CONTACT_CONVERSION`, `CATEGORY_ARCHIVE`, `SYSTEM_TEST`.

Cada arquetipo tendrá thresholds y checklist propios. No se aplica una plantilla única a todas las URLs.

## Gate de promoción

Ninguna capa autoriza PROD por sí sola. Para promoción deben existir backup/snapshot, contratos, tests, QA/evaluación, observabilidad, rollback/rebuild, coste medido y comparación PREPROD. Las métricas que requieren fuentes externas o ejecución real (GSC, backlinks, Lighthouse/CWV, visual regression, E2E CRM, consentimiento) deben quedar **POR AUDITAR/PARCIAL** hasta existir evidencia.

Desde V5, además, ninguna URL afectada puede promoverse si falla un gate Gold Standard aplicable. Un `PASS` de L01–L25 no compensa un `FAIL` crítico de intención, URL, YMYL, mobile order o política visual.

## Coste

Ruta por defecto: lógica determinista + Python/TypeScript/SQL + WordPress/GitHub/Notion/herramientas existentes + free tier. No añadir suscripciones para cubrir estas capas salvo imposibilidad o ROI aprobado.
