# SEO-001 · Cierre de inventario WordPress, borradores V4.1 y proveedor fotográfico · 2026-11-06

**Estado:** `PREPROD_COMPLETED_SCOPE_SAFE_DRAFT_PLANS`, `PROD_AUTONOMY_HOLD`.

**Identidad:** company_id=fenix, engine_id=SEO-001, environment=PREPROD, version=V4.1. PR #22 DRAFT, sin merge. CEREBRO Gateway todavía no tiene conectado el proveedor fotográfico final.

## 1 · Inventario real CMS, sin escrituras

Se consultó el WordPress real mediante el conector propio `Cowboy_MCP_web`. La tabla `wp_db_health_report` verificó 34 `post` publicados, 11 borradores y 166 `page` publicadas, 14 borradores, 1 página en papelera. Se enumeraron con `wp_list_posts(post_type=post/page,status=any)` **45 entradas y 180 páginas, 225 registros**; la totalidad de los registros post/page devueltos con paginación (45/45 y 180/180).

Los slugs candidatos `comparar-dos-pisos-despues-visita-cordoba` y `derivacion-hipotecaria-comprador-inmobiliaria-cordoba` no aparecen entre esos 225 registros. **Esto NO acredita** ausencia de colisiones entre otros custom post types, en futuras modificaciones posteriores a la consulta o en rutas administradas fuera del CMS.

La comprobación intentó `wp_cli post list --name=...` como consulta restringida, pero el servidor devolvió `Call to undefined function shell_exec()`; NO se intentó activar `shell_exec` ni modificar configuraciones.

Nuevo inventario completo versionado `registry/seo001-v4-1-wordpress-post-page-slug-inventory-readonly-2026-11-06.json`. Nueve contenidos ya existentes se asocian como referencias de intención: B2C visita previa y capacidad de pago; B2B presentación de financiación, fases del seguimiento, reservas, datos económicos, coordinación arras y derivación de autónomos, más la landing municipal para inmobiliarias en Córdoba. Los contenidos originales **no se modificaron**. La canibalización real de consultas requiere todavía GSC y evaluación semántica independiente.

## 2 · Nuevos planes físicos para WordPress con V4.1 reales

Nuevo validador `runtime/seo-v4-1-wordpress-draft-guard-v0.mjs` que combina:

- Los dos HTML V4.1 recuperados **de artefacto real** y sus SHA exactos.
- Inventario real de 225 slugs con 0 coincidencias post/page.
- Mínimos y reglas anteriores de D13 y D31, conservación de los V3, prohibición de código activo HTML, URLs ajenas y contenido alterado.
- Contrato de WP: `wp_create_post`, `post_type=post`, `status=draft`, `dry_run=true`; NO constituye ejecución real ni permiso de escritura.

[GitHub Actions **42269571256**](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42269571256) **5/5 PASS**. Artefacto `seo001-v4-1-real-source-wordpress-draft-only-plans-no-write` ID **13528677329** con dos solicitudes completas en JSON (HTML + SHA) y manifiesto. Se examinó ZIP físicamente, contiene `b2c-wp-dryrun-plan.json`, `b2b-wp-dryrun-plan.json`, `manifest.json`, ambos `draft` y `dry_run=true`.

**Resultado exacto:** `TWO_WP_DRAFT_ONLY_PLANS_VALIDATED_NOT_EXECUTED`. **0 llamadas reales wp_create_post** y **0 llamadas dry-run desde este nuevo flujo**. Las antiguas pruebas dry-run sobre V3 no se confunden con V4.1.

## 3 · Detección de proveedores UMS sin suscripciones nuevas

Se examinaron conectores disponibles en esta sesión (Canva y Adobe), el registro de credenciales del repositorio y las fuentes oficiales de cuotas.

- Canva incluye generación de imágenes mediante cuotas mensuales; en Canva Gratis se documentan hasta 20 usos estándar/premium combinados según modalidad, y existen cuotas según plan. Fuente `https://www.canva.com/es_es/help/ai-access-variantb/`.
- Adobe Firefly ofrece determinadas generaciones diarias gratuitas, con límites, modelos y créditos que pueden cambiar. Fuente `https://helpx.adobe.com/creative-cloud/apps/generative-ai/generative-credits-faq.html`.
- OpenAI ofrece hoy modelos `gpt-image-2.5-flare` y `gpt-image-2.5-sunburst` mediante la API. El antiguo `gpt-image-1` se retiró el **23 de octubre de 2026**. La API de imágenes está tarificada por tokens. Fuentes `https://developers.openai.com/api/docs/guides/image-generation`, `https://developers.openai.com/api/docs/models/gpt-image-1` y `https://developers.openai.com/api/docs/pricing`.

**La disponibilidad en ChatGPT de Canva/Adobe no equivale a una integración del CEREBRO Gateway**, ni supone que el plan/cupo de la cuenta haya sido verificado. **No se han solicitado generaciones ni compras**. Registro `registry/seo001-ums-cloud-photo-provider-readiness-v1.json` marca candidatos en HOLD sin credenciales API acreditadas. [GitHub run **42270431260**](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42270431260) **3/3 PASS** del gate de coste y modelos retirados.

## 4 · Backup real WordPress, frontera de seguridad

Hostinger hPanel fue abierto con éxito en una sesión de navegador autenticada, mostrando `https://hpanel.hostinger.com/websites` y la web `fenixcapital.es`. El conector Opera disponible permite **leer y navegar, no pulsar** `Administrar web`; por eso NO se ejecutó descarga de backup.

Hostinger confirma que las copias completas de WordPress permiten descargar archivos y SQL desde `Websites → Manage site → Backups → Restore and download`, incluso a través de un enlace a la dirección registrada de la cuenta. Fuente `https://www.hostinger.com/support/5981435-how-to-download-backups-at-hostinger/`.

**Privacidad:** un respaldo integral del WordPress real podría contener clientes, contraseñas hash, claves, tokens, formularios y datos personales. Por tanto, NO debe subirse sin cifrar a GitHub Actions artifacts, repositorios ni chats. La restauración real debe efectuarse en infraestructura privada aislada con acceso restringido, copias cifradas y logs sin datos personales. La prueba anterior con MariaDB sintética (run 42247533380) no sustituye esto ni concede permisos para restaurar el WordPress real.

## 5 · Estado de autonomía verificable

| Etapa | Estado |
|---|---|
| V4.1, SHA, mínimos, 6 FAQ | HECHO, precontrol |
| Inventario WP 225 post/page + riesgo de solapamiento | HECHO, solo post/page |
| Dos planes V4.1 WordPress completos, dry-run | HECHO, no ejecutados |
| UMS ingreso de bytes y huellas | HECHO, imagen anterior no original |
| Proveedor de fotografía original con cuota verificada | BLOQUEADO |
| Backup real del CMS exportado y restaurado privadamente | BLOQUEADO |
| Revisión independiente SEO/YMYL y aprobación SHA | PENDIENTE |
| Producción autónoma y publicación | BLOQUEADO |

**Gates siguientes:** obtener acceso operativo a las acciones de Hostinger (clic/descarga) o método seguro equivalente; verificar cuota real gratuita de Canva/Adobe y vía CEREBRO Gateway; foto original por trabajo con licencia/QA; WordPress restauración real aislada; QA independiente y promoción gradual. No desactivar Core Guard en producción durante estas comprobaciones.

**Coste adicional por proveedor no aprobado = 0 llamadas**, y consumo de minutos de GitHub Actions de acuerdo con los límites de la cuenta, no coste monetario auditado.

Regla invariable: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
