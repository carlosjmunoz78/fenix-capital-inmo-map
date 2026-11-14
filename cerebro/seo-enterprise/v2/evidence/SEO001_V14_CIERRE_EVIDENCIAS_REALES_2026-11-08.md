# SEO-001 · Expediente unificado de evidencias físicas y autorización · 2026-11-08

Estado: **LAB / PREPARADO PARA REVISIÓN / PROHIBIDA PUBLICACIÓN**. Fuente: conectores autenticados GitHub, WordPress Cowboy, Supabase (lecturas), metadatos de archivos y legislación oficial. NO es un acta de certificación de producción.

## 1. Integridad de los artículos V7

- B2C `compradores-V7-REVIEW-ONLY.html` SHA-256 `c4d9ccbf5175884033edb7c0c350bcbf48f7202b36250c691ed9969172c69918`.
- B2B `inmobiliarias-V7-REVIEW-ONLY.html` SHA-256 `a01cd9e03baeb421c5565658197eb2a63ff2a63833066991b2183feb1156beec`.
- Ambos están en `cerebro/seo-enterprise/v2/drafts/v7-semantic-review-only/`; son candidatos LAB, **no** aprobación editorial independiente ni contenido desplegado en WordPress.
- Copia y regresión V7, pruebas local responsive V8, integridad de cuatro fotos V9, preparación V10/V11, PHP B2B V12 y HTTP local idempotente y reversible V13: GitHub Actions verde, pero cada capa tiene **alcance limitado**.
- V13 run https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42473590980; datos ficticios, rollback de archivo local, nunca CRM positivo.

## 2. Revisión jurídica/financiera basada en fuentes, pendiente firma independiente

**B2C, artículo 17.11 de la Ley 49/1960 (LPH)** — https://www.boe.es/eli/es/l/1960/07/21/49/con . La atribución al propietario al momento de exigibilidad se refiere a **derramas para mejoras** en los términos legales. No extrapolar a toda deuda de comunidad ni afirmar que un pacto privado desplaza automáticamente obligaciones frente a la comunidad. Exigir revisión del pacto concreto, fechas y certificación de deuda.

**B2C, seguros hipotecarios** — Banco de España https://clientebancario.bde.es/pcb/es/blog/seguro-hipotecas.html y https://clientebancario.bde.es/pcb/es/menu-horizontal/productosservici/financiacion/hipotecas/guia-textual/primerospasoscon/Seguros_hipotecarios.html . Puede requerirse cobertura en ciertos casos; diferenciar seguro de daños, hogar multirriesgo, contratación con banco y pólizas alternativas equivalentes. No prometer que toda póliza se acepta sin comprobar condiciones.

**B2B, arras y retrasos de tasación** — art. 1454 CC https://www.boe.es/eli/es/rd/1889/07/24/(1)/con . No calificar automáticamente todo anticipo como arras penitenciales, ni deducir resolución, penalización o pérdida por el mero retraso de tasación. Revisar contrato, condición suspensiva de financiación, plazos y cronología documental.

**B2B, expectativas hipotecarias** — Banco de España https://clientebancario.bde.es/pcb/es/menu-horizontal/podemosayudarte/criterios/Que_debemos_sa_4ecd45752ae5661.html . No hay aprobación bancaria garantizada ni plazo universal para concesión. Exigir estado verificable de tasación y consentimiento para difundir información financiera.

Esta revisión documental identifica fuentes y riesgos; **no es la firma de un profesional colegiado** ni acredita que cada párrafo sea legalmente correcto en todos los supuestos. Exigir revisión independiente con `reviewer_role`, versión/fecha normativa, SHA exacto, objeciones, firma, vigencia y decisión. `LEGAL_REQUIRED`.

## 3. Activos multimedia V9 — comprobación de procedencia

| ID WP | Post | SHA-256 de JPEG real | CMS declara |
|---|---:|---|---|
| 52718 | 52713 | `a5cc42939469c07caba061b46d34170a525a9b1324021e21171785f15a584716` | OpenAI gpt-image-2.5-flare, escena ficticia |
| 52719 | 52714 | `8dcbcfbabc06c58ce44bced09863ef86694d1daabdf1a40d0a628aa2f4fdd64c` | OpenAI gpt-image-2.5-flare, escena ficticia |
| 52720 | 52715 | `6764114aeaf98c85a984112b210e1d096f55eeda41272f91b6bd33aa5cb6344f` | OpenAI gpt-image-2.5-flare, escena ficticia |
| 52721 | 52716 | `33ae5c24d1118a6938feed5b8a45248345c1d0efb42e8310f1f010c130552d8f` | OpenAI gpt-image-2.5-flare, escena ficticia |

Todos JPEG decodificados, 1536×1024; 0 duplicados exactos o próximos (dHash umbral 8), ALT y pie presentes. **Ningún metadato de WP equivale al recibo original de proveedor o a la autorización de derechos.** Buscar registro original generado, cuenta autorizada, fecha, relación entre salida original y archivo WP con transformaciones SHA trazadas, posibles marcas y derechos de uso según términos aplicables. No volver a pagar por imágenes existentes ni fabricar recibos.

## 4. WordPress: inventario de recuperación y QA visual

- WordPress tiene cuatro borradores actuales vinculados a 52713/52714/52715/52716; no se han publicado en estas operaciones.
- Checkpoint DB `72`, 2026-11-07 21:08:30, antes de plugin partner B2B, 124 tablas, 39.955.944 bytes, `verifiable=true`.
- Checkpoint DB `71`, 2026-11-07 17:51:23, antes de ajuste de plantilla individual, 124 tablas, 40.133.575 bytes, `verifiable=true`.
- Archivos `uploads/fenix-cerebro-maintenance-backups/` observados son ZIP de **plugin** de septiembre; `uploads/backup/2026/` solo muestra meses anteriores, no noviembre. Estos hallazgos no demuestran que Hostinger carezca de backup fuera de `wp-content`.
- **La DB sola no permite acreditar restauración completa de archivos/themes/plugins/uploads/DB.** Localizar backup completo coincidente en el gestor Hostinger o proveedor; extraerlo a entorno aislado, validar SHA/consistencia, restaurar DB+archivos, comparar rutas/medios y ensayar rollback completo. No restaurar sobre web real ni cargar backups privados a GitHub Actions.
- Vistas previas autenticadas 52715/52716 verificadas visualmente en escritorio. Capturas V8 de HTML sintético 390/1440 son **maquetas**, no screenshot móvil real de WordPress. La prueba real móvil sigue pendiente: 390px y 1440px con sesión autorizada y documento exacto; comprobar H1, foto focal, enlaces, CTA, formularios, consentimiento, desbordamiento, tipografía, rendimiento y meta.

## 5. Captación B2B y Supabase

- Plugin WP activo Partner Form 0.2.0 limita `/cerebro-seo001/v0/partner-lead` a IDs autorizados (52661,52663,52714,52716) y **rechaza otros hosts**. Bridge Leads 1.3.6-preprod envía a proyecto PROD para el dominio real.
- V12, funciones PHP originales extraídas y HTTP interceptado: 45 checks PASS (validación, consentimiento, idempotencia, rate limiting y fallos). V13: 2 HTTP loopback, 1 registro **ficticio** persistido y leído, 1 reenvío deduplicado, eliminación del archivo y estado cero. `real_CRM_positive_E2E=false`.
- Supabase separado `hnqlnvakzaywtafeiybt` `ACTIVE_HEALTHY`; `fenix-web-lead-preprod` v14 está activa, con `verify_jwt=false`; invoca ingesta y potencialmente cola de alertas, autorespuestas, newsletter y tareas. Dos funciones DB en esquema public son SECURITY DEFINER; sin triggers personalizados en las cuatro tablas de web leads inspeccionadas. **No enviar un formulario ficticio** sin aislar esos efectos y demostrar reversión.
- Para cerrar E2E: entorno verdaderamente aislado, datos exclusivamente ficticios, receptor de CRM segregado, correo/alertas/webhooks desactivados y comprobados, receipt de idempotencia, consulta positiva, eliminación o rollback físico comprobado; después conectar el mismo contrato de envío de forma reversible. Ninguna solicitud enviada por este expediente a Supabase.

## 6. IAM y primeras publicaciones

- 191 plantillas SEO y 573 ejercicios de entrenamiento preparados, no equivalen a identidades IAM verificadas. Gateway actual en shadow, publicación autónoma desactivada.
- Verificar identidades de menor privilegio, segregación editor/revisor/publicador, permisos WordPress y revocación real, idempotencia, kill-switch, observabilidad y `company_id/engine_id/environment/version`.
- Tras los gates anteriores, tres publicaciones supervisadas en URLs de alcance limitado: cada una con SHA exacto, **aprobación autenticada e individual del propietario**, inspección en vivo y rollback; no inferir consentimiento general para ese paso. `SIGNATURE_REQUIRED`.

## 7. Veredicto y continuidad

| Categoría | Estado |
|---|---|
| Contenido V7 y validación automática local | **VERIFICADO EN LAB**, no certificado editorial profesional |
| Cuatro JPEG reales y hash/dHash | **VERIFICADO FÍSICO**, licencia no acreditada |
| PHP B2B y HTTP local reversible V13 | **VERIFICADO EN LAB**, CRM real no probado |
| Checkpoints de DB WordPress 71 y 72 | **EXISTEN**, restore integral no certificado |
| Mobile WP, proveedor/rights, CRM aislado, restore completo | **PENDIENTE DE PRUEBA FÍSICA** |
| Legal independiente, IAM, tres publicaciones firmadas | **PENDIENTE** |
| Publicación autónoma | **NO AUTORIZADA** |

Acción automatizable siguiente: localizar archivo completo privado Hostinger y recibos originales de fotos; preparar QA móvil autenticado y sandbox de captación sin notificaciones. Escalar a humano exclusivamente cuando sea exigible firma legal, aprobaciones exactas, permiso explícito, dinero o seguridad.

**No tocar PROD, main, DNS, App, CRM, Supabase real o WordPress publicado; no crear suscripciones; no duplicar motor ni programador.** Conservar PR #22 DRAFT.
