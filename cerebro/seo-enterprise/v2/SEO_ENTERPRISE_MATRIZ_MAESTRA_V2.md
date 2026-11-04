# CEREBRO OS · SEO ENTERPRISE · MATRIZ MAESTRA V2

**Fecha:** 2026-11-05  
**Estado:** DEFINIDO / PARA FABRICACIÓN Y VALIDACIÓN, NO OPERATIVO POR DEFECTO.  
**Prioridad:** FACT-001 → SEO-001, preservando los motores, la web y los sistemas existentes.  
**Precedencia:** Esta matriz V2 sustituye **como propuesta objetivo** la distribución provisional de 14 departamentos/3 familias/42 agentes/210 subagentes de la PR #22; no implica borrar artefactos históricos ni alterar producción. Las cantidades de agentes/subagentes se decidirán tras el inventario y la matriz de competencias; no usar 5 subagentes por departamento como cuota fija.

## 1. Principios vinculantes

1. **Los agentes y subagentes realizan el trabajo**, no WordPress ni un plugin. El plugin propio, REST, Abilities, navegador y herramientas externas son **adaptadores auxiliares** con permisos mínimos, idempotencia, resultados verificables y rollback.
2. Mantener SEO-001 y motores existentes; el nuevo organigrama son **roles lógicos compartiendo runtime**, no 32 nuevos servidores ni nuevos motores redundantes. Datos multiempresa: `company_id`, `engine_id`, `environment`, `version`.
3. Factibilidad y coste adicional 0 €; lógica determinista → software abierto/local → servicios existentes → free tier. No exigir IA de pago ni suscripciones nuevas. No hacer depender SEO de WPVibe ni introducir Make por defecto.
4. **STAGING (staging.fenixcapital.es) = construcción y pruebas WEB**. **PROD (fenixcapital.es) = protegida**. La App/CRM reales no tienen PREPROD sustituta. Ninguna promoción sin inventario, mapa de dependencias, snapshot, pruebas OLD vs NEW, backups, E2E, veredicto independiente y rollback ensayado. No confundir la existencia de STAGING con aislamiento físico verificado.
5. No tocar, sobrescribir, borrar ni rehacer lo existente sin la cadena CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. Ninguna URL válida desaparece automáticamente; control anticanibalización y SEO local con valor real.
6. Toda especialidad se define por **competencias, contratos, tareas, herramientas y evidencias de resultados**: un rol documental no equivale a un trabajador operativo.

## 2. Ocho familias PROFESIONALES y 32 departamentos

| Familia | Departamento 1 | Departamento 2 | Departamento 3 | Departamento 4 |
|---|---|---|---|---|
| **F1 Dirección estratégica SEO** | D01 Estrategia y dirección | D02 Inteligencia de mercado | D03 Investigación de clientes y buyer personas | D04 Crecimiento, priorización y rentabilidad |
| **F2 Investigación y posicionamiento** | D05 Keyword research e intención | D06 Análisis SERP y formatos | D07 Competencia, gaps y oportunidades | D08 Arquitectura semántica, clusters y anticanibalización |
| **F3 Ingeniería SEO avanzada** | D09 Rastreo, indexación y canonicals | D10 JavaScript, renderizado y SEO técnico avanzado | D11 Arquitectura web, taxonomías y enlazado interno | D12 Datos estructurados, entidades y búsqueda enriquecida |
| **F4 Copywriting y producción editorial** | D13 SEO copywriting y contenido | D14 Copywriting persuasivo y de conversión | D15 UX writing y microcopy | D16 Investigación, edición, fact-checking y autoridad editorial |
| **F5 SEO local y autoridad** | D17 Google Business Profile y SEO local | D18 Reputación, reseñas y NAP | D19 Digital PR, relaciones y enlaces legítimos | D20 SEO internacional, multilingüe y geográfico |
| **F6 Experiencia web y conversión** | D21 UX, diseño e información | D22 Desarrollo web, CMS, WordPress/Elementor | D23 Core Web Vitals, accesibilidad y seguridad web | D24 CRO, experimentación, formularios, embudos y CRM |
| **F7 Nuevas superficies de búsqueda** | D25 AEO/GEO y visibilidad en IA | D26 SEO de imágenes, vídeo y YouTube | D27 Ecommerce SEO: categorías, productos, facetas y Merchant | D28 Búsqueda social, distribución orgánica y descubrimiento |
| **F8 Datos, operaciones y mejora** | D29 Search Console, GA4, medición y fuentes | D30 Atribución comercial, analítica avanzada y pruebas | D31 QA, auditoría SEO, publicación y releases | D32 Aprendizaje, benchmarks, training y optimización |

**Nota:** habilidades adicionales como migraciones, robots/sitemap, SEO programático controlado, Discover, performance digital, reputación, auditoría semántica, marketing de contenidos, CRO, privacidad/consentimiento, calidad publicitaria y automatización se asignarán a un departamento como **skills, agentes o subagentes** si las pruebas de cobertura muestran necesidad. No omitirlas solo porque no aparezcan literalmente en el título.

### F4: cobertura obligatoria de copywriting

SEO copywriter de servicios y landings; copywriter transaccional/persuasivo; copywriter YMYL hipotecario-financiero; copywriter inmobiliario; editorial de blog, pillar y recursos descargables; UX writer de formularios y flujos; investigador/fact-checker; editor de estilo, QA y marca; redacción multiformato (emails de captación, newsletters, guiones y snippets). No asignar simultáneamente creación y aprobación final al mismo trabajador.

## 3. Familias SECTORIALES (eje separado y combinable)

**S1 Hipotecaria y financiera**, **S2 Inmobiliaria**, **S3 Ecommerce**, **S4 Tecnología/SaaS**. Son adaptaciones de las 32 competencias comunes, no 4 duplicaciones automáticas del organigrama. Fénix empieza por S1 y S2, con especialidades B2B inmobiliarias y B2C particulares. Otros sectores se añaden cuando haya una empresa real y el benchmark pruebe qué especialización se necesita. Ciudades, idiomas, plataformas o buyer personas **no son nuevas familias profesionales**.

## 4. Estructura de agentes, subagentes y control

- Dirección SEO general → 8 líderes de familia profesional → responsables de departamentos (reusar roles compatibles) → subagentes por competencia verificable. El supervisor independiente, el tribunal de evaluación y la guardia de seguridad comparten control sin convertirse en redactores/productores de su propia materia a evaluar.
- Cada rol incorpora `manifest`, responsable, propósito, skills, inputs/outputs, contratos, permisos mínimos, herramientas, evidencias, tests, conocimiento, evaluación, coste, observabilidad, backup/rollback, runbook, versionado y training hooks.
- Los subagentes hacen el **trabajo ordinario real** (investigan, redactan, analizan, diseñan, preparan y verifican). Las herramientas (plugin, API, navegador) ejecutan solamente instrucciones autorizadas. Utilizar FACT-001 para scaffolds y workers existentes.

## 5. Política UNIVERSAL DE EXCELENCIA, PREMIOS, FORMACIÓN Y SUSTITUCIONES

**Aplica absolutamente a TODOS:** agentes principales, subagentes, directores, responsables, supervisores, QA, tribunal, jueces, verificadores, guardianes y quienes evalúan a los demás. **Nadie puede autopuntuarse, autopremiarse, autohabilitarse, autopromocionarse ni elegir unilateralmente a su reemplazo.**

Cada rol tendrá: historial de misiones y evidencia; score de calidad/veracidad, resultados medidos, cumplimiento de política/seguridad, fiabilidad, eficiencia/coste y aprendizaje; objetivos y umbrales **adaptados al puesto**; evaluación independiente cruzada; registro explicable de méritos y errores; feedback correctivo; training con reexamen; ranking comparable solo entre roles/competencias equivalentes; auditoría del tribunal y del propio tribunal.

**Premios de mérito:** insignias/niveles verificables, asignación prioritaria de tareas según especialidad, más autonomía **dentro de permisos ya autorizados**, acceso prioritario a training, promoción a supervisor o nuevas competencias **solo tras benchmark y evaluación independiente**. Nunca dinero, presupuesto, credenciales ni nuevos permisos críticos por puntuación automática.

**Sustituciones:** si el rendimiento cae o existen errores reiterados, abrir plan de mejora → formación → reentrenamiento → examen de regresión → comparación OLD vs NEW en LAB → shadow/canary → sustitución controlada únicamente tras superar pruebas, con rollback y continuidad del historial. Incidentes de seguridad, riesgo alto o conflictos de política interrumpen ejecución conforme al gate HUMAN_REQUIRED. No reemplazos automáticos irreversibles ni pérdida del conocimiento adquirido.

**Reglas anti-manipulación:** tribunal no juzga su propio desempeño; supervisores/tribunal tienen meta-supervisión independiente; checks de conflicto de intereses y doble verificación; evidencia no inventada; incentivos no pueden premiar volumen de contenidos si reducen calidad o posicionamiento; no prometer rankings garantizados.

## 6. Pipeline operativo y definición de LISTO

`Inventario → mapa dependencias → snapshot/backup → análisis de gaps → FACT-001 scaffolds → role/skill/knowledge binding → pruebas de competencias → delegación real → ejecución LAB → STAGING aislado → QA multidisciplinar → supervisor/tribunal → OLD vs NEW → rollback probado → autorización de promoción conforme a política → canary PROD → seguimiento → learning/rewards/retraining/replacements`.

**Por departamento, LISTO requiere:** 1) manifiestos reales ligados al runtime; 2) agentes/subagentes competentes identificados sin cuota artificial; 3) jobs y API/eventos funcionales; 4) fuentes/knowledge verificados; 5) permisos y adaptadores autorizados; 6) tests unitarios, integración y de comportamiento; 7) al menos un caso práctico con pruebas y logs inspectables; 8) evaluación independiente y política de mérito aplicada; 9) coste medido; 10) backup/rebuild/rollback y runbook; 11) evidencia persistida y estado rastreable en Engine Registry; 12) STAGING E2E cuando exista integración web. **No llamar LISTO al organigrama o scaffold.**

**Bloqueos de producción:** indexabilidad/noindex y canonical correctos por ambiente; sin pérdida de URL; diseño responsive/Elementor intacto; formularios→CRM y consentimiento E2E; claims YMYL validados; canibalización controlada; medición GSC/GA4 cuando realmente accesibles; rollback real; aprobación de gate autónomo según política. La promoción desde STAGING no significa sobrescribir la base de datos de PROD. Publicar cambios granulares/versionados, no clonar producción a ciegas.

## 7. Continuidad e inventario existente

- GitHub: `carlosjmunoz78/fenix-capital-inmo-map`; PR de arquitectura provisional #22: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/22 (DRAFT, NO MERGE); la matriz V2 es la propuesta rectora **sujeta a materialización**.
- `SEO-001`, `FACT-001`, `KW-001`, `WAUD-001`, `LOCALP-001`, `SEOBOOT-001`, etc., son motores a conservar, envolver y auditar, no reemplazar.
- STAGING: `https://staging.fenixcapital.es`, WordPress 7.1.4; lectura previa: 125 páginas publicadas, 11 borradores y 30 entradas publicadas, portada ID 56359; Core Guard verificó la Home en lectura aislada sin bloqueos. No usar ese resultado como certificación de toda la web.
- PROD: `https://fenixcapital.es` (no modificar sin gates). App/CRM reales protegidos; Trading LAB aislado.
- Mantener CITY_COMPLETE_V2 y sus entregables para Córdoba, Jaén, Sevilla y futuras ciudades, sin prometer ciudades terminadas sin leads/consentimiento/CRM/newsletters/indexación/evidencia.

## 8. Fuente de verdad y precedencia

Este documento establece **arquitectura objetivo V2**, no certificación de despliegue. Los registros físicos, tests, permisos y despliegues verificados prevalecen al declarar estado **HECHO / EXISTENTE / PARCIAL / DEFINIDO / PLANIFICADO / POR AUDITAR**. El chat de continuación debe ejecutar la fabricación y dar pruebas de lo que realmente quede LISTO, sin inventar resultados. Actualizar manifest, registry, dependencias, documentación, changelog, tests, auditoría y rollback en cada cambio.