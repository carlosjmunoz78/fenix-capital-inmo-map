# UMS-001 · Entrada por solicitudes internas y ChatGPT · V1

**Decisión operativa (12/11/2026):** la consola NO es prerequisito para el motor de imágenes. Tampoco lo son cron ni programación periódica para producir un recurso.

## Productores de encargos

1. **CEREBRO Social:** evento `SOCIAL_CONTENT_REQUESTED` → productora UMS-001 → activo de imagen de QA aprobado → `UMS001_ASSET_DELIVERED` a Social (el publicador preexistente sigue siendo el único responsable de publicar).
2. **CEREBRO SEO:** evento `SEO_MEDIA_REQUESTED` → productora UMS-001 → activo aprobado, metadata ALT, dimensiones, derechos y hash → `UMS001_ASSET_DELIVERED` al motor SEO. SEO conserva la responsabilidad de WordPress e indexación.
3. **Otros motores (CRM, Marketing, Formación):** eventos `MEDIA_JOB_REQUESTED` con identidad IAM real del motor y política por destinatario.
4. **ChatGPT:** orden explícita del propietario → adaptador autorizado del Gateway CEREBRO → exactamente el mismo contrato y control de seguridad, **nunca** directo a un Worker de firma con secretos.
5. **Consola futura:** otro cliente del Gateway; no se modifica el contrato de UMS-001 ni el runtime de los motores de medios.

## Contrato mínimo

`company_id`, `engine_id=UMS-001`, `environment`, `version`, `request_id` idempotente, `origin_engine_id`, `requested_by` (identidad validada en Gateway, NO texto afirmado por el payload), `target_consumer_engine_id`, `event_type`, `asset_kind`, `item_id`, `brief_ref`, `channel`, `placement`, `format`, `rights_profile`, `deadline` si existe, `policy_version`, `max_attempts`, `max_cost_eur`, `publish_requested=false` por defecto, `reply_to` privado.

- Aceptar solo eventos de motores registrados/autenticados, autorizados para compañía y destino; revisar mapping `fenix-capital` (Social) ↔ `fenix` (UMS): el contrato de Social registra `producer_identity_mapping_verified=false`. **No marcar conectado hasta probar IAM real.**
- Separar **pedido** de **autorización**: ningún emisor puede elevar permisos, aprobaciones de derechos ni presupuesto mediante flags de JSON.
- Idempotencia `company_id + environment + origin_engine_id + request_id + item_id`; dedupe atómico en runtime transaccional ligero, sin cargar Supabase principal; máximo de reintentos por pieza y bloqueo de ejecuciones dobles.
- Salida observable `UMS001_ORDER_ACCEPTED` / `UMS001_ORDER_HELD` / `UMS001_ASSET_QA_PENDING` / `UMS001_ASSET_DELIVERED` / `UMS001_JOB_FAILED` por cola privada y DLQ cuando proceda. `HUMAN_REQUIRED` solo por códigos del proyecto.
- Preservar motores actuales, vínculos sociales, automatizaciones, SEO, WordPress, App/CRM y Supabase sin modificación. No crear otro publicador ni exposición HTTP pública.
- Derechos, claims financieros/inmobiliarios, marca, QA visual real, export y coste tienen gates independientes. Piezas no conformes siguen privadas; sin consentimiento/contrato no publicar.
- Por defecto hasta la promoción certificada: `environment=LAB`, `paid_execution_enabled=false`, `automatic_publication=false`, `video_enabled=false`, `max_additional_cost_eur=0`.

## Ruta de ejecución sin consola

`Motor emisor / ChatGPT → CEREBRO Gateway (IAM y permisos) → Bus/Eventos (dedupe y ledger) → UMS-001 (brief y generación) → QA/rights/finops → Almacén privado + comprobante → evento de entrega → motor solicitante → su publicador preexistente si está autorizado`.

El Gateway recibe órdenes; no es la consola. El motor solicita un trabajo en el momento en que surge la necesidad. La agenda es opcional **solo para el momento en que Social/SEO determinen que hace falta nuevo contenido**; no es un requisito de UMS.

## Estado comprobado y gates faltantes

- **HECHO:** firma Ed25519 canario DIAG03 LAB, evidencia de `SIGNED_COMMAND_SENT`, `ACCEPTED / QA_SUBMITTED` y nonce replay; sin cron ni consumidor temporal después de la prueba.
- **EXISTENTE:** entrada autónoma por archivo `requests/autonomous-inbox/`, `runtime/ums001_image_autonomous_intake_lab_v1.mjs` y `runtime/ums001_private_order_bridge_lab_v1.mjs`; el último se conecta a un ledger privado y no autoriza por sí solo proveedores ni publicación.
- **EXISTENTE:** `registry/fenix-social-ums001-dual-network-handoff-v0.json` define eventos Social, pero estado explícito `HANDOFF_CONTRACT_ONLY_LAB_NO_EVENTS_CONNECTED_NO_PUBLISHING`.
- **PENDIENTE:** autenticación e identidad real de emisores (incluido `fenix-capital` vs `fenix`), transporte real Social→Gateway→UMS y SEO→Gateway→UMS, callback/receipts seguros, QA + derechos y finops, entrega física de activos, promoción controlada y ChatGPT→Gateway con autorización verificada. No se afirma que estén conectados.
- **CONSERVAR:** adaptadores y publicadores ya existentes. La Consola se añadirá solo como cliente adicional del Gateway, no como gate de operaciones.

## Aceptación física

1. En LAB cada motor Social y SEO emite **una solicitud autenticada** y obtiene ACK idempotente verificable. Sin IA de pago.
2. Se produce y comprueba un activo de prueba o material ya autorizado, sin superar presupuesto, con QA/rights/claims y asset hash.
3. Entrega mediante evento privado confirmado en motor solicitante. Reenvío mismo request_id no duplica ejecución ni gasto.
4. Validar fallo de IAM, replay, budget, derechos y receptor ausente; backup, observabilidad, rollback y comparativa OLD/NEW.
5. Promoción gradual por motor/destino. La publicación no se habilita por la firma ni por un ACK de cola; requiere sus gates propios.

**No activar PROD ni declarar autonomía plena mientras no haya pruebas físicas de estas rutas.**
