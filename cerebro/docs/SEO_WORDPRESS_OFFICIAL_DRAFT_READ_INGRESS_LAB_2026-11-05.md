# CEREBRO SEO · Puente oficial WordPress de solo lectura → ACTGW-001 → JOB-001

**Fecha:** 05-11-2026. **Estado:** adaptador integrado en la PR #22 y sujeto a CI; no desplegado ni montado en el Gateway de producción.

## Auditoría física de WordPress oficial
- `fenixcapital.es` accesible mediante el conector Cowboy MCP existente, con lectura autenticada de entradas y datos Yoast.
- `wp_get_hooks(save_post)` devolvió 8 callbacks y `transition_post_status` 11: ninguno es un webhook de borradores nuevo de CEREBRO.
- `wp_get_rest_routes(namespace=fenix-seo-cerebro/v1)` devolvió únicamente las rutas existentes GET de estado y release; no hay receptor dedicado de `draft_saved`.
- `fenix-core-guard/cerebro-status`: `operations_locked=true`; `fenix-core-guard/health`: `operational_writes_allowed=false`. **No alterar esos bloqueos** para acelerar integraciones.
- El endpoint de release del plugin SEO ya instalado apunta a STAGING. No reutilizarlo en producción hasta auditoría independiente.
- Post #52656 sigue en estado `draft`, SEO de Yoast guardado. Su aprobación del propietario no existe: **0/3**.

## Implementación aislada
El módulo `cerebro/seo-enterprise/v2/runtime/seo-official-wp-read-ingress-lab-v0.mjs` registra una capacidad aditiva en el Action Gateway V1 del LAB. El host debe inyectar un verificador del conector WordPress que autentique de verdad la sesión de lectura, más adaptadores privados `readPost` y `readYoast` que reconsulten los datos oficiales. El módulo **no confía en el contenido del evento**. Se recibe exclusivamente `post_id`; el Action Gateway utiliza un ticket interno aleatorio de un solo uso. Un intento directo con `authorized:true` o `owner:true` sin ticket válido se bloquea; pertenencia a otra empresa, otro host, artículo publicado, SEO incompleto e IDs inconsistentes también.

La evidencia de borrador se convierte, sin persistir HTML, en un registro de revisión del JOB-001 PREPROD ya existente. Las repeticiones para la misma versión son idempotentes. No hay envíos a WordPress ni capacidades de publicar o de aprobar. **La versión de revisión combina el SHA-256 del HTML con los metadatos Yoast (título, descripción y palabra clave)**. Una modificación SEO genera una revisión nueva; una aprobación antigua sobre ese conjunto no puede reutilizarse. Para paquetes legados sin `review_revision_sha256` se mantiene el hash de contenido, siempre dentro de LAB y sin derecho de publicación.

## Pruebas y aceptación
- CI con funciones simuladas que reproducen las respuestas del conector real y verifican el circuito completo con Action Gateway y un JOB-001 persistente. **Fixture sintético; no afirmar E2E físico WordPress→Gateway.**
- Solo podrá conectarse al runtime permanente tras auditoría de la identidad del conector y el Gateway, backup/rollback, pruebas de fuentes y comparación OLD vs NEW, sin tocar App/CRM.
- La vía preferida es **polling con permisos de lectura**, en el runtime compartido y con frecuencia limitada, sin modificar WordPress. El programador real no se ha configurado en esta fase. Cuando existan permisos verificables, se podrá montar el polling y medirlo.
- Permanece pendiente la revisión visual en navegador autenticado y QA independiente del borrador #52656. Ni una valoración sintética ni una señal de WordPress equivalen a tu aprobación.
- Sin nueva suscripción ni necesidad de IA de pago; solo revisión y pruebas con herramientas existentes.

**No confundir preparado con operativo:** 0 webhooks desplegados, 0 runners enlazados a WordPress oficial, 0 publicaciones automáticas. La PR sigue DRAFT.

## 05-11-2026 · Detector de borradores y vigilancia real sin escrituras

- Inventario en WordPress PROD con conector autorizado y funciones GET: 11 entradas `post` en `draft` y 14 páginas `page` en `draft`. El borrador piloto `52656` aparece como entrada más reciente. Varios documentos antiguos contienen `archive`/`legacy` en el slug: nunca tratarlos automáticamente como contenido nuevo ni sobrescribirlos.
- Adaptador aditivo `runtime/seo-official-draft-poll-lab-v0.mjs`: consulta **solo** `post` en `draft`, orden por modificación y máximo 20 por lectura. Comprueba completamente IDs y estado antes de encolar nada para evitar escrituras parciales ante respuestas fraudulentas; excluye los archivos históricos; deriva cada candidato a `ACTGW-001` y `JOB-001` mediante el adaptador ya probado. El runtime revalida el artículo y Yoast contra el conector autenticado y no confía en el listado.
- Los borradores `page` anteriores permanecen sin procesar; el diseño de páginas requiere una ampliación separada con QA específico y protección frente a archivos legacy. Si hay más de 20 `post`, el resultado informa `truncated:true`; no declara cobertura completa.
- **Operativo separadamente:** vigilancia diaria de solo lectura desde ChatGPT mediante conexión Cowboy MCP ya existente, configurada para comprobar cambios y avisar únicamente cuando existe novedad o aprobación requerida. **Esta vigilancia no constituye un worker JOB-001 conectado en PROD** y no crea jobs ni publica en WordPress.
- **Pendiente:** montar el adaptador en el runtime compartido con identidad real verificada y scheduler específico. El operador universal ya instalado en WordPress tiene cola nativa, pero su código indica literalmente `PREPROD only; inspect_post ONLY` y requiere `manage_options`. No desbloquearla ni ejecutarla en PROD.
- Cero plugins nuevos, cero contratos de IA de pago, cero cambios en la configuración Core Guard. `operations_locked=true` preservado.

