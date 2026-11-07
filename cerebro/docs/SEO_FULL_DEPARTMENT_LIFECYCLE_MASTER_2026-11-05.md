# CEREBRO SEO-001 · Departamento completo · Decisión operativa 2026-11-05

## 1. La fase de borradores NO ES el objetivo final

La aprobación manual de nuevos artículos y páginas es un mecanismo **temporal de entrenamiento**, para medir calidad, incorporar correcciones, certificar fuentes y crear confianza. Tras al menos tres publicaciones reales positivas del mismo tipo, más IAM, QA independiente, tribunal, mérito, backup, recuperación y permiso revocable concedido por el propietario, esa clase podrá optar a publicación autónoma.

SEO no se reduce a redacción. **Las 8 familias, 32 departamentos** investigan, auditan, encuentran oportunidades, arreglan incidencias de bajo riesgo cuando están autorizadas, mantienen la web, construyen autoridad, trabajan SEO local, SERP, RRSS, embudos y medición. Los cambios existentes de alto impacto no se autorizan por el hecho de haber aprobado artículos: necesitan su propia certificación.

## 2. Contrato ejecutivo

Archivo: `cerebro/seo-enterprise/v2/seo-all-departments-full-lifecycle-v1.json`. Cada departamento tiene una misión distinta, fuentes requeridas, runtime compartido y estado. La fábrica de agentes, IAM y Tribunal siguen siendo el control; no se crean 32 servidores ni 32 identidades falsas.

La escalera de autonomía L0–L4 distingue auditoría de lectura, borradores, nueva publicación autónoma acotada, arreglos auditados en páginas existentes y trabajo completo de ciudades. Ninguna promoción de nivel se autoriza sin aprobación del dueño sobre límites y evaluación.

## 3. Auditoría real de `https://fenixcapital.es` (solo lectura)

- Inventario WordPress: **166 páginas y 34 entradas publicadas**; 11 posts y 14 páginas en borrador. Es el recuento de WordPress, **no** de URL indexadas por Google.
- `robots.txt` y `sitemap_index.xml`: HTTP 200. El índice sitemap incluye páginas, entradas, categorías y LLMs. `post-sitemap.xml`: 34 loc en el cuerpo leído. `page-sitemap.xml`: HTTP 200 pero cuerpo truncado a unos 51 KB por la herramienta; **no** interpretar el fragmento como recuento completo de URLs.
- Se verificaron por Yoast metadatos de Jaén, Sevilla, Málaga, Home, hipoteca 100, calculadora de presupuesto y financiación B2B Córdoba. Los campos SEO de estas muestras estaban presentes. No se ha realizado todavía auditoría de los 200 objetos completos.
- Home PROD candidate redirige a la raíz y declara canonical `https://fenixcapital.es/`; no alterar sin tests OLD vs NEW.
- Plugin Core Guard `CITY_GROWTH_PLUGIN_EXECUTOR_V1` declara `pilot_certified:false`, `validation_certified:false`, `mass_rollout_allowed:false`. El piloto Jaén se invalidó `2026-10-06T17:39:50+00:00` por `live_revalidation_failed` con diagnóstico `CERT_SHAPE_MISSING_CERTIFIED`. El hecho de que una página responda 200 no resuelve la certificación. **Este es P0**: diagnosticar compatibilidad del certificado, verificar landing+contenidos+descargable+formularios+QA, restaurar gate sin saltar políticas.
- Google Search Console: la conexión `GSC_Wizard` respondió **payment_required**. No activar ni contratar. Buscar acceso gratuito directo con la cuenta que ya existe; entretanto no afirmar posiciones, clics, impresiones o canibalización empírica GSC sin datos. QA de canibalización será primero semántica/URL y después confirmación con consultas reales.
- No se ha conectado todavía Google Business Profile/GA4 para pruebas reales de resultados, ni Lighthouse CWV global; permanecen como trabajo por auditar.

## 4. Prioridad de trabajo

1. **P0:** resolver certificación de Jaén, sin publicaciones masivas ni modificar páginas a ciegas.
2. **P0:** recuperar medición SEO real por herramientas gratuitas, y auditar URLs/keywords/canibalización.
3. **P1:** auditar las 200 publicaciones con canonicals, indexabilidad y enlazado, preservando URLs buenas.
4. **P1:** auditar formularios de captación por buyer persona, CTAs, conversiones y CRM en lectura.
5. **P1:** SEO local por Córdoba→Jaén→Sevilla y provincias, autoridades y reseñas, sin duplicar fichas o contenido.
6. **P1:** terminar el piloto editorial #52656 con QA visual + aprobación humana; después entrenar y certificar su clase de publicaciones.

## 5. Continuidad y coste

- No tocar App, CRM, Supabase PROD, Trading ni WordPress publicado al generar este contrato.
- No nuevas suscripciones. El conector WordPress y la automatización de borradores existente siguen disponibles; ningún permiso de autoedición PROD nuevo.
- No declarar 32 departamentos listos ni GSC conectado: 15 departamentos parciales, 17 definidos y 0 certificados según la última matriz verificada.
- Contratos, estados, citas de evidencias y runbook se documentan en la PR protegida #22. 
