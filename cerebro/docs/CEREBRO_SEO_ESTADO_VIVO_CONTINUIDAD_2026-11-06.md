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
