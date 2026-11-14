# SEO-D32 · Aprendizaje editorial y visual del propietario · 06-11-2026

## Evidencia de aprendizaje directa

Fuente de criterio: indicaciones del propietario en el chat del proyecto el 6 de noviembre de 2026. Estas indicaciones son **feedback empresarial directo para trabajo en PREPROD**, pero todavía no equivalen a una nueva concesión IAM en GitHub ni a autorización de publicación. La estrategia principal sí se aprobó mediante comentario GitHub `6682124001`.

## Errores corregidos

- Artículos anteriores redactados por ChatGPT, no por el motor autónomo CEREBRO. No atribuir la autoría a motores no ejecutados.
- H1 antiguos largos y poco comerciales, especialmente para agencias.
- H2 numerados y redactados como manual, no como lenguaje natural dirigido al lector.
- Longitud demasiado extensa para las intenciones y buyer personas de estos dos primeros artículos.
- Copy generalista, exceso de explicaciones y poco enfoque en conversión y cercanía.
- Uso de dos puntos visibles en textos o encabezados, expresión «además» y cierre «en conclusión». Eliminación obligatoria por regla del propietario.
- Prosa artificial o repetitiva. No se admite plantilla fija de introducción o cierre ni se debe afirmar origen humano o indetectabilidad de IA por pasar un lint. CEREBRO es un sistema de orquestación con reglas y múltiples herramientas, no un único modelo generativo.
- Imágenes del artículo originales, llamativas, claras y diferentes por artículo. Sin NINGÚN texto/logotipo/marca de agua dentro de la fotografía. Título, ALT, leyenda, descripción, nombre de archivo, crédito, derechos y origen como datos externos en WordPress.

## Roles que aprenden estos criterios

D03 buyer persona, D13 redacción, D14 conversión, D15 inspección, D16 cumplimiento hipotecario, D26 imagen y licencias, D31 QA independiente y D32 formación. El resto de roles SEO heredan la política transversal cuando crean o revisan contenido. Ningún rol obtiene permisos nuevos por aprender.

## Ejercicio OLD vs NEW

**OLD** — `drafts/2026-11-06-b2c-comparar-pisos-cordoba.draft.html` y `drafts/2026-11-06-b2b-derivacion-comprador-cordoba.draft.html`. Dos pruebas técnicas antiguas en verde, pero el propietario rechazó su estilo.

**NEW** — `drafts/2026-11-06-b2c-comparar-pisos-cordoba-v2.draft.html` y `drafts/2026-11-06-b2b-derivacion-comprador-cordoba-v2.draft.html`. Ambos reescritos con H1 más cortos, H2 sin numerar, menor extensión, tono conversacional para cada persona y CTA específico.

**Control automatizado** — `runtime/seo-owner-editorial-visual-gate-v2.mjs` verifica encabezados, palabras no permitidas, dos puntos visibles, extensión, CTA y prohibiciones de textos/logos en órdenes de imagen. El antiguo copy se RECHAZA por esta regla; el nuevo pasa. Sin embargo, la calidad comercial de una prosa no se certifica solo con reglas.

**Pipeline físico** — GitHub Actions `42203493831` éxito, con los dos nuevos SHA256, JOB-001/D15/D31/tribunal HOLD. CI de estilo y briefs `42203281073` éxito. Control de no duplicados `42203973483` éxito.

## Integración real y restricciones

- Cola PREPROD actualizada en sitio conservando exactamente dos work IDs y el mismo slug por cada artículo, sin crear rutas SEO duplicadas; versiones OLD de Git preservadas.
- Histórico QA antiguo en ledger queda como evidencia de versiones supersedidas; la consulta de estado debe JOIN por `work_id` **Y** `source_git_blob_sha`.
- Se añadió una nueva fila técnica en el ledger PREPROD por cada nuevo SHA, sin sobreescribir recibos anteriores. `owner_editorial_approval=false`, `independent_professional_qa=false`, `publish=false`.
- Solicitud de medios se construye para **UMS-001**, reutilizando `CREATIVE-PROGRAMMATIC-RENDER-V1` o el adaptador autorizado que resulte operativo. Ninguna API de imagen se ha ejecutado ni se ha creado un archivo visual en este lote. El dispatch y cualquier gasto quedan bloqueados.
- Cuando el productor entregue un archivo, validar contraste visual, ausencia física de textos/logo, semántica de buyer persona, licencia, título/ALT/leyenda/descripcion en WordPress, hash SHA-256, hash perceptual y consulta al inventario global de imágenes. El verificador `preflightReturnedSeoMediaAsset` bloquea duplicado exacto y cercano, pero no sustituye inspección visual y requiere inventario previamente verificado.

## Qué se considera logrado

**HECHO** — nueva política de copy e imagen, borradores V2, controles de regresión, conexión a QA técnico real de CEREBRO, registro de roles, cola PREPROD y evidencia de versión.

**PARCIAL** — entrenamiento D32 está documentado y vinculado como referencia a los roles, pero no hay certificación de un agente generativo que haya producido por sí mismo los nuevos artículos.

**PENDIENTE** — generación física por la productora, control visual y licencias del activo real, revisión humana o agente independiente realmente identificado, aprobación editorial por digest nuevo, permisos de borrador y publicación WordPress bajo Core Guard con backup/rollback.

El objetivo para nuevas empresas es repetir **el circuito**, no forzarles las mismas palabras prohibidas ni el mismo tono sin configuración por `company_id`. Cada firma editorial se define por empresa.
