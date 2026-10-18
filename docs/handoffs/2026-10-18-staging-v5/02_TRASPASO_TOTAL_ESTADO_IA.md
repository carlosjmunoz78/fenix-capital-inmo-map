# TRASPASO TOTAL · ESTADO IA · FÉNIX CAPITAL STAGING V5

## 1. IDENTIDAD

- `company_id`: `fenix-capital`
- `environment`: `STAGING`
- `engine_scope`: `SEO-001 + WEB-001 + WAUD-001 + owners delegados`
- `working_version`: `V5 remediation`
- `old_baseline`: `V4`
- `old_baseline_sha256`: `59944be1aba38d15a29991e7aa27579941382fc6dae701ef6032adfeae2f2b04`
- `repo`: `carlosjmunoz78/fenix-capital-inmo-map`
- `branch`: `cerebro/seo001-staging-audit-v5-20261018`
- `prod_touched`: `false`
- `promotion_authorized`: `false`

## 2. ESTADO REAL ACTUAL

### HECHO
- Baseline V4 reproducible y persistido.
- 204 URLs de contenido auditadas.
- 680 imágenes inventariadas y recuperables.
- 0 destinos internos rotos.
- 25 capas L01–L25 auditadas y guardadas en CEREBRO + Notion.
- Gold Standard V1 definido y guardado.
- Reglas visuales/móvil Fénix convertidas en gates.
- Auditoría maestra y Gold Standard verificados en Notion.
- CEREBRO Web Quality Layer Registry actualizado.

### HALLAZGOS PRINCIPALES
- 42.073 aristas internas; arquitectura excesivamente plana.
- 2 metas vacías.
- 1 artefacto de test con dos H1.
- 24 landings B2C locales casi idénticas: 276 pares con Jaccard 5-shingle >0,95; máximo 0,981.
- Montserrat aparece en CSS de 114/204 páginas aunque el manual la reserva al logotipo.
- 27 imágenes usadas >500 KB; 3 >1 MB.
- 516 usos renderizados sin width/height explícitos.
- 29 URLs sin `<main>`.
- 13 páginas con saltos de jerarquía de headings.
- 2 redirects internos residuales de autor.
- GA, Meta Pixel y Complianz aparecen en 204/204, pero consentimiento real no está E2E probado.
- Formularios presentes en 193/204, pero backend/CRM/dedupe/idempotencia no están demostrados por HTML.
- CWV/Lighthouse y visual regression real siguen pendientes.
- Persistía crédito nativo Astra en footer.
- Off-page/backlinks/GSC requieren fuente externa/PROD, por tanto no inventar PASS.

## 3. FUENTES CANÓNICAS

- `docs/web-baseline/2026-10-18-v4/`
- `docs/web-audit/2026-10-18-v4-multilayer/FENIX_STAGING_WEB_MULTILAYER_AUDIT_V1_2026-10-18.md`
- `docs/web-audit/2026-10-18-v4-multilayer/layers/`
- `docs/governance/CEREBRO_WEB_QUALITY_LAYER_REGISTRY_V1_2026-10-18.md`
- `docs/governance/CEREBRO_WEB_GOLD_STANDARD_V1_2026-10-18.md`
- `docs/ops/FENIX_STAGING_CERTIFICACION_V4_2026-10-18.md`
- `docs/ops/FENIX_STAGING_V4_STATE_2026-10-18.json`

## 4. NOTION CANÓNICO

Página maestra:
`FÉNIX CAPITAL · STAGING · Auditoría Web Multicapa V4 · 2026-10-18`

Gold Standard:
`Gold Standard V1 · URL, landing, artículo y reglas visuales/móvil`

Los 25 informes L01–L25 están como subpáginas de la auditoría maestra.

## 5. REGLAS EXPLÍCITAS DEL USUARIO

- No estética morada/rosa dominante.
- Priorizar blanco, negro/antracita, grises, naranja/amarillo.
- Mantener el morado solo donde el activo oficial/manual lo exija; no convertirlo en lenguaje principal de UI.
- En móvil, para secciones con imagen: `heading → imagen → contenido → CTA`.
- Buscar la mejor URL, mejor landing y mejor artículo por arquetipo e intención, no por plantilla única.
- Guardar todos los resultados en CEREBRO y Notion.
- Aprender de cada cambio para que la próxima web pueda auditarse/corregirse automáticamente.
- Usar Opera Browser Connector para UI/E2E cuando esté disponible.
- No parar salvo HUMAN_REQUIRED real.
- No tocar PROD.

## 6. DECISIONES ARQUITECTÓNICAS

- No crear 25 motores nuevos.
- Las 25 capas son capabilities/checklists orquestadas por WAUD-001 y delegadas a motores existentes.
- FACT-001 debe poder generar/actualizar skills/gates faltantes.
- Reparar causa raíz compartida antes que edición repetitiva de páginas.
- V4 permanece inmutable para OLD vs NEW.
- V5 será el baseline corregido.
- Cambios de URL solo si el beneficio supera el riesgo; si URL existente cumple, conservarla.
- Local SEO: no fabricar diferenciación ficticia.
- YMYL: trazabilidad reforzada.
