# SEO-001 · Piloto oficial #52656 y cola JOB-001 V0

**05-11-2026.** Estado: borrador real con metadatos Yoast reales; la cola JOB-001 de revisión es solo LAB, no está conectada a WordPress PROD.

## Evidencia CMS

- Sitio: https://fenixcapital.es; post 52656, estado `draft` confirmado; contenido original de 7018 caracteres intacto.
- Yoast: título, metadescripción y focus keyphrase guardados mediante `wp_seo_update_meta` y confirmados por lectura independiente `yoast-seo/get-post-seo-data`.
- Snapshot lógico previo a metadatos: Core Guard 174. Cambio SEO reversible 1968, simulación de deshacer comprobada, sin ejecutar reversión.
- La revisión visual, una imagen destacada, QA independiente y aprobación del propietario aún no se han comprobado. Aprobaciones: 0/3.

## Cola de revisión

- Nuevo adaptador `seo-draft-review-queue-v0.mjs`: lee evidencias de un borrador, crea SHA256 del contenido, incluye slug y datos de revisión, no conserva HTML ni credenciales.
- Encola en `JOB-001` PREPROD `SEO_DRAFT_REVIEW_ONLY_V0` con idempotencia por post y hash; un cambio de contenido invalida la aprobación anterior.
- Acceso de publicación explícitamente denegado incluso cuando una simulación supera otras comprobaciones: hace falta el Gateway del propietario, IAM, QA, rollback y release gates.
- El workflow ejecuta un ejercicio con contenido ficticio de prueba. La existencia de un artículo real no significa que el plugin WordPress ya emita eventos a este runtime.
- El puente SEO real observado en PROD apunta para releases a un endpoint de STAGING. No reutilizarlo para publicar en PROD hasta validarlo, sin cambiar su configuración aquí.

## Próximos gates reales

1. Comprobar la página renderizada en editor autenticado y revisar imágenes, legibilidad móvil y estructura visual.
2. Verificar enlaces HTTP 200, accesibilidad, formato y QA independiente.
3. Dar al propietario un expediente de aprobación autenticado asociado al hash exacto del borrador.
4. Acoplar al Gateway el evento de nueva versión y la cola, con permisos de solo borrador; OLD vs NEW, backup/restauración y rollback físicos antes de activar.

Sin cambios en Main, App, CRM, datos de clientes ni entradas ya publicadas. Sin suscripciones nuevas.
