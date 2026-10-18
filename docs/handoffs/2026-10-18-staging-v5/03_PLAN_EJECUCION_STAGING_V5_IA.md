# PLAN DE EJECUCIÓN · STAGING V5 · IA

## FASE 0 · FREEZE / BACKUP / ROLLBACK
- Verificar integridad V4.
- Snapshot WordPress/config/plugin/theme/snippets.
- Punto de rollback verificable.
- Crear estado V5.

**Gate:** `RECOVERY_GATE=PASS`.

## FASE 1 · MATRIZ ÚNICA DE FINDINGS
Crear registro único:
`finding_id`, `layer`, `gate`, `url/component`, `root_cause`, `severity`, `confidence`, `evidence_old`, `planned_fix`, `owner`, `test`, `rollback`, `status`.

Deduplicar hallazgos que aparecen en varias capas.

## FASE 2 · INVENTARIO DE CAUSAS RAÍZ
Clasificar cada incidencia como:
`THEME`, `ELEMENTOR_TEMPLATE`, `GLOBAL_CSS`, `COMPONENT`, `SHORTCODE`, `PLUGIN`, `SNIPPET`, `FORM`, `CONTENT`, `MEDIA`, `ARCHITECTURE`, `ENVIRONMENT_POLICY`.

Resolver compartidos antes que individuales.

## FASE 3 · P0 DETERMINISTA
- Artefacto de test.
- Metas vacías.
- H1/heading/landmark mecánicos.
- Links legacy/redirects evitables.
- HTML/shortcodes/componentes rotos.
- Errores WP/JS evidentes.
- Mantener noindex STAGING.

## FASE 4 · CLASIFICACIÓN PAGE_TYPE + INTENCIÓN
Clasificar 204 URLs.
Crear `query/topic → URL propietaria`.
Detectar solapes reales antes de cambiar slugs.

## FASE 5 · URL STANDARD
Para cada URL:
- intención propietaria;
- legibilidad;
- estabilidad;
- slug;
- jerarquía;
- canonical objetivo;
- redirects;
- parámetros;
- inlinks;
- OLD→NEW solo si cambia.

No migrar URL solo porque “podría ser más corta”.

## FASE 6 · ARQUITECTURA / INTERNAL LINKING
- Separar navegación global vs contexto.
- Reducir sobreenlazado boilerplate.
- Hub → cluster → landing → apoyo editorial.
- Reforzar páginas débiles.
- No crear huérfanas.
- Breadcrumbs coherentes.

## FASE 7 · LOCAL DIFFERENTIATION
Para las 24 B2C casi idénticas:
- hechos locales verificables;
- intención y utilidad propia;
- bloques diferenciales reales;
- FAQ/CTA/contexto local auténticos;
- comparar con vecinas y pilar;
- no inventar.

Si no existe suficiente valor diferencial, recomendar consolidar/no crear antes que thin content.

## FASE 8 · LANDING GOLD STANDARD
Por arquetipo:
- hero: H1 + propuesta + confianza + CTA;
- problema/intención;
- beneficio/alcance;
- encaje/requisitos;
- proceso;
- prueba/caso real o claramente ilustrativo;
- decisión/límites/riesgos;
- FAQ útil;
- CTA final;
- enlaces de continuidad relevantes.

## FASE 9 · ARTICLE GOLD STANDARD
- resolver intención informativa primero;
- originalidad/valor añadido;
- completitud sin longitud artificial;
- H2/H3 por preguntas reales;
- ejemplos/tablas si ayudan;
- límites/excepciones;
- fuentes/fecha/autoría;
- YMYL review cuando aplique;
- CTA contextual;
- schema fiel.

## FASE 10 · E-E-A-T / YMYL
- identidad/autoría;
- fuente primaria/oficial;
- vigencia;
- revisión experta cuando claim material;
- separar caso real vs ilustrativo;
- evitar promesas no fundamentadas.

## FASE 11 · WEB ENGINEERING
- Astra/Elementor/templates;
- components/tokens;
- CSS/JS/HTML;
- WPCode/snippets;
- header/footer;
- dependencias;
- crédito Astra si existe vía segura;
- OLD vs NEW + rollback.

## FASE 12 · UI / DESIGN SYSTEM
- jerarquía;
- spacing;
- grid;
- cards;
- botones;
- forms;
- estados;
- tipografía;
- consistencia;
- tokens.

Regla visual Fénix:
- no estética morada/rosa dominante;
- blanco/negro/antracita/grises + naranja/amarillo;
- morado solo donde el activo oficial lo exija.

## FASE 13 · MOBILE / RESPONSIVE
Breakpoints mínimos:
`320, 360, 390, 768, 1024, 1440`.

Regla:
`H2/H3 → imagen → contenido → CTA`.

Revisar:
overflow, grids, cards, forms, sticky, menu, tap targets, imágenes, popups.

## FASE 14 · ACCESIBILIDAD
- landmarks;
- heading order;
- keyboard;
- focus;
- labels;
- accessible names;
- contrast;
- alt;
- forms/errors;
- semántica.
Objetivo operativo: WCAG 2.2 AA razonablemente demostrable.

## FASE 15 · IMÁGENES
- peso/formato;
- dimensiones;
- aspect-ratio;
- srcset;
- lazy/eager;
- alt/contexto;
- featured vs inline;
- duplicados;
- huérfanas;
- derechos/trazabilidad.

Prioridad:
27 >500 KB, 3 >1 MB, 516 usos sin width/height.

## FASE 16 · PERFORMANCE / CWV
Después de DOM/imágenes/diseño:
- Lighthouse móvil/desktop;
- LCP/CLS/INP/TBT;
- recursos críticos;
- scripts/styles.
No optimizar métricas aisladas sacrificando UX/función.

## FASE 17 · CRO
- una conversión primaria por template;
- CTA jerárquico;
- fricción;
- microcopy;
- confianza;
- WhatsApp/contacto/forms;
- lead magnets/newsletter solo donde aporten.

## FASE 18 · FORMS → CRM E2E
- submit válido;
- error;
- duplicado;
- consentimiento;
- source URL/UTM;
- endpoint;
- CRM fields;
- owner;
- SLA;
- idempotencia/retry;
- respuesta usuario.

## FASE 19 · ANALYTICS / CONSENT
- GA/Meta/otros;
- Complianz;
- before consent / accept / reject;
- eventos;
- atribución;
- persistencia preferencias.

## FASE 20 · SECURITY / PRIVACY / LEGAL
- HTTPS/headers;
- plugins/deps;
- WP permissions;
- spam;
- PII;
- cookies/legal pages.
Escalar solo lo jurídicamente obligatorio.

## FASE 21 · QA VISUAL PROFESIONAL
Opera Browser Connector preferente.
Capturas OLD/NEW:
home, pilares, landings, local B2C, local B2B, artículos, formularios, páginas auxiliares.
Desktop/tablet/mobile.

## FASE 22 · REGRESIÓN 204 URLS
Crawl completo tras lotes mayores:
HTTP, title, meta, H1-H6, canonical, robots, schema, enlaces, imágenes, forms/components, dependencies.

## FASE 23 · TRIBUNAL L01–L25 + GOLD GATES
Estado final por capa/gate:
`PASS`, `PASS_WITH_DOCUMENTED_EXCEPTION`, `HUMAN_REQUIRED`, `FAIL`.

Ningún FAIL crítico permite cierre.

## FASE 24 · BASELINE V5
Regenerar:
- copy HTML/txt/json;
- urls csv/json;
- tree;
- internal links;
- dependencies;
- images;
- usage;
- hashes;
- manifest;
- README;
- evidencias visuales/E2E/CWV.

## FASE 25 · OLD V4 vs NEW V5 + APRENDIZAJE
- diff por URL/componente;
- incidencias cerradas;
- incidencias residuales;
- regresiones evitadas;
- reglas aprendidas;
- nuevas heurísticas/gates/tests;
- runbook/changelog/rollback/rebuild.

## FASE 26 · PERSISTENCIA DOBLE
- CEREBRO/GitHub.
- Notion.
- Estado machine-readable.
- Paquete de continuidad.

## FASE 27 · STOP PRE-PROD
No tocar PROD.
Emitir `HUMAN_REQUIRED · HIGH_RISK` únicamente cuando todo STAGING esté listo y el único siguiente paso sea gate PROD.
