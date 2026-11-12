# UMS-001 · Productora Universal · Solicitudes autónomas de cualquier motor

Fecha: 12/11/2026. Entorno: LAB. PR #45 DRAFT. Coste adicional: 0 €.

## Decisión

La Productora (UMS-001) es un servicio horizontal de CEREBRO. Un motor que necesita imagen, vídeo, audio o material audiovisual lo pide cuando surge la necesidad, mediante evento interno. NO requiere un cron general, ni que la Console esté terminada. ChatGPT y la futura Console serán clientes del mismo Gateway, nunca vías directas para saltar IAM. Cada motor consumidor conserva su propio publicador; UMS NO publica.

## Artefactos reales de este bloque

- contracts/media-job-request.v1.schema.json: petición estándar JSON Schema 2020-12, versión 1.0.0, cerrada, multicompañía.
- registry/media-consumers-universal-v1.json: perfiles Facebook, Instagram, LinkedIn, SEO, YouTube, TikTok y GENERIC, sin falsas conexiones activas.
- runtime/ums001_universal_media_request_lab_v1.mjs: planificador determinista, normalizador de eventos y scaffold de consumo para FACT-001; sin IO externo ni proveedores.
- tests/ums001-universal-media-request-lab-v1.test.mjs: regresiones positivas y negativas, sin llamadas de pago.

## Contrato obligatorio

Campos top-level exactos:
schema_version, event_type, request_id, company_id, engine_id, origin_engine_id, environment, version, trigger, asset_kind, capability_id, item_id, consumer_engine_id, channel_id, placement, brief_ref, format, rights_profile, priority, requested_at_utc, deadline_utc, policy_version, budget, reply_to.

- event_type: MEDIA_JOB_REQUESTED.
- engine_id: UMS-001. origin_engine_id: motor que pide. consumer_engine_id: motor que recibirá el activo.
- trigger: ENGINE_EVENT | CHATGPT | CONSOLE. La identidad se toma del principal del Gateway, NO del JSON enviado.
- asset_kind: IMAGE | VIDEO | AUDIO | AV_PACKAGE | THREED | VFX | ADAPTATION. capability_id declara una subcapacidad, no un modelo de pago.
- channel_id y placement son perfiles declarativos, no bifurcaciones del núcleo.
- format: profile_id, width_px, height_px, duration_seconds, output_mime.
- brief_ref: referencia interna; NO incluir secretos ni URL ajena.
- budget: max_additional_cost_eur, max_attempts, prepaid_only, paid_execution_enabled, auto_recharge, publish_requested.
- reply_to es una ruta de eventos PRIVADA de CEREBRO.

Idempotencia: SHA-256 por company_id + environment + origin_engine_id + request_id + consumer_engine_id + item_id. La función calcula la clave; **la reserva atómica y deduplicación real deberán implementarse en el bus/ledger privado antes de despachar**.

## Eventos

Entrada canónica: MEDIA_JOB_REQUESTED. Compatibilidad por adaptador:
SOCIAL_CONTENT_REQUESTED → MEDIA_JOB_REQUESTED.
SEO_MEDIA_REQUESTED → MEDIA_JOB_REQUESTED.

El adaptador no inventará atributos faltantes ni convertirá un evento no firmado en confianza.

Salidas canónicas: UMS001_ORDER_ACCEPTED, UMS001_ORDER_HELD, UMS001_ASSET_QA_PENDING, UMS001_ASSET_DELIVERED, UMS001_JOB_FAILED, UMS001_HUMAN_REQUIRED.
Un ACK de aceptación SOLO se envía después del registro durable del pedido. El módulo de LAB no emite ACK ni envía trabajos.

## Red social / SEO / motor futuro

Social puede encargar creatividades para Facebook, Instagram y LinkedIn; SEO, recursos web; YouTube y TikTok disponen de perfiles de contrato pero NO de conexiones operativas. LinkedIn requiere el refuerzo del departamento, por separado. El consumidor debe implementar los eventos de retorno y la publicación por su adaptador preexistente cuando esté autorizada.

FACT-001, para todo motor nuevo, podrá crear el descriptor MEDIA_CONSUMER_V1 a partir del helper scaffoldMediaConsumer. El hook se crea SCAFFOLDED_NOT_CONNECTED, gateway_iam_authorized=false. Registrar un canal nuevo o un motor nuevo no requiere reescribir el núcleo de UMS, pero la conexión real necesita IAM, transporte y pruebas. Con perfil GENERIC pueden representarse nuevos destinos, sujetos a políticas.

## Seguridad, derechos, dinero

El planificador acepta SOLO LAB en esta versión ejecutable, coste adicional 0 €, máximo dos intentos, saldo prepagado como requisito, gasto y recarga desactivados, publicación desactivada, siempre con QA/derechos pendientes. VIDEO puede PLANIFICARSE, pero no se produce ni se publica desde este módulo.

La confianza de IAM debe llegar desde Gateway autenticado y registro de motores confiable, nunca desde un usuario, prompt o JSON. Este validador no autentica criptográficamente al emisor ni verifica derechos ni crea medios. No exponer endpoints públicos; no tocar App/CRM, Supabase PROD, DNS ni WordPress.

## Conservación OLD vs NEW

- OLD: auto-intake LAB con 11 piezas limitadas, ledger privado existente, firma Ed25519 verificada en DIAG03, contrato parcial de Social y SEO.
- NEW: solicitud universal para múltiples motores/modalidades/canales, perfiles declarativos, validación IAM preflight, scaffold FACT-001 sin permisos.
- NO SUSTITUIDOS: viejo intake, ledger, workers Ed25519, Buffer, WordPress, Social, SEO y motores actuales.
- FALTA: Gateway y bus físico, conexión de Social/SEO y FACT-001, recibos de entrega físicos, QA y derechos reales para cada activo, comparación OLD/NEW en ejecución.

## Aceptación física pendiente

1. Gateway privado real con IAM por empresa, entorno, motor y destino; bus y ledger atómico con dedupe, DLQ, auditoría, observabilidad y backup.
2. Un evento real desde Social y otro desde SEO, con ACK durable y callback confirmado en los motores, sin publicar.
3. Un pedido de motor nuevo generado por FACT-001, con su hook listo y permisos concedidos únicamente por política.
4. Activo privado real con hash, licencia/derechos, QA independiente, coste y recibo verificado. Reintento no genera gasto duplicado.
5. PREPROD si procede en el subsistema, tribunal, pruebas de rollback y promoción gradual. En ningún caso tocar la App/CRM protegidos sin sus gates.

## Rollback

Archivos aditivos en PR #45 DRAFT. Punto de conservación antes de este bloque: 48ffef988ffa517d3fad4caf79eb8cf823df8a7e. Para revertir, retirar estos nuevos archivos de la rama sin alterar lo existente. No hay cambios de recursos Cloudflare, secretos, crons, publicaciones ni producción vinculados a esta definición.

## Estado

HECHO: schema, registry, planner, tests, runbook.
PARCIAL: integraciones históricas de entrada y firma Ed25519 (la firma DIAG03 está validada en LAB, no equivale a canal universal conectado).
DEFINIDO: FACT-001 consumidor de medios, Social/SEO, nuevos canales y ChatGPT/Console como clientes Gateway.
PENDIENTE: despliegue universal real y autonomía end-to-end. No afirmar operación completa por pasar tests offline.

## Contrato de eventos de retorno

contracts/media-job-response.v1.schema.json cierra también la **salida**, no solamente la entrada. Todos los motores reciben la misma estructura con:

schema_version, event_id, event_type, company_id, engine_id, environment, version, request_id, origin_engine_id, consumer_engine_id, item_id, idempotency_key, occurred_at_utc, status, asset, exception, policy_version, publication_authorized, additional_cost_eur.

El estado debe coincidir exactamente con el tipo de evento. Antes de una entrega, asset es null; cuando el estado sea DELIVERED, asset incluye private_ref, sha256, mime_type y referencias PRIVADAS a los cuatro comprobantes: QA, derechos, procedencia y entrega firmada. **Las referencias NO prueban por sí solas una firma**: el receptor deberá verificar esas pruebas y sus hashes contra el almacén privado. Ningún evento de esta primera versión concede publicación ni gasto adicional.
