# UMS-001 · Cloudflare AI Image Factory · LAB (2026-11-12)

**Estado:** E2E técnico privado ChatGPT→Gateway Router→Queue→FLUX.1 schnell→KV→QA técnico→reconciliación Router **verificado**. No PROD, publicación ni entrega comercial.

## Activos físicos
- Cuenta Cloudflare: `e39a57e1ac42650ca5a6d5307cf0ac8e`.
- Entrada existente: `cerebro-ums001-universal-chatgpt-intake-lab-eu` (jurisdicción EU).
- Router existente actualizado incrementalmente: `cerebro-ums001-universal-router-lab-eu`.
- Cola nueva: `cerebro-ums001-ai-image-factory-lab-eu`, id `69ea34926acd4f42a12d442759304e8e`, EU.
- Worker nuevo privado: `cerebro-ums001-ai-image-factory-lab-eu`.
- KV privado existente: `77ea3a22f3584e00aae6552829167668`.
- Consumidor de comandos firmados recuperado: `cerebro-ums001-signed-qa-receiver-lab-eu` en `cerebro-ums001-image-signed-command-lab-eu`, consumer id `f27969f3465541b28f0def5814d47e93`.
- Nuevos Workers: sin subdominio/previews públicos, sin cron, sin gasto/pago configurados ni publicación.

## Flujo de orden desde ChatGPT conectado a Cloudflare
1. Generar `request_id` único e inmutable.
2. Guardar brief privado JSON en KV `meta/ums001-ai-image-factory/v1/briefs/CHATGPT-001/{request_id}` con `company_id=fenix`, `environment=LAB`, `origin_engine_id=CHATGPT-001`, `rights_profile=SYNTHETIC_ORIGINAL`, `publish_requested=false`, `prompt` y `request_id`.
3. Enviar evento canónico `MEDIA_JOB_REQUESTED` al Queue preexistente `cerebro-ums001-universal-chatgpt-intake-lab-eu`, no directamente a la factory; origen `CHATGPT-001`, consumidor `SEO-001`/SEO o `SOC-001`/red social. `asset_kind=IMAGE`, `capability_id=IMAGE.SYNTHETIC`, `format={profile_id:SEO_HERO_1_1,width_px:512,height_px:512,duration_seconds:null,output_mime:image/jpeg}`; presupuesto con `max_additional_cost_eur=0`, `max_attempts=1`, `prepaid_only=true`, `paid_execution_enabled=false`, `auto_recharge=false`, `publish_requested=false`; `brief_ref=cerebro://briefs/ums001/{request_id}`, `reply_to=cerebro://events/ums001/lab`.
4. Router valida, registra e inserta en Queue AI; la fábrica lee el brief, genera UNA vez con `@cf/black-forest-labs/flux-1-schnell`, guarda JPEG privado y valida integridad SHA-256.
5. Leer `meta/ums001-ai-image-factory/v1/receipts/CHATGPT-001/{request_id}/IMAGE001` y `meta/ums001-universal-job/v1/CHATGPT-001/{request_id}/IMAGE001` en KV respectivos. `PRIVATE_READY` **solo significa entrega privada técnica**, NO permiso de publicar.

## Controles y límites
- Solo LAB y `company_id=fenix`. Empresa adicional necesita IAM/contratos y pruebas de aislamiento.
- Solo imágenes sintéticas, 512×512 solicitado, salida JPEG; comprobar dimensiones físicas antes de afirmar formato de publicación.
- Un modelo; sin fallback de pago; entrada por cola privada, sin accesos públicos ni cron; tres intentos exitosos/día máximo diseñado en KV (no es cuota transaccional/garantía antifacturación).
- Cloudflare Workers AI ofrece 10.000 neuronas/día gratuitas según documentación del proveedor, pero **no se pudo consultar el plan/billing real (API 403)**; coste facturado NO VERIFICADO. No declarar cero euros comprobados.
- La comprobación de JPEG y SHA-256 es técnica; **QA visual, conformidad de marca, derechos específicos y publicación siguen pendientes**, al igual que entrega a sistemas ajenos.
- `GATEWAY_ENABLED=false` en RPC HMAC y `ADAPTER_ENABLED=false` se preservaron. Los motores Social/SEO todavía NO pueden originar eventos automáticamente sin su registro IAM.
- La reconciliación del Router relee KV tras la ventana de caché negativa y acepta trabajos HELD previos con recibos reales, sin nuevas generaciones.

## Reversión
- Desactivar `IMAGE_BRIDGE_ENABLED` en el Router y `GENERATION_ENABLED` en la fábrica, o retirar exclusivamente el consumidor `b83141a01b6e433dbc1b5f0d7515d226` de la nueva cola.
- Router: versión anterior a la integración `93849d97-2a0a-4da5-8cee-c21566726231`; preservar también los deployments intermedios. No eliminar KV ni colas existentes.
- No fusionar a main ni promover a PROD sin pruebas y aceptación de seguridad/coste/licencia/entrega.
