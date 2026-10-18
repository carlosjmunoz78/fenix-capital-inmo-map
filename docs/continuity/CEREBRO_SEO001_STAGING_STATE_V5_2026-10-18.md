# CEREBRO SEO001 · STAGING STATE V5 · 2026-10-18

company_id: `fenix-capital`  
environment: `STAGING`  
status: `PARCIAL_CONTROLLED`  
prod_touched: `false`

## HECHO

- `GLOBAL_ALT_ROOT_CAUSE_AND_FINAL_V4_CERTIFICATION` cerrado.
- El `images_missing_alt=1` común procede del píxel oculto Meta del snippet WPCode `47197`, con `alt=""`. Clasificación: `JUSTIFIED_DECORATIVE_TRACKING_PIXEL_FALSE_POSITIVE`. No modificar a ALT descriptivo.
- 8 sustituciones de imagen confirmadas físicamente: Utrera `56126`, Villacarrillo `56093`, Bormujos `56253`, Arahal `56254`, Dos Hermanas `56255`, Bailén `56257`, Camas `56279`, Torredonjimeno `56287`.
- 67 URLs locales revalidadas por lotes Jaén/Córdoba/Sevilla/capitales, sin transport failure ni rejected. H1/title/meta/schema válidos en evidencia viva. Los bloqueos `canonical_present`, `canonical_self` y `not_noindex` son esperados en STAGING.
- Sitemap auditado: 165 páginas + 32 posts + 5 categorías = 202 URLs.
- WordPress mantiene 204 objetos públicos: 167 páginas + 32 posts + 5 categorías. Fuera del sitemap: política de privacidad noindex y página técnica Core Guard.
- Media library: 699 objetos; 689 imágenes; 1 vídeo; 6 documentos; 3 archives; 174 unattached.
- 404 interno real encontrado: `/cuanto-me-puedo-gastar/`. Se corrigieron las referencias desde Lopera `51908`, Peñarroya-Pueblonuevo `49117` y Bujalance `49104` hacia `/precio-maximo/`, destino comprobado HTTP 200.
- Revalidación post-fix batch `70cfc115-5724-4546-a8c9-85130d48ae27`: 3/3 procesadas, HTTP 200, H1 único, title/meta presentes, schema válido. Referencias exactas restantes al target antiguo en páginas y posts publicados: 0.
- Alertas iniciales de H1 en cookies y schema en refinanciación/reunificación eran caché obsoleta; cache-bust confirmó estado correcto.
- Core Guard: `health=100`, smoke OK, cerebro-status OK, observer y operaciones bloqueadas por defecto.

## EVIDENCIA DE LOTES

- 165 páginas sitemap: `4d508c69-ffa3-400d-8d15-48c74dabb9d0` · 165/165 · failed 0 · rejected 0.
- 32 posts + 5 categorías: `96685da5-4d7f-46f2-8e68-73d20d47dbf1` · 37/37 · failed 0 · rejected 0.
- Revalidación link-fix: `70cfc115-5724-4546-a8c9-85130d48ae27` · 3/3 · failed 0 · rejected 0.

## PARCIAL / LIMITACIONES EXACTAS

1. Core Guard RC12 `preprod-readiness`: único fallo de infraestructura `schema_version=missing`. No promover RC13 a ciegas; existe reconciliación canónica pendiente y riesgo de perder companions de PROD.
2. `/category/hipotecas/`: title Yoast por defecto y meta description no expuesta aunque la descripción de categoría está guardada. El conector actual no expone writer seguro de taxonomy-Yoast. Dejar para capa SEO técnica previa a PROD; no hackear Astra.
3. Hash de imágenes: el contrato exige SHA256 + perceptual hash. El conector actual expone metadatos, no bytes/hash, y el runtime local no obtiene el binario de STAGING. Estado `PARCIAL_TECHNICAL_CAPABILITY_GAP`; no inventar hashes.
4. Link graph completo origen→destino: destinos sitemap 202 validados y un 404 real reparado, pero la extracción exhaustiva de todos los orígenes está limitada por el interfaz actual de búsqueda de contenido. Queda como requisito obligatorio del baseline global siguiente.
5. Fuente/derechos: presente en los assets corregidos inspeccionados; todavía no declarar completo para las 689 imágenes de biblioteca.

## DECISIONES DE GOBIERNO

- PROD no tocado.
- No convertir el píxel Meta en un falso error ALT.
- No instalar/promover RC13 para conseguir verde aparente.
- No parchear theme/Yoast sin contrato, snapshot, PREPROD y rollback.
- No fabricar evidencia SHA/pHash.
- Cierre V4/V5 = `PARCIAL_CONTROLLED`, no `GREEN_TOTAL`.

## NEXT_BLOCK

Solo después de cerrar este bloque: generar el baseline integral PRE-PROD solicitado por Carlos y persistirlo en Notion + CEREBRO:

1. copy exacto de cada URL;
2. árbol completo de URLs, jerarquías, dependencias y enlazado;
3. mapa de todas las imágenes con media ID, archivo, URL, formato, dimensiones, peso, título, ALT, leyenda, descripción, páginas/URLs de uso, destacado/inline, duplicados, huérfanas, fuente/derechos y hashes cuando exista acceso binario fiable.

Después: `SEO técnico → arquitectura/enlazado → SEO on-page/copy → imágenes → schema → conversión → QA → STAGING vs PROD → promoción controlada`.

## SUPERLOOP

`EJECUTA → PRUEBA → CORRIGE → VUELVE A PROBAR → DOCUMENTA → SIGUE`

Solo detener por: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.
