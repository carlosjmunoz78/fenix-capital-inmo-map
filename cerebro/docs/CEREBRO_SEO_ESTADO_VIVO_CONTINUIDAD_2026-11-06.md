# CEREBRO SEO-001 · ESTADO VIVO Y CONTINUIDAD · 2026-11-06

Estado: HECHO documental/diagnóstico dirigido; PRODUCCIÓN PUBLICADA INTACTA.
Ámbito: Fénix Capital, `company_id=fenix`, `environment=PREPROD`, PR #22 DRAFT.
Prohibiciones: no nuevas auditorías masivas; no borrar/duplicar URLs; no tocar WP publicado, App, CRM, permisos o redirecciones; no contratar GSC Wizard u otro SaaS.

## Recuperación y procedencia
- PR: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/22 (DRAFT abierta, no merge; HEAD comprobado: `ef590e18554b91fe8c9ae00cc4a39ef651e7fb65` antes de este documento).
- CI comprobado a nivel de jobs: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42121364259 (validate SUCCESS); https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42121364324 (worker, QA, tribunal, writer 4/4 SUCCESS); https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42121364346 (compile-strategy, independent-qa, tribunal 3/3 SUCCESS). La PR documenta 154/154 tests SEO, sin afirmar certificación operativa.
- Corpus canónico 2026-11-05: 200 URL (166 páginas, 34 posts), 629 medios; 8 contratos de embudo; 24 parejas B2B/B2C; 7 Yoast focus keywords sin configurar en snapshot; `/` e `/inicio/` comparten `hipotecas en Córdoba`. Esto no prueba canibalización en Google. Preservar ambas URLs hasta evidencia.
- Los 32 departamentos, 141 competencias y plantillas no significan 32/32 agentes certificados; estado autónomo PROD: 0/32.

## Verificación de productora contra Supabase PROD, SOLO LECTURA
Proyecto: `fenix-capital-prod` / `cluhljgonannaafpmblx`, tabla `public.cerebro_creative_job_v1`.
- Job existente: `c4012f43-c12f-400b-9610-2e5f2e286000`; `company_id=fenix`, `engine_id=SEO-001`, `output_type=SEO_IMAGE`, `status=QUEUED`, `attempt_count=0`, `max_attempts=1`, `completed_at=NULL`, `artifact_manifest=NULL`.
- Fecha creación/última actualización del job: `2026-11-05 22:17:29.915636+00`. Cola: 3 trabajos `SUCCEEDED` anteriores (última actividad del 2026-10-24), y este único `QUEUED`.
- Funciones DB existentes: `cerebro_creative_enqueue_v1`, `cerebro_creative_lease_v1`, `cerebro_creative_complete_v1`. Esto demuestra contrato de cola, NO worker 24/7 operativo.
- `cron.job` tiene dos entradas activas para web-lead y social-authorizer; no hay una entrada Cron denominada de la productora. El worker podría ser externo: NO concluir inexistencia de ejecutor sin inspeccionar su runtime.
- Acción correcta: localizar titular/ejecutor del `CREATIVE-PROGRAMMATIC-RENDER-V1`, comprobar health/scheduler y contrato lease->render->QA->complete, restaurar ejecución segura sin duplicar job ni lanzar reintentos de pago. No invocar lease manualmente sin worker verificable.

## Verificación física del piloto WordPress oficial (SOLO LECTURA)
Conector propio: Cowboy_MCP_web, herramientas `wp_get_post`, `fenix-core-guard/post-inspect`, `yoast-seo/get-post-seo-data`.
- WordPress post ID `52656`, `draft`, título: «Checklist para visitar un piso en Córdoba antes de pedir una hipoteca». Slug `checklist-visitar-piso-cordoba-antes-hipoteca`.
- Ocho apartados editoriales y enlaces existentes a `/precio-maximo/`, `/gastos-compra/`, `/que-piso-te-puedes-permitir/`. No se ha modificado el borrador.
- Yoast confirmado: title «Checklist para visitar un piso en Córdoba | Fénix Capital», focus keyphrase «visitar un piso en Córdoba» y meta description específica.
- QA parcial: contenido escrito; falta confirmación HTTP en vivo de todos los enlaces (dos lecturas web no concluyentes); vista renderizada en editor, imagen, descargable/checklist entregable, CTA/form específico y consentimiento, revisión editorial independiente, permisos y rollback físico. No publicar ni crear borrador duplicado.
- La prueba de que `draft` existe es físicamente más avanzada que el antiguo hito de solo escritura JSON LAB, pero NO implica publicación, embudos funcionales ni certificado 32/32.

## Datos de Search Console y decisión Home / inicio
- Conector GSC Wizard devolvió `payment_required/subscription_required` en consulta de propiedades (6-11-2026). NO contratar ni reintentar hasta cambio real de conexión; usar la fuente ya contratada o accesos/exportaciones existentes.
- `hipotecas en Córdoba` duplicada en metadatos Yoast NO prueba canibalización. Evidencia requerida: consultas/URL separadas, clics, impresiones, posiciones y canonicals, preferentemente 3 meses de GSC autenticado. Hasta entonces `PRESERVE_BOTH_REVIEW_ONLY`.

## Siguiente bloque de trabajo seguro
1. **P0 · Productora**: identificar worker existente, verificar razón de `QUEUED/0` y procesar job existente una sola vez si contrato, permisos, coste, QA y rollback están aprobados. Sin recrear petición.
2. **P0 · Primer borrador**: terminar QA no destructiva del ID `52656`; comprobar destino de enlaces, CTA y recursos, y preparar una sola corrección editorial reversible sobre ese borrador si los gates permiten escritura. No tocar las 200 URL publicadas.
3. **P1 · Embudos**: inventariar conexiones reales de Fénix CEREBRO Leads/consentimiento/entregables y newsletters Brevo Free (PARTICULARES vs INMOBILIARIAS) por capacidades existentes, sin nuevos sistemas ni leads ficticios. Hostinger Reach prohibido.
4. **P1 · GSC**: recuperar datos por ruta existente gratuita para resolver Home vs /inicio/ sin 301/noindex/canonical automáticos.
5. Mantener documentalmente PREPROD/LAB y su PR separados de PROD; QA/tribunal, evidencia de costes, OLD vs NEW, snapshot y rollback antes de cualquier promoción.

No se han ejecutado mutaciones a web, App, CRM, Supabase, GSC ni PROD durante esta recuperación. Este documento es evidencia de continuidad, no autorización de publicación.

## Complemento de ejecución verificada · 2026-11-06 · SEO-001 (sin mutación de PROD)

### Productora: ruta real localizada, salud del dispatcher y bloqueo restante
- Existe el workflow de **main** `.github/workflows/cerebro-creative-job-runner-v1.yml`, con `schedule: */5 * * * *`, `workflow_dispatch`, `id-token: write` y `PROD queue worker` que procesa hasta doce trabajos y selecciona `https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-creative-dispatch-v1` cuando `github.ref == refs/heads/main`. Por tanto, la ausencia de un cron de Supabase NO significa ausencia de programador: el programador esperado es **GitHub Actions**. No crear un segundo cron ni dispatcher.
- En Supabase PROD, Edge Function `cerebro-creative-dispatch-v1` v1 figura `ACTIVE`. Prueba externa autenticada como consulta pública GET a `/health`: **HTTP 200**, respuesta `ok:true, environment:PROD, github_oidc:true, heavy_render_outside_supabase:true, additional_cost_eur:0`. La ruta privada POST `/lease` exige OIDC GitHub real, no usar consulta SQL directa para saltársela.
- Consulta posterior del job SEO `c4012f43-c12f-400b-9610-2e5f2e286000`: `environment=PROD`, `status=QUEUED`, `attempt_count=0`, `max_attempts=1`, `lease_owner=NULL`, `artifact_manifest=NULL`, `updated_at=2026-11-05 22:17:29.915636+00`. Está elegible por tipo y entorno en principio, pero **no está demostrado que GitHub Actions lo haya intentado arrendar**.
- Tres trabajos anteriores `SOC-001` `SUCCEEDED` utilizaron `PLAYWRIGHT_FFMPEG` con `additional_cost_eur=0` y `publish_authorized=false` (2026-10-24); la implementación base existe y funcionó una vez, no evidencia worker actual 24/7.
- PR #23 (https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/23) es rama paralela DRAFT del adaptador **OpenAI de pago** y conserva carril legacy; NO mezclarlo con este encargo SEO programático `expected_cost_eur=0`. Su probe del 05-11 reportaba falta de `OPENAI_API_KEY` en Edge PREPROD, pero eso no explica por sí solo la cola programática SEO del worker existente.
- **Diagnóstico pendiente exacto**: consultar la ejecución más reciente de GitHub Actions del workflow anterior, confirmar `schedule` habilitado y revisar logs por fases: checkout/npm/Chromium/FFmpeg/OIDC `/lease`/render/subida/`/complete`. Ante rojo: corregir **solo** capa causal con test y rollback. La sesión GitHub conectada expone lectura de jobs si se conoce `run_id`, pero no proporciona listado de ejecuciones del workflow ni disparo nuevo desde este chat; NO inventar ejecución ni correr `lease` manual.

### Borrador WordPress 52656 · verificación física de tres enlaces
- Fuente `wp_get_post` oficial y comprobación individual sin enviar formularios: `/precio-maximo/` post 49153 = **publish + HTTP 200**, canonical exactamente `https://fenixcapital.es/precio-maximo/`, marca presente y sin placeholders prohibidos según `fenix-core-guard/live-verify-page`. `/gastos-compra/` post 49151 = **publish + HTTP 200**, canonical exactamente `https://fenixcapital.es/gastos-compra/`, sin placeholders prohibidos. `/que-piso-te-puedes-permitir/` post 46982 = **publish + HTTP 200** por HEAD externo vía WordPress; su canonical NO se certifica aquí. Los tres destinos que enlaza el borrador son accesibles hoy.
- El post 52656 permanece `draft` con Yoast title, meta description y focus keyphrase comprobados. No se publicó ni modificó. Aún faltan CTA/form de intención, descargable y entrega, QA visual/editorial y aprobación con digest.

### Embudos y consentimiento: capacidad existente, separación no certificada
- Plugins WP PROD activos: `fenix-cerebro-leads/fenix-cerebro-leads.php` (v1.3.6-preprod) y `cerebro-seo001-city-form-prod/cerebro-seo001-city-form-prod.php` (v1.1.0), entre otros. Sus nombres/versiones no son prueba de éxito E2E.
- Muestra **sin reauditoría masiva**: Montilla B2C post 49114 y Montilla B2B post 49128 están `publish`, ambas contienen shortcode `[fenix_seo001_city_form city="Montilla" funnel="STUDY"]` (en B2B aparece dos veces). El plugin genera mismo `source=web_landing_study` a nivel JS, `resource=study_montilla`, pero conserva distintos `landing_url`/`landing_id`. El wrapper Fénix CEREBRO Leads normaliza `source=web` antes de pasar la operación al Edge `fenix-web-lead`, que llama a `fenix_prod_web_lead_ingest_guarded_server` → `fenix_prod_web_lead_ingest_server`.
- La función de ingesta servidor referencia `landing_url`, pero su resolución de `source` revisada cubre casos especiales y no demuestra una segmentación independiente B2B/B2C Montilla, entrega de lead magnets ni dos listas newsletter. **Estado: CONTRACT_EXISTS; END_TO_END_SEGREGATION_NOT_VERIFIED**, no afirmar mezcla de datos real ni inventar altas de prueba.
- Prioridad de contrato: seguimiento distinto `PARTICULARES` vs `INMOBILIARIAS`, formulario contextual B2C/B2B y consentimientos individualizados; preservar plugin actual con backup/OLD vs NEW antes de cualquier cambio.

**Conservación:** Sin nuevos jobs, sin llamada de imagen de pago, sin costes de proveedor, sin escrituras a WordPress publicado ni App/CRM, sin modificación de cola o cron, sin datos sintéticos de clientes. Este registro solo actualiza continuidad técnica de la PR DRAFT.

### Descargable B2C real preparado · sin publicación
- Fuente versionada en `cerebro/seo-enterprise/v2/assets/SEO_MAGNET_CHECKLIST_VISITA_CORDOBA_V1.md` (commit `1825628d099833f71d25f5b4155f4b20d9a3a555`).
- PDF final de trabajo generado y renderizado visualmente: `FENIX_CHECKLIST_VISITA_PISO_CORDOBA_BORRADOR_V1.pdf`, 2 páginas A4, 33 campos editables/interactivos, checksum SHA256 `59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6`. Está accesible como archivo descargable de la conversación, NO como archivo del repositorio o de WordPress.
- Estado `DRAFT_CONTENT_RENDERED_PDF_NOT_PUBLISHED`. Tipografía de respaldo, revisión visual realizada; falta marca final (Montserrat oficial), QA editorial/legales independiente, permisos de almacenamiento, entrega por email, consentimiento, segmentación B2C y E2E, publicación autorizada.
- No subirlo a la librería pública de medios ni colocarlo detrás de una captación aparente sin entrega real. No crear otro descargable duplicado.

## CIERRE DEL BLOQUEO P0 FACT-001 · verificado físicamente 2026-11-06

**PREVALECE sobre las menciones anteriores de estado QUEUED y «worker por localizar».**

- Causa: GitHub Actions workflow original `cerebro-creative-job-runner-v1.yml` inactivo, `state=disabled_fork`, demostrado con un nuevo workflow de solo lectura (run **42131416618**, SUCCESS).
- Ejecución puntal sin duplicar trabajo: workflow de reparación de privilegio limitado (run **42131964855**, SUCCESS) efectuó `enable → workflow_dispatch(ref=main) → disable`, todas respuestas API válidas, final `state=disabled_manually`, GitHub run producido **42131975709**.
- Ejecución `main` **42131975709**, job 127610581932, terminada `SUCCESS`. Logs del paso `PROD queue worker`: `SUCCEEDED` job existente `c4012f43-c12f-400b-9610-2e5f2e286000`, seguido de `NO_JOB`.
- Supabase transaccional comprobado: job `SUCCEEDED`, `attempt_count=1/1`, `completed_at=2026-11-05 23:47:47.439397+00`, coste adicional **0 €**, `publish_authorized=false`, artifact privado PNG 1200×630, 43 100 bytes, SHA256 `bb88f1f907d9e2a6a13f984c2ed20707c0c1b4c69cd05a2bdb25ce71b73aac0c`.
- Archivo inspeccionado visualmente en sesión autenticada de Supabase Storage: texto legible; **HOLD QA de marca** porque el compositor existente declara Arial, no Montserrat, no se aprecia logotipo Fénix oficial y el resultado editorial es demasiado básico. Recepción, causas y ruta de mejora registradas en `cerebro/seo-enterprise/v2/evidence/SEO_MEDIA_PILOT_PRIVATE_QA_2026-11-06.md`, commit `5c8070d5b08e7a6dd1ebf50a4eceb5446c143cd5`.
- WordPress post 960 sigue publicado sin modificación de su contenido, con imagen destacada anterior `_thumbnail_id=46273`; no adjuntamos PNG nuevo ni lo hacemos público.
- **Hardening**: el workflow de reparación transitoria fue reemplazado por una versión **SOLO LECTURA** sin `actions:write`. Verificación de estado `disabled_manually` run **42132698062**, job **127612990763**, `SUCCESS` (commit `c26b29104cc16cc82ea466b89177ad7e2c2efd08`). No queda autorización de write en ese observador.
- Se mantiene disuelto el bloqueo de ejecución **de este trabajo único**; **la autonomía recurrente continúa PENDIENTE**. No reactivar el cron legacy pesado cada 5 minutos sin un comprobador ligero de backlog, cuotas y QA, más PREPROD/OLD-vs-NEW/rollback.

**Próximas acciones sin repetir nada**: (1) mejorar exclusivamente compositor de marca en rama paralela, manteniendo expediente histórico y derechos; (2) E2E de lead magnet 52656 + consentimientos + newsletter B2C; (3) resolver segmentación física B2B Montilla; (4) telemetría GSC Home vs `/inicio/` por ruta sin pago.

**Análisis puntual de canónicos ya verificado**: Home `/` HTTP 200, canonical `/`; `/inicio/` HTTP 200, canonical `/` y metadatos Yoast duplicados. Respeta Home como preferida; mantener ambas sin 301/noindex hasta GSC.

**Estado PR**: DRAFT, sin merge. Sin modificación de App/CRM, sin publicaciones nuevas y sin suscripciones nuevas.

## 2026-11-06 · CONTINUACIÓN EJECUTADA · SEO PREMIUM V1 Y B2B/B2C, CODIFICADO Y PROBADO

**Estado actual PREPROD (este bloque prevalece sobre los apartados antiguos «por implementar»):**
- Compositor premium autónomo **aditivo** en `cerebro/seo-enterprise/v2/runtime/seo-premium-creative-v1.mjs`: render vectorial 1200×630 para artículo **existente** WP 960, con fuente Montserrat real de WordPress, logo auténtico PNG transparente, naranja/amarillo de marca y restricciones de texto financiero. No cambia `creative-job-runner-v1.mjs` ni produce llamadas pagadas.
- Test unitario `seo-premium-creative-v1.test.mjs`: 3/3 PASS. PR workflow `cerebro-seo-premium-creative-preprod-v1.yml` **SUCCESS** [run #42134348550](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42134348550), con PNG generado físicamente y audit receipt descargables desde GitHub Actions. SHA256 PNG `2f042f9a5833560e6f693a76768d0a73eb22ef8267ddf07f0c24578bd5aa72a8`; 309280 bytes; 1200×630; `font_loaded=true`; logo 2560×1950 y alfa transparente verificada; `additional_cost_eur=0`; `publish_authorized=false`.
- Se produjo y reparó una regresión por dependencia Playwright en la arquitectura; carga diferida, sin bajar coberturas. [Architecture run #42134103160](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42134103160) **SUCCESS**. El render premium [#42134102935](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42134102935) también **SUCCESS**.
- **Sigue HOLD calidad estética D26/D31/tribunal** y no se aprobó cambio de la imagen existente en WordPress. No existe nueva imagen subida al CMS.
- Separación PREPROD de Montilla B2C (post 49114) vs B2B (post 49128) y checklist B2C (borrador 52656), con contratos de formularios/recursos/listas diferenciados y consentimientos distintos: `seo-lead-segmentation-contract-v0.mjs`. Tests `seo-lead-segmentation-contract-v0.test.mjs`, **5/5 PASS**, run [#42134348772](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42134348772) **SUCCESS**.
- Análisis de plataforma existente: WP `fenix-cerebro-leads` y `cerebro-seo001-city-form-prod` actuales conservados; `fenix-web-lead` guarda `source_payload` (incluye landing) y `fenix-web-lead-alert-worker` usa Brevo para avisos **internos**. El pipeline público no demuestra entrega al comprador del descargable 52656 ni dos newsletters de clientes. Edges heredadas Brevo `fenix-brevo-lead-webhook` y `fenix-brevo-inventory-once` tienen implementación retirada (HTTP 410 por contrato); no reactivarlas.
- Estado E2E formularios y newsletter: `NOT_VERIFIED`. No mandar leads ficticios a CRM ni emails a terceros reales.
- Registry de capacidades y rollback: `cerebro/seo-enterprise/v2/registry/seo-creative-and-funnel-extension-v1.registry.json`; evidencia ampliada: `cerebro/seo-enterprise/v2/evidence/SEO_PREMIUM_IMAGE_AND_FUNNEL_GATES_2026-11-06.md`. Comparación OLD vs NEW documentada y OLD preservado.
- `PR #22` sigue DRAFT sin merge. No hay modificaciones en App/CRM, WordPress publicado, funciones/migraciones Supabase, cron productivo, ni nuevas suscripciones.
- **Siguiente trabajo**: QA visual independiente del PNG V2 y gate editorial; completar adaptador de entrega del checklist vía Brevo reutilizando el servicio existente, con opt-in marketing separado y destinatario de prueba seguro en PREPROD, trazabilidad e idempotencia, tribunal y rollback. No publicar ni habilitar cron recurrente hasta obtener prueba E2E.

## SEO-001 · 2026-11-06 · Checklist Córdoba: envío transaccional con Brevo (PREPROD)

**Estado NUEVO:** `CODE_AND_OFFLINE_MIME_PASS / BREVO_LIVE_DELIVERY_NOT_EXECUTED`.

- PDF original de conversación `FENIX_CHECKLIST_VISITA_PISO_CORDOBA_BORRADOR_V1.pdf` **preservado**: 99.419 bytes, 2 páginas A4, 33 campos rellenables, SHA256 `59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6`. No reenviar un PDF con contenido modificado sin versionar y comprobar la nueva huella.
- Existe en **Supabase PREPROD** (`hnqlnvakzaywtafeiybt`) el bucket privado `seo-preprod-assets`; comprobación SQL `storage.objects`: todavía no existe objeto con `checklist`, `visita` o `52656`. No se han subido bytes ni creado enlaces públicos.
- Adaptador **nuevo aditivo** `cerebro/seo-enterprise/v2/runtime/seo-checklist-transactional-delivery-v0.mjs`: prepara PDF adjunto en correo transaccional Brevo (sin lista de marketing), valida SHA, firma y tamaño, requiere evento de origen desde servidor y consentimientos separados, destinatario de prueba allowlisted e interfaz de ledger duradero para impedir duplicados. **No desplegado**, con `DRY_RUN` predeterminado y sin tocar el pipeline de alertas internas.
- CI [#42173071584](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42173071584) **SUCCESS**, 6/6 tests. Se corrigió un error de parámetros del validador sin reducir pruebas; pruebas previas arquitectónicas, embudos y compositor independientes se preservaron en verde.
- Se ensambló `.eml` de prueba local con PDF **verdadero** adjunto, se releyó y cotejó SHA contra origen, destinatario ficticio `test-checklist@example.invalid`. Evidencia local: `/mnt/data/seo001_delivery_evidence/SEO001_CHECKLIST_PREPROD_CORREO_DE_PRUEBA_NO_ENVIADO.eml` y `SEO001_DELIVERY_MIME_QA.json`. Ningún correo salió a la red; pruebas GitHub usan fixture sintético para composición.
- Brevo existente `fenix-web-lead-alert-worker` sigue destinado a avisos **internos** y no se ha modificado. No hay evidencia de lista comercial dual ni delivery E2E verificado.
- Más detalles/gates: `cerebro/seo-enterprise/v2/evidence/SEO_CHECKLIST_BREVO_DELIVERY_PREPROD_GATE_2026-11-06.md`.
- **Bloqueos concretos reales**, no repetir auditorías: PDF sigue en borrador editorial; subida privada PREPROD pendiente; origen del evento y `ledger` duradero sin conectar; API key PREPROD y correo de prueba seguro no verificados; primer envío Brevo aceptado `201/messageId` e inbox no probado; embudo WP 52656 en `draft` y newsletter separados sin E2E.
- **No habilitar envío real ni publicación** hasta verificar asset, receptor de pruebas, permisos, idempotencia duradera y QA. `App/CRM/WordPress/Supabase PROD` no modificados. `PR #22` continúa DRAFT y el rollback es no fusionar.

### 2026-11-06 · Hito adicional ejecutado: ledger de entrega PREPROD instalado y probado

- `public.cerebro_seo_checklist_delivery_v0` creado **solo** en Supabase PREPROD `hnqlnvakzaywtafeiybt`. No se toca `fenix-capital-prod`.
- Antes de crear: `to_regclass` NULL. Después: RLS habilitado y grants `anon/authenticated SELECT/INSERT=false`, `service_role SELECT/INSERT/UPDATE=true`, `service_role DELETE=false`. Tabla sin emails/PII en claro y **0 filas**.
- Prueba SQL física `BEGIN/ROLLBACK`: primera reserva, duplicado bloqueado por unique, transición a `ACCEPTED`, bloqueo de modificación a `UNKNOWN`; `count(*)=0` posterior.
- Adaptador `seo-checklist-ledger-supabase-v0.mjs` incorporado a la PR DRAFT, que exige cliente backend vinculado a PREPROD. Contrato SQL: `seo-checklist-delivery-ledger-preprod-v0.sql`; no hay migración CLI promovida a PROD.
- CI de checklist + ledger [#42174299373](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42174299373) `SUCCESS` **10/10**. No se llamó a Brevo, no se enviaron emails ni se generaron leads de prueba.
- Advisor de Supabase informa `rls_enabled_no_policy` para nueva tabla, **esperado**: prohibición completa de roles cliente con permisos revocados, sin política permisiva.
- Evidencia completa y gates actualizados: `cerebro/seo-enterprise/v2/evidence/SEO_CHECKLIST_BREVO_DELIVERY_PREPROD_GATE_2026-11-06.md`.
- Bloqueo real para E2E continúa: PDF final de marca + privado en bucket, evento servidor autenticado + binding de ledger/worker, prueba controlada de `201/messageId` con buzón autorizado y comprobación de recepción. Envío comercial y newsletters permanecen separados y desactivados.

## 2026-11-06 · TRASPASO TOTAL MULTICHAT GUARDADO Y VERIFICADO

**Este bloque prevalece como fuente de continuidad del corte final del chat.** El siguiente chat NO debe reabrir auditorías SEO ni reproducir el trabajo ya certificado. Se han incorporado tres archivos nuevos en esta PR DRAFT, en paralelo, sin tocar PROD:

1. `cerebro/docs/CEREBRO_SEO_TRASPASO_TOTAL_2026-11-06.md` — alcance, relaciones App/CRM/WP/Brevo, cómo se trabajó, pruebas CI, fallos reparados, rollback y siguiente orden física exacta.
2. `cerebro/seo-enterprise/v2/registry/CEREBRO_SEO_ESTADO_MAQUINA_2026-11-06.json` — estado máquina de motores/gates, SHA de recursos, identificadores proyecto y bloqueos.
3. `cerebro/docs/PROMPT_CONTINUAR_CEREBRO_SEO_2026-11-06.md` — prompt listo para nuevo chat del proyecto. Incluye instrucciones de recuperación desde Biblioteca + GitHub.

**Copia adicional verificada en Biblioteca de ChatGPT**, carpeta existente `/CEREBRO OS · ENGINE FACTORY & MULTIEMPRESA/SEO_ENTERPRISE_V2_2026-11-05/`: los tres archivos anteriores, `CEREBRO_SEO_TRASPASO_COMPLETO_2026-11-06.zip` (incluye PDF V1/V2 y evidencias MIME) y `FENIX_CHECKLIST_VISITA_CORDOBA_MARCA_V2_PREPROD.pdf`.

**PDF de marca V2 físicamente comprobado en contenedor:** 113.703 bytes, 2 páginas A4, 33 campos AcroForm, SHA256 `82a96dc9b1c64bf8972e44358cd5bdc121182a09aa3832b71162efc7bea7e660`. El manual de identidad aportó el logo original; falta QA editorial. PDF V1 se conserva en ZIP: 99.419 bytes, SHA `59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6`.

**Riesgo técnico esencial:** adaptador Brevo y ledger PREPROD actuales fijan V1, por lo que NO apuntar a V2 sin actualizar el contrato, crear/ensayar la versión paralela, proteger idempotencia y comprobar SHA. V2 **NO se ha subido al bucket**: comprobación live `storage.objects=0` para checklist; bucket `seo-preprod-assets` privado; tabla `public.cerebro_seo_checklist_delivery_v0` tiene **0 filas**. Ningún envío Brevo se ejecutó. El intento de explorar rutas de transferencia externas NO es evidencia de subida.

**Siguiente misión sin aclaraciones reiteradas**: verificar QA V2 → transferir archivo binario a Storage privado PREPROD mediante acceso autorizado y comprobar hash → adaptar contrato de entrega V2 en paralelo → origen de evento firmado/validado en servidor → ledger transaccional → una prueba física de recepción en buzón controlado → tribunal/rollback → evaluar promoción; proteger URLs y páginas existentes. El proyecto App PREPROD está cancelado; no confundirlo con este Supabase PREPROD. Nada de contratos nuevos, WPVibe, Make ni envíos a clientes.

**No declarar entrega real ni producción mientras estas pruebas sean pendientes.**
