# CEREBRO SEO-001 · Entrega transaccional checklist Córdoba · Estado verificable 2026-11-06

**Estado:** `PREPROD_CONTRACT_TESTED / DELIVERY_PHYSICAL_NOT_CERTIFIED`  
**`company_id`:** `fenix` · **`engine_id`:** `SEO-001` · **`environment`:** `PREPROD` · **`version`:** `v0`  
**PR:** [#22 · DRAFT](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/22) — sin merge ni despliegue a WordPress/CRM/PROD.

## 1. Base física y dependencias preservadas

**PDF original:** `FENIX_CHECKLIST_VISITA_PISO_CORDOBA_BORRADOR_V1.pdf`, disponible como adjunto de conversación, **no** en el repositorio ni WordPress ni Storage. Verificado con hash de bytes, 99.419 bytes, 2 páginas A4, 33 campos AcroForm rellenables.

`sha256=59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6`.

El objetivo es entregar este archivo a quien lo solicite, como PDF adjunto en correo transaccional. La persona no se adscribe a listas comerciales por pedir el recurso.

**Infra ya existente, sin cambios:**
- WordPress `fenix-cerebro-leads` → endpoint `fenix-web-lead` → ingreso controlado en CRM y `source_payload` con landing/campos; mantener idempotencia.
- WordPress `cerebro-seo001-city-form-prod` en las páginas Montilla B2C/B2B. No sustituido.
- Edge `fenix-web-lead-alert-worker` con Brevo `POST /v3/smtp/email` para **avisos internos**, no entrega de checklist. No alterado.
- WordPress post **52656** en estado **draft**, pendiente de QA, sin embudo público nuevo.
- Supabase **PREPROD** `hnqlnvakzaywtafeiybt` tiene bucket privado `seo-preprod-assets` (public=false, límite 5 MiB); **no existe objeto con nombre checklist/visita/52656 allí**, verificado por lectura de `storage.objects`.
- No ejecutar las Edges Brevo `fenix-brevo-lead-webhook` ni `fenix-brevo-inventory-once`: tienen implementación retirada (410).
- No se ha modificado `cluhljgonannaafpmblx`, App/CRM, email de clientes, WP, DNS, listas Brevo ni almacenamiento.

## 2. Adaptador nuevo, aislado, no desplegado

**Código:** `cerebro/seo-enterprise/v2/runtime/seo-checklist-transactional-delivery-v0.mjs`.

Gobierno:
1. Solo acepta `company_id=fenix`, `engine_id=SEO-001`, `environment=PREPROD`, post 52656, asset `SEO-MAGNET-52656-CHECKLIST-V1` y persona `PARTICULARES`.
2. Exige solicitud validada por **servidor** desde un evento comprobado de `fenix-web-lead`; identificadores UUID, prueba de información de privacidad/versionado y consentimiento de privacidad. No exponer función a cliente web ni confiar únicamente en el campo `server_verified` de un JSON enviado por el usuario.
3. `consent_marketing` es un booleano **separado**; nunca se convierte en consentimiento tácito de newsletter. El adaptador no invoca endpoints de contactos/listas comerciales.
4. El PDF debe ser byte a byte el original: tamaño 99.419, firma `%PDF-`, marcador `%%EOF`, SHA-256 exacta. Cualquier diferencia bloquea envío.
5. Crea email Brevo **transaccional** con asunto y contenido del recurso, **PDF adjunto en base64** y sin URL pública del PDF. Endpoint único `POST /v3/smtp/email`, remitente conocido `hipotecas@fenixcapital.es`, sin nuevos servicios.
6. Modo predeterminado `DRY_RUN`. Solo permite intento explícito de PREPROD con API key preexistente, buzón de ensayo exacto en allowlist, libro mayor **duradero** para reserva única y prohibición de sobreescribir validador canónico.
7. Protege idempotencia con clave derivada de evento, destinatario y asset, y requiere `ledger.reserve` atómico, `ledger.complete` y `ledger.markUnknown`. Ante resultado incierto no hay reenvíos automáticos: conciliación antes del reintento. El TTL de la idempotencia de Brevo no sustituye un libro mayor persistente.
8. Ningún enlace firmado, secreto, base64 de PDF o correo de cliente se registra en recibos públicos. Solo `recipient_sha256`, digest del archivo y código de estado.

**Límite importante:** todavía **no hay implementación conectada de `ledger` ni integración E2E del asset en Storage/WordPress**, y el receptor de PREPROD no se ha habilitado. El módulo puede construir y validar el sobre de envío, pero **no se ha demostrado entrega real por Brevo**.

## 3. Evidencia de pruebas y render local

**CI de GitHub [run 42173071584](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42173071584): SUCCESS, 6/6 tests.**
- `cerebro/seo-enterprise/v2/tests/seo-checklist-transactional-delivery-v0.test.mjs`.
- `.github/workflows/cerebro-seo-checklist-delivery-preprod-v0.yml` · `permissions:contents:read`.
- Testaron: contrato de persona/tenant/asset/consentimiento; rechazo de firma/tamaño/SHA incorrectos; cuerpo de email Brevo con adjunto; `DRY_RUN` que no envía; bloqueo del validador falso en intento de envío; NO alta automática en newsletter.
- Los tests de contenido utilizan un PDF **fixture sintético** para simular el cuerpo base64; no son prueba de envío Brevo. La verificación de SHA **del PDF real** se realizó por separado.
- El primer CI tuvo un error de orden de argumentos del validador; se corrigió y posteriormente 6/6 pasaron. No se desactivó ninguna validación.
- **Prueba física local sobre el PDF verdadero (sin red):** construcción de `.eml` MIME multipart con destinatario `test-checklist@example.invalid` (reservado, NO real), PDF original adjunto, lectura y reconstrucción de adjunto. SHA del adjunto coincidió exactamente con el original; 2 páginas y 33 campos AcroForm comprobados. Archivo local de conversación `/mnt/data/seo001_delivery_evidence/SEO001_CHECKLIST_PREPROD_CORREO_DE_PRUEBA_NO_ENVIADO.eml`; recibo `SEO001_DELIVERY_MIME_QA.json`. **NO enviado por Brevo, Gmail ni SMTP**.

## 4. GATES antes de calificarlo de `HECHO` real

| Gate | Estado | Motivo |
|---|---|---|
| PDF real único, SHA y campos | PASS | Local |
| Composición de correo y adjunto | PASS | Mock + MIME local |
| CI independiente PREPROD | PASS | 6/6 |
| Integridad y env/persona | PASS | Contrato |
| No opt-in comercial automático | PASS | Lógica |
| PDF de marca definitivo | HOLD | El PDF continúa en versión borrador |
| Asset en bucket privado PREPROD | PENDING | Bucket existe, objeto aún no |
| Event origin autenticado contra el servidor | PENDING | Contrato aislado, falta binding real |
| Ledger idempotente duradero | PENDING | Debe implementarse en esquema privado, snapshot y rollback |
| Brevo key/identidad de prueba en PREPROD | NOT VERIFIED | No inspeccionar ni imprimir secretos |
| Envío a buzón autorizado + `201/messageId` | NOT RUN | Requiere gates previos |
| Entrega verificada en bandeja / tracking | NOT RUN | Recepción física no demostrada |
| Consentimientos newsletter/doble opt-in B2C/B2B | NOT RUN | Otro circuito independiente |
| Publicación de post 52656 y formulario | DENIED | No promocionar sin QA/tribunal |

## 5. Siguiente implementación segura

1. Finalizar PDF con la marca oficial y QA editorial/legales, conservando digest de versión actual y generando digest nuevo si cambia.
2. Subir una sola vez a `seo-preprod-assets` privado mediante mecanismo autenticado con `upsert:false`, verificar objeto y SHA; nunca enlazar PDF públicamente.
3. Vincular la solicitud del formulario B2C 52656 con un evento firmado y **validador servidor** de `fenix-web-lead`, sin modificar CRM ni el wrapper PROD. En PREPROD, simular solo destinatario autorizado.
4. Implementar ledger persistente privado, inventario de permisos, snapshot, tests de reentradas, timeout/Brevo 429/500, rollback de feature flag.
5. Ejecutar **UNA** entrega real a buzón seguro con `messageId` de Brevo y confirmación de recepción, sin suscripciones comerciales; si falla, registrar `UNKNOWN` y detener reintentos.
6. QA/tribunal completo y promoción gradual, manteniendo formularios B2B y B2C separados y las URL actuales intactas.

**Coste incremental medido en este bloque:** 0 € de suscripciones y 0 llamadas API pagadas; 0 correos enviados; 0 cambios en PROD. El valor de una cuenta Brevo existente no se computa como coste adicional por el mero mock.

## 6. Registro de continuidad y rollback

`registry=seo-creative-and-funnel-extension-v1.registry.json`. Evidencia adicional del compositor y embudos `SEO_PREMIUM_IMAGE_AND_FUNNEL_GATES_2026-11-06.md`. La PR sigue en **DRAFT**. Para volver a OLD basta con no fusionar estos archivos aditivos. **No activar envíos reales hasta certificar receptor, asset, ledger y política de datos.**

## 7. Continuación · Ledger SQL instalado en Supabase PREPROD (no CRM/PROD)

**Esta sección sustituye únicamente el estado anterior «ledger pendiente».**

- Proyecto **exclusivo de PREPROD**: `hnqlnvakzaywtafeiybt`. La consulta `to_regclass` antes de aplicar devolvió NULL: no existía una tabla previa que migrar. Snapshot estructural base: objeto inexistente, `storage.objects` del bucket SEO sin PDF.
- Contrato SQL versionado `cerebro/seo-enterprise/v2/contracts/seo-checklist-delivery-ledger-preprod-v0.sql`, aplicado **directamente en PREPROD** (no en producción) mediante herramienta de SQL. Es una tabla nueva `public.cerebro_seo_checklist_delivery_v0`; todavía no se ha generado historial de migración CLI, tarea pendiente antes de promoción.
- Campos: hashes del destinatario y adjunto, UUID de evento y petición, consentimientos, estado RESERVADO/ACEPTADO/DESCONOCIDO, hashes del identificador de Brevo y timestamps. **No guarda email, nombre, teléfono ni PDF en claro**.
- Comprobación SQL de acceso: `relrowsecurity=true`, `anon_select=false`, `anon_insert=false`, `authenticated_select=false`, `authenticated_insert=false`; `service_select/insert/update=true`, `service_delete=false`. Solo backend con service role, nunca un navegador.
- Prueba SQL real en `BEGIN/ROLLBACK`: primera reserva INSERT=1, reentrada `ON CONFLICT DO NOTHING` INSERT=0, cierre de entrega de RESERVED a ACCEPTED=1 y bloqueo de sobrescritura a UNKNOWN=0. Posterior `SELECT count(*)` = **0 filas**. No hay clientes, ni contactos, ni correos creados.
- Supabase Security Advisors: el lint informativo `rls_enabled_no_policy` aparece para esta tabla. No indica exposición de la tabla: ausencia de políticas es **intencionada** con grants revocados de anon/authenticated. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Nuevo adaptador del ledger `cerebro/seo-enterprise/v2/runtime/seo-checklist-ledger-supabase-v0.mjs`; requiere explícitamente cliente servidor PREPROD autenticado y expone reserve/complete/markUnknown con actualización condicional. El adaptador de Brevo le transmite los campos de procedencia/consentimiento sin guardar destinatario en claro.
- Pruebas separadas `seo-checklist-ledger-supabase-v0.test.mjs`, con doble reserva, transición a ACCEPTED, UNKNOWN y denegación de otro proyecto.
- **CI consolidado [#42174299373](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42174299373): SUCCESS · 10/10 tests**; incluye entrega PDF y ledger. No contiene claves ni hace llamadas a Brevo.
- Rollback potencial: al estar la tabla todavía vacía y sin workers desplegados, su retirada solo requeriría `DROP TABLE` después de inventario y verificación `count(*)=0`. **No se ha ejecutado ningún DROP**.

### Estado REAL siguiente

**HITOS CERRADOS:** PDF íntegro, correo MIME local, plantilla transaccional y gates, código adaptador, tabla de ledger privada de PREPROD, pruebas de idempotencia DB y CI 10/10.

**PENDIENTE:** QA del PDF final de marca, carga privada del PDF real en `seo-preprod-assets`, autenticación de evento servidor `fenix-web-lead` para recurso 52656, conexión física del servicio de entrega con cliente service-role exclusivo PREPROD, buzón de ensayo autorizado, prueba `201/messageId` de Brevo con recepción de bandeja y política de reintentos/reconciliación. El WordPress post 52656 sigue en draft y no se ha enviado ningún email.

No afirmar `LIVE_DELIVERY_READY` ni ejecutar send de Brevo hasta que estos gates estén verdes. No tocar App/CRM/PROD ni listas newsletter.
