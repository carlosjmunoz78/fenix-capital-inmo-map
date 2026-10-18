# FÉNIX CAPITAL · STAGING · AUDITORÍA WEB MULTICAPA V1

**Fecha:** 2026-10-18  
**Empresa:** `fenix-capital`  
**Entorno:** `STAGING`  
**Baseline:** V4 · SHA256 `59944be1aba38d15a29991e7aa27579941382fc6dae701ef6032adfeae2f2b04`  
**Rama:** `cerebro/seo001-staging-audit-v5-20261018`  
**PROD tocado:** NO  
**Promoción PROD autorizada:** NO  
**Estado auditoría:** HECHO

## Resumen ejecutivo

Se han aplicado **25 capas profesionales** sobre el baseline V4: SEO técnico, arquitectura, on-page, contenido, intención/canibalización, local, imágenes, schema, off-page, AEO/GEO, E-E-A-T, ingeniería web, UX, UI/diseño, marca, responsive, accesibilidad, performance/CWV, CRO, formularios/CRM, analítica/consentimiento, seguridad/legal y operación/QA.

El núcleo técnico previo sigue sano: **204 URLs HTTP 200, 0 destinos internos rotos, 680 imágenes recuperables y 0 errores de exportación**. Esta auditoría ampliada encuentra trabajo PREPROD adicional que el PASS técnico V4 anterior no pretendía cubrir: **24 landings locales casi idénticas**, **Montserrat aplicada en 114 páginas pese a que el manual la reserva al logotipo**, 2 metas vacías, una página de test con H1 duplicado, arquitectura interna muy plana, imágenes pesadas/sin dimensiones y falta de evidencia real de CWV, QA visual, E2E CRM y consentimiento.

## Métricas maestras

- 204 URLs: 167 páginas, 32 posts, 5 categorías.
- 42.073 aristas internas, 263 externas y 51.129 dependencias.
- 212 targets internos HTTP: 0 rotos, 2 redirigidos.
- 680 imágenes: 487 usadas, 193 no usadas, 165 unattached en WP; 0 fallos binarios.
- 2 metas vacías; 7 titles >60; 1 title <30; 2 metas >160.
- 203/204 URLs con un solo H1; 1 página de test con 2 H1.
- 29 URLs sin `<main>`; 13 con salto de jerarquía de headings.
- 67 landings B2C locales + 24 B2B locales.
- 24 landings B2C forman 276 pares con similitud 5-shingle Jaccard >0,95.
- Montserrat aparece aplicada en CSS de 114/204 páginas.
- 27 imágenes usadas >500 KB; 3 usadas >1 MB; 516 usos renderizados sin width/height.
- Schema: Organization/Breadcrumb/WebSite 204; FAQPage 107; Service 22; Article 51; BlogPosting 32.
- Marcadores GA, Meta Pixel y Complianz en 204/204 capturas.

## Prioridad PREPROD

### P0 / gate antes de promover URLs afectadas
1. No promover `/cerebro-core-guard-final-test-20260903/` como página pública.
2. Pasar `LOCAL_DIFFERENTIATION_GATE` a las 24 landings casi idénticas, con hechos reales y sin inventar contenido.
3. Ejecutar Lighthouse/CWV y visual responsive QA con evidencia real.
4. Ejecutar formularios→CRM y consentimiento/tracking E2E.
5. En gate PROD verificar indexación, canonical, sitemap y robots del dominio oficial; no debilitar STAGING para simular PROD.

### P1
- Resolver 2 metas vacías y metadata extrema relevante.
- Reducir enlaces globales y reforzar nodos débiles.
- Normalizar enlaces de autor redirigidos.
- Corregir landmarks/headings.
- Optimizar imágenes pesadas, dimensiones y trazabilidad.
- Resolver incompatibilidad de Montserrat con el manual o aprobar formalmente una nueva norma de tipografía web.
- Retirar crédito Astra si existe vía segura y forma parte del diseño final.

---

## L01 · Crawlability & Indexability
**Owner:** SEO-001 + WAUD-001 · **Resultado:** PASS_STAGING / GATE_PROD
- 204/204 contenido = HTTP 200; ninguna URL de contenido redirige.
- 204 `noindex,nofollow` y canonical vacío: esperado en STAGING.
- 212 targets internos comprobados: 0 rotos, 2 redirects de autor.
**Acción:** en PROD validar `index,follow`, canonical, sitemap y robots por contrato de entorno.

## L02 · Technical SEO
**Owner:** SEO-001 + WAUD-001 · **Resultado:** ACCIONES
- 2 metas vacías; 7 titles >60; 1 title <30; 2 metas >160.
- Página de test con 2 H1 idénticos.
- Schema presente en 204 URLs.
**Acción:** corregir metadata/H1 afectados y automatizar gate WAUD-001.

## L03 · Architecture & Internal Linking
**Owner:** SEO-001 + WAUD-001 · **Resultado:** ACCIONES
- 42.073 aristas internas; ~206 referencias internas/documento.
- ~168 destinos internos únicos por página: arquitectura extremadamente plana.
- 13 URLs reciben inlinks desde ≤2 páginas; no hay huérfanas absolutas.
**Acción:** reducir navegación global no contextual, reforzar clústeres y budget de links.

## L04 · URL, Canonical & Redirect Hygiene
**Owner:** SEO-001 + WEB-001 · **Resultado:** PARCIAL
- 204 URLs de contenido estables; 0 redirects a nivel de contenido.
- Solo `/author/fenixcapital/` y `/author/mrbogart/` redirigen a home.
- Canonical vacío es política STAGING.
**Acción:** resolver links de autor y exigir canonicals/cadenas limpias en PROD.

## L05 · On-page Metadata & Headings
**Owner:** SEO-001 · **Resultado:** ACCIONES
- 203/204 con H1 único.
- Meta vacía en `/financiacion-compradores-inmobiliarias-montilla/` y `/category/hipotecas/`.
- 13 páginas con salto de heading, con frecuencia al pasar al H4 del footer.
**Acción:** normalizar por intención/semántica, no solo por longitud.

## L06 · Content, Semantics & Topical Authority
**Owner:** SEO-001 + Content · **Resultado:** ACCIÓN REQUERIDA
- 67 landings `asesor-hipotecario-{ciudad}` + 24 B2B locales.
- No hay titles/metas exactamente duplicados.
- 24 landings B2C generan 276 pares con Jaccard 5-shingle >0,95; máximo 0,981.
**Acción:** `LOCAL_DIFFERENTIATION_GATE` con entidad, hechos y contexto local verificables; no inventar datos.

## L07 · Keyword Intent & Cannibalization
**Owner:** KW-001 + SEO-001 · **Resultado:** PARCIAL / MEDICIÓN PENDIENTE
- No hay duplicidad exacta de title/meta.
- Similitud local + arquitectura plana elevan riesgo de intención poco diferenciada.
- El snapshot no prueba canibalización SERP.
**Acción:** mapa `query/topic → URL propietaria` y GSC query→URL tras indexación antes de redirecciones.

## L08 · Local SEO
**Owner:** SEO-001 + LOCALP-001 · **Resultado:** PARCIAL
- 67 B2C + 24 B2B locales y activos visuales locales.
- No se detectan `LocalBusiness`, `FinancialService` ni `MortgageLoan`; `Service` aparece en 22 URLs.
- GBP/NAP/reseñas/citas quedan fuera del baseline.
**Acción:** conectar LOCALP-001 y no crear ubicaciones ficticias.

## L09 · Image & Multimedia SEO
**Owner:** SEO-001 + WEB-001 + Multimedia · **Resultado:** ACCIONES
- 680 imágenes: 487 usadas, 193 no usadas, 165 unattached; 680/680 binarios OK.
- 8 alt vacíos a nivel media no están usados; 1.387 usos renderizados con `src` tienen alt no vacío.
- 516/1.387 usos sin width/height; 27 usadas >500 KB; 3 usadas >1 MB.
- `source_origin` vacío en 662 assets y `rights_license` en 603: gap de evidencia, no prueba de infracción.
- 28 grupos SHA exactos, 41 pHash exactos, 139 pares cercanos.
**Acción:** dimensiones, responsive images, compresión, revisión de duplicados y trazabilidad.

## L10 · Structured Data & Entity Graph
**Owner:** SEO-001 + WAUD-001 · **Resultado:** ACCIONES
- Schema en 204/204: Organization 204, BreadcrumbList 204, WebSite 204, WebPage 199, FAQPage 107, Article 51, BlogPosting 32, Service 22, WebApplication 2.
- Sin LocalBusiness/FinancialService/MortgageLoan.
**Acción:** validar contra contenido visible y construir entity graph fiel, sin schema inventado.

## L11 · Off-page Authority, Backlinks & Reputation
**Owner:** SEO-001 + REP/COMPET · **Resultado:** POR AUDITAR EXTERNO
- STAGING no aporta backlinks, dominios referentes, menciones ni reputación real.
**Acción:** auditar dominio oficial con GSC/fuentes gratuitas; no convertir compra de enlaces en dependencia.

## L12 · AEO / GEO / LLM SEO
**Owner:** SEO-001 + Research/Content · **Resultado:** PARCIAL
- 107 FAQPage y fuerte estructura pregunta/respuesta.
- Organization/Breadcrumb/WebSite globales.
- STAGING no demuestra citación ni rastreo en motores IA.
**Acción:** mejorar respuestas, fuentes, entidades y autoría; medir citabilidad separadamente.

## L13 · E-E-A-T, Trust & YMYL
**Owner:** SEO-001 + DOC-001 + Policy · **Resultado:** PARCIAL
- Hipotecas/financiación = YMYL.
- Existen quiénes somos, legal, privacidad, cookies, Organization y Person en 32 páginas.
- No se certifica revisión experta/vigencia de claims materiales.
**Acción:** registrar fuente, fecha y autoridad; separar casos reales de ilustrativos.

## L14 · Web Engineering / Web Creator / WordPress
**Owner:** WEB-001 + WAUD-001 · **Resultado:** ACCIONES
- Snapshot reproducible; header/nav/footer en 204/204.
- 29 páginas sin `<main>`.
- HTML medio ~218 KB; CSS inline mediano ~104 KB; JS inline mediano ~31,7 KB.
- Persiste crédito Astra.
**Acción:** converger a componentes/design system y landmarks semánticos con OLD vs NEW + rollback.

## L15 · UX & Information Experience
**Owner:** WEB-001 + Marketing/CRO · **Resultado:** ACCIONES
- CTAs en 204/204; mínimo 6, mediana 11.
- Formularios en 193/204.
- ~168 destinos internos únicos/página pueden crear sobrecarga cognitiva.
**Acción:** journeys claros, CTA primario/secundario y navegación reducida por intención.

## L16 · UI & Visual Web Design
**Owner:** WEB-001 + Brand capability · **Resultado:** PARCIAL VISUAL
- Viewport/header/nav/footer globales; CSS acumulado de varios sistemas/plantillas.
- El snapshot HTML/CSS no sustituye QA visual en breakpoints/navegadores.
**Acción:** inventario de componentes/tokens y visual regression desktop/tablet/mobile.

## L17 · Brand System Compliance
**Owner:** WEB-001 + BRANDBOOT capability · **Resultado:** ACCIÓN REQUERIDA
- Manual: colores corporativos/publicitarios `#222222`, `#870064`, `#FFB71B`, `#FF5F00`.
- Manual: Montserrat solo para representaciones del logotipo; no para títulos/texto general/publicidad.
- CSS aplica Montserrat en 114/204 páginas, incluidas landings locales y CTAs.
- Hay colores auxiliares de theme/componentes; su mera presencia técnica no prueba incumplimiento visual.
**Acción:** definir tipografía web aprobada o actualizar formalmente manual; crear tokens y QA de logo/clearspace/tamaños.

## L18 · Mobile & Responsive
**Owner:** WEB-001 + WAUD-001 · **Resultado:** PARCIAL
- 204/204 con viewport y reglas responsive.
- 516 usos de imagen sin width/height.
- No hay visual regression multi-dispositivo en el baseline.
**Acción:** QA 320/360/390/768/1024/1440 y CWV móvil.

## L19 · Accessibility / WCAG Readiness
**Owner:** WEB-001 + WAUD-001 · **Resultado:** PARCIAL
- `lang=es`, viewport y charset en 204/204.
- 0 imágenes renderizadas con `src` sin alt; alt vacío recurrente = tracking/decorativa observada.
- Honeypots correctamente `aria-hidden=true` y `tabindex=-1`; excluidos ellos, la heurística no encuentra inputs sin nombre.
- 29 páginas sin `<main>` y 13 con saltos de heading.
**Acción:** axe/Lighthouse + teclado/foco/contraste/lector de pantalla y corregir landmarks.

## L20 · Performance & Core Web Vitals Readiness
**Owner:** WEB-001 + WAUD-001 · **Resultado:** POR AUDITAR CWV
- HTML medio ~218 KB; CSS inline mediano ~104 KB; JS inline mediano ~31,7 KB.
- ~5,9 scripts externos/página; mediana 3 stylesheets, máximo 15.
- 27 imágenes usadas >500 KB, 3 >1 MB, 516 usos sin dimensiones.
- No hay LCP/INP/CLS medido; no se inventa PASS.
**Acción:** Lighthouse/PageSpeed móvil/desktop y optimización basada en evidencia.

## L21 · CRO, Conversion & Lead Generation
**Owner:** Marketing/CRO + WEB-001 · **Resultado:** PARCIAL
- CTAs en todas las URLs; 193/204 con forms.
- Solo 2 páginas con `tel:` y 1 con `mailto:`; funnel principalmente formulario/CTA.
**Acción:** una conversión primaria por template y medición submit→lead cualificado.

## L22 · Forms, CRM & Lead Integrity
**Owner:** WEB-001 + CRM-001 + Automation · **Resultado:** PARCIAL E2E
- 193 páginas con forms; mayoría action vacío/JS, por lo que el HTML no demuestra backend.
- Honeypots correctamente ocultos de accesibilidad en muestras revisadas.
- No se prueba CRM, dedupe, consentimiento persistido, idempotencia, reintentos ni alertas.
**Acción:** E2E PREPROD y contrato `form_id → endpoint → CRM fields → owner → SLA`.

## L23 · Analytics, Tracking, Consent & Attribution
**Owner:** OBS/Marketing + WEB-001 · **Resultado:** PARCIAL
- Marcadores GA, Meta Pixel y Complianz en 204/204.
- Sin marcador GTM separado; no implica falta de GA.
- La presencia de scripts no prueba consentimiento ni calidad de eventos.
**Acción:** test antes/después de consentimiento y diccionario de eventos/atribución.

## L24 · Security, Privacy & Legal Web
**Owner:** WEB-001 + SEC/Policy + Legal · **Resultado:** PARCIAL
- HTTPS y 0 assets mixtos HTTP detectados.
- Existen aviso legal, privacidad y cookies.
- No se certifican CSP/security headers, hardening, permisos, vulnerabilidades ni suficiencia jurídica.
**Acción:** hardening/headers/dependencias y revisión legal humana cuando sea obligatoria.

## L25 · Content Operations, Maintainability & Continuous QA
**Owner:** WAUD-001 + WEB-001 + SEO-001 + QA/EVA/LRN · **Resultado:** DEFINIDO PARA AUTOMATIZAR
- Baseline V4 ya preserva copy exacto, árbol, dependencias, imágenes, hashes y rollback.
- CEREBRO ya tiene SEO-001 y WEB-001; WAUD-001 está PLANIFICADO con el alcance adecuado.
- **No hacen falta 25 motores:** son capabilities/checklists versionadas.
**Acción:** registrar `WEB_QUALITY_LAYER_REGISTRY_V1`, hacer que FACT-001 genere/actualice skills y ejecutar el pipeline antes de promociones.

---

## Evidencia y límites

Fuente primaria: `docs/web-baseline/2026-10-18-v4/` · SHA256 `59944be1aba38d15a29991e7aa27579941382fc6dae701ef6032adfeae2f2b04`.

Fuentes de gobierno: especificación CEREBRO V2 (`SEO-001`, `WEB-001`, `WAUD-001`), Addendum Digital Build y Manual de marca Fénix Capital 2025.

No se inventan datos de GSC, backlinks, GBP, Lighthouse/CWV, visual regression, teclado/lector de pantalla ni CRM cuando el baseline no los contiene. Esas capas se mantienen PARCIAL/POR AUDITAR.

## Decisión CEREBRO

Registrar estas 25 capas como contrato reutilizable multiempresa bajo WAUD-001 y motores propietarios existentes, con coste adicional objetivo 0 €. **Este documento no autoriza PROD.**
