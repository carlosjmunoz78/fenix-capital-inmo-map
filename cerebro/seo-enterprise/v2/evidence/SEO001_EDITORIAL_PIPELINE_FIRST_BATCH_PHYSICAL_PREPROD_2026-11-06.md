# SEO-001 · Primer lote editorial y cola persistente · 06-11-2026

**Resultado:** `PARCIAL_PHYSICAL_PREPROD_QUEUE_READY`; el circuito aún NO está publicado ni programado 24/7. PR #22 DRAFT, sin merge.
**Empresa:** `fenix` · **motor:** `SEO-001` · **entorno:** `PREPROD` · **coste adicional de suscripción:** `0 €` (no confundir con consumo de cuotas GitHub/Supabase).

## Preexistente que se respetó
- Estrategia canónica: `seo-marketing-plan-for-owner-approval-v1.json` y presentación `SEO_ESTRATEGIA_EJECUTIVA_FENIX_APROBACION_2026-11-06.md`. Estado formal de aprobación IAM: **PENDIENTE**; «Ok dale» en ChatGPT autoriza la preparación de este bloque, pero no constituye evidencia criptográfica del propietario.
- Corpus del 5-11: 200 documentos (166 páginas, 34 posts), 629 medios. No se hizo nueva auditoría general. Los dos `target_slug` no figuran en ese inventario.
- WordPress oficial: post `52656` existe en **draft** (sin cambio), B2C Montilla `49114` y B2B Montilla `49128` siguen **publish**, post B2B `49082` publicado. Ninguno editado/duplicado.
- Core Guard advertía `operational_writes_allowed=false`; **NO** se desactivó. Prohibición de WPVibe y Make respetada.

## Producción editorial REPO (no confundir con entrada WordPress)
1. **B2C comprador:** `drafts/2026-11-06-b2c-comparar-pisos-cordoba.draft.html` (blob Git `f2f27018db419e56efd52671722a7ff283bcb8b9`), slug propuesto `comparar-dos-pisos-despues-visita-cordoba`. No duplica el borrador checklist 52656; lo complementa.
2. **B2B agencias:** `drafts/2026-11-06-b2b-derivacion-comprador-cordoba.draft.html` (blob `100394b4d4ef590fdfb2590b309828a93e28606b`), slug propuesto `derivacion-hipotecaria-comprador-inmobiliaria-cordoba`. No actualiza posts 49128 ni 49082.
3. Registry trazable y fuente corpus: `registry/seo-editorial-first-batch-2026-11-06.json`.
4. GitHub Actions `42196933744` **SUCCESS**, `4/4` tests, `0` fallos: empresa/persona, slug no repetido en inventario, contenido sustantivo, URLs internas de fuente conocida, bloqueos de publicación.
5. **Cowboy MCP propio:** `wp_create_post` ejecutado con `dry_run=true` individualmente para ambos contenidos, respuesta `Would create post`. **0 publicaciones, 0 nuevos posts realmente creados**. Los dry runs de Cowboy NO son prueba de rollback ni de permiso IAM.

## Cola física PREPROD (solo metadatos)
- Se creó mediante migración aditiva `seo_editorial_queue_private_preprod_v0_20261106` la tabla **`public.cerebro_seo_editorial_queue_preprod_v0`**, en proyecto `hnqlnvakzaywtafeiybt`. SQL de contrato: `contracts/seo-editorial-queue-preprod-v0.sql`.
- Filas reales:
  - `SEO001-FENIX-B2C-EDITORIAL-001`: `PARTICULARES`, `DRAFT_READY_FOR_QA`, blob `f2f270...`.
  - `SEO001-FENIX-B2B-EDITORIAL-002`: `INMOBILIARIAS`, `DRAFT_READY_FOR_QA`, blob `100394...`.
- Validación física: `rls_on=true`, `queue_rows=2`, `anon_select=false`, `authenticated_insert=false`, `service_insert=true`, `service_delete=false`, `unsafe_rows=0`.
- Tres intentos transaccionales de `publish_authorized=true`, `wordpress_write_authorized=true` y `status='PUBLISHED'` **rechazados correctamente** por restricciones SQL, seguido de `ROLLBACK`.
- No se almacenan datos personales ni texto de artículos en la tabla, solo empresa, meta y SHA del blob GitHub.

## Qué está pendiente realmente
1. Obtener aprobación estratégica del propietario **autenticada y versionada** por su cuenta GitHub o CEREBRO Gateway; el contrato `runtime/seo-owner-github-approval-v0.mjs` fue probado `5/5` en Actions `42195725912`, pero **no** está conectado aún como servicio continuo de verificación de comentarios.
2. QA editorial y SEO independiente sobre el texto final, comprobación URL específica en WordPress (más allá del snapshot), revisión jurídica/privacidad cuando proceda y tribunal con identidades verificadas.
3. Conectar un trabajador JOB-001/Gateway real a la tabla PREPROD, sin escribir en WordPress hasta permiso acotado, snapshot y restauración física demostrada; respetar Core Guard.
4. Publicación solo mediante una **segunda** aprobación ligada al digest exacto y con monitorización/rollback; no se puede inferir de la estrategia. No fusionar PR sin gates.
5. Checklist PDF V2: todavía no subido a bucket privado; integración evento servidor/Brevo/ledger pendiente, mantener WordPress 52656 draft.
6. Newsletters B2B y B2C: ni alta ni envío hasta consentimientos independientes y E2E.

## Rollback y seguridad
Todo el software nuevo está en PR DRAFT y no desplegado como escritor. Eliminar los dos work-items de la cola requeriría operación administrativa explícita y copia de evidencia; el rol servicio no tiene DELETE. La reversión del **comportamiento** es mantener los writers y publish gates deshabilitados. No se tocaron `main`, App, CRM, Supabase PROD, DNS, Trading ni WordPress publicado.

## Próxima acción prioritariamente útil
Exponer al propietario un único canal de **revisión y aprobación en GitHub** de la estrategia y de los dos borradores, persistir el recibo real de proveedor y activar solo revisión QA en JOB-001 sin permitir publicar. No acreditar HUMAN_REQUIRED satisfecho hasta identidad y SHA verificados.
