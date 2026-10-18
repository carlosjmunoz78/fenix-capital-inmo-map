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

## Gate de promoción

Ninguna capa autoriza PROD por sí sola. Para promoción deben existir backup/snapshot, contratos, tests, QA/evaluación, observabilidad, rollback/rebuild, coste medido y comparación PREPROD. Las métricas que requieren fuentes externas o ejecución real (GSC, backlinks, Lighthouse/CWV, visual regression, E2E CRM, consentimiento) deben quedar **POR AUDITAR/PARCIAL** hasta existir evidencia.

## Coste

Ruta por defecto: lógica determinista + Python/TypeScript/SQL + WordPress/GitHub/Notion/herramientas existentes + free tier. No añadir suscripciones para cubrir estas capas salvo imposibilidad o ROI aprobado.
