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

Continuidad V5:
`STAGING V5 · Traspaso Total IA · SUPERLOOP · 2026-10-18`

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

## 7. STATE VIVO · SUPERLOOP V5 · 2026-10-18

- `last_head_observed_before_this_state_commit`: `6b1e52025e26c2a1561e25241351dc47d47e77cd`
- `last_ci`: `39113766754` · CEREBRO Fenix STAGING V5 Acceptance · `failure`
- `lighthouse_home_desktop`: `PASS`
- `lighthouse_home_mobile`: `PASS`
- `lighthouse_local_mobile`: `PASS`
- `lighthouse_b2b_mobile`: `PASS`
- `visual_e2e_gate`: `RED`
- `consent_gate`: `PARTIAL/RED`
- `prod_touched`: `false`

### 7.1 FALLO EXACTO TRANSVERSAL

25 fallos de la matriz representativa no son 25 causas independientes. HOME, `LOCAL_B2C_CORE`, `LOCAL_B2C_DUP_CLUSTER`, `LOCAL_B2B` y BLOG reproducen:

`ReferenceError: elementorFrontendConfig is not defined`

origen observado:

`elementor/assets/js/frontend.min.js?ver=4.3.5`

PROFILE, PRODUCT, PROCESS, RESOURCE, CONTACT y LEGAL no reproducen ese error.

### 7.2 CAUSA TÉCNICA DEMOSTRADA HASTA ESTA CAPA

Run diagnóstico `39113766754` / commit `6b1e52025e26c2a1561e25241351dc47d47e77cd` compara una página roja local, una PROFILE verde y HOME roja.

En páginas rojas:
- `elementor-frontend-js` = presente.
- `elementor-frontend-js-before` = ausente.
- `configScriptCount = 0`.
- `window.elementorFrontendConfig` = ausente.
- body no contiene `elementor-page`.

En PROFILE verde:
- `elementor-frontend-js-before` = presente.
- el inline define `var elementorFrontendConfig = {...}`.
- `elementor-frontend-js` = presente después.
- `configScriptCount = 1`.
- `window.elementorFrontendConfig` = presente.
- body sí contiene `elementor-page`.

Conclusión demostrada: **el runtime frontend de Elementor se está encolando en determinadas páginas que no son páginas Elementor builder, pero la configuración inline que necesita no se genera en ellas**. Falta todavía identificar qué capa/hook concreto provoca ese enqueue global antes de declarar `root_cause` completamente cerrado.

### 7.3 HOME CANÓNICA · CORRECCIÓN DE ESTADO

La HOME viva es:
- post/page id: `52487`.
- título: `Fénix Capital · Home Andalucía V2 · PREPROD`.
- template: `elementor_header_footer`.
- Elementor: `has_data=false`, `data_bytes=0`, `edit_mode=''`, sin versión guardada.

La página 22 `Inicio`, inspeccionada durante una fase intermedia, **no es la HOME viva actual**. Cualquier conclusión que use su `_elementor_version 4.3.3` para explicar la HOME queda `OBSOLETE_EVIDENCE`.

Landings locales rojas observadas (p. ej. IDs `49107` y `49128`) tampoco tienen layout Elementor. BLOG `40858` solo conserva `_elementor_data=[]` y no está en modo builder. PROFILE `46028` y PRODUCT `47042`, que pasan, sí tienen layout builder guardado.

### 7.4 TRIALS CERRADOS

`TRIAL-ELEMENTOR-001`:
- variable aislada: `CEREBRO Pro-Free Compatibility V0 0.1.4-preprod`.
- backup/checksum previo registrado.
- desactivación temporal STAGING.
- resultado: el fallo persistió.
- rollback: plugin reactivado y verificado.
- conclusión: descartado como causa raíz única.

Trial de caché:
- no se detectó caché persistente activa.
- flush limpió/regeneró `Elementor generated CSS`.
- el problema no queda explicado por caché persistente.

### 7.5 CONSENTIMIENTO

En contexto Playwright limpio:
- requests GA/Meta antes de opt-in: `0` → bloqueo previo correcto.
- `body[data-cmplz] = 1`.
- nodos Complianz detectados: `1`.
- botones aceptar/rechazar detectados: `0`.
- scripts Complianz detectados por el diagnóstico: `0`.
- cookies iniciales: `0`.
- Complianz `7.5.6` activo.

Estado: `PARTIAL`. Falta demostrar banner/controles visibles en sesión limpia y transmisión elegible después del opt-in.

## 8. NEXT_BLOCK ÚNICO

`STAGING_V5_ELEMENTOR_ENQUEUE_ROOT_CAUSE`

1. localizar qué capa compartida encola `elementor-frontend` sobre páginas no-builder;
2. no fabricar `elementorFrontendConfig` como parche si puede eliminarse el enqueue incorrecto;
3. antes de modificar: backup/snapshot + dependencia + OLD;
4. aplicar la corrección mínima compartida solo en STAGING;
5. rerun selectivo visual/JS y comparar OLD vs NEW;
6. persistir `root_cause`, detector, regla reusable, prevention gate y automation candidate;
7. después cerrar `CONSENT_GATE`;
8. después QA visual/E2E con Opera;
9. solo con todos los gates verdes generar baseline V5 y traspaso final.

PROD continúa fuera de alcance.
