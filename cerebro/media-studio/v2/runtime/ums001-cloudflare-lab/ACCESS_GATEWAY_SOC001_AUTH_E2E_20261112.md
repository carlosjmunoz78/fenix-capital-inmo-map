# UMS-001 · Acceso propietario + autenticación SOC-001 (LAB, 12-11-2026)

**HECHO físicamente, verificado mediante Cloudflare API**: Worker privado `cerebro-ums001-owner-access-gateway-lab-eu`, Cloudflare Access app `c6d0d111-67b9-4ccc-823f-7645cdb0c84f`, Worker tag `d2873080a2a743939f9544296e9828b1`. Solo acceso aprobado a la identidad del propietario `carlosj.munozcabeza@gmail.com`; sin rutas Preview. Workers.dev habilitado DESPUÉS de verificar Access. Ruta inferida por Cloudflare Workers: https://cerebro-ums001-owner-access-gateway-lab-eu.carlosj-munozcabeza.workers.dev/

## Gateway de propietario
- Página web privada para crear una imagen con prompt y elegir canal SEO/Instagram/Facebook/LinkedIn/YouTube/TikTok. Flujo GET / y POST /v1/media/jobs; GET /v1/media/jobs/:id para estado y /v1/media/assets/:id devuelve JPEG privado con SHA256 comprobado.
- `fetch()` exige `ctx.access.getIdentity()` y email propietario; sin contexto Access devuelve 403. **Aún no se ha verificado mediante sesión de navegador real que Access entregue ese contexto**. La disponibilidad del URL público tampoco se pudo verificar con un cliente HTTP externo; sólo están verificados la regla Cloudflare Access y Workers.dev habilitado.
- Gateway escribe brief y envía comando a `cerebro-ums001-universal-chatgpt-intake-lab-eu`; de ahí a Router, Factory, KV. No publica.
- El endpoint es solo para Fénix LAB: formatos cuadrados JPEG 1024x1024; no aprueba imagen comercial.

## Autenticación servicio SOC-001
- `cerebro-ums001-social-creative-bridge-lab-eu` cambió el despacho directo a un **Service Binding** `UNIVERSAL_MEDIA` hacia el entrypoint privado `UniversalImageGateway.submitEngine`.
- `SOC_ENGINE_TOKEN` (caller) y `SOC001_TOKEN` (gateway) creados mediante RNG criptográfico y guardados **sólo** en Cloudflare Worker Secrets. Los valores no se imprimieron, guardaron ni entregaron en el chat/GitHub.
- Gateway compara SHA256 del token y valida empresa `fenix`, motor `SOC-001`, canales Facebook/Instagram, presupuesto de ejecución 0 y `publish_requested=false`.
- **Prueba real de servicio** `UMS001-LAB-SOC001-IAM-E2E-20261112-01`: evento enviado manualmente por API administrativa a cola privada, Social Bridge invocó Service Binding autenticado, el Gateway devolvió orden y generó un JPEG **1024x1024 de 486796 bytes**, SHA256 `ed6f1ea89dcd40291614e839e5d1492577ee7f3d9c6f8bdcd7b836bfaf928bf7`, Factory `PRIVATE_READY`, Social recibió `PRIVATE_ASSET_RECEIVED` con SHA coincidente y publicación deshabilitada.
- El registro de Router mostró temporalmente `HELD/IMAGE_BRIDGE_TIMEOUT_OR_NO_RECEIPT` por desincronización KV. El **recibo de Factory y entrega de Social están confirmados**; el Router no debe declararse verde hasta reconciliarlo.

## Estados no acreditados
- **No hay evidencia de que el runtime nativo del planificador de Facebook/Instagram haya enviado la solicitud.** La prueba de origen fue una inyección administrativa a cola Social con un secreto RPC válido entre Workers. IAM real del productor existe para el Service Binding, no para el evento previo.
- Solo SOC-001 está autenticado al Gateway; faltan secretos y conexiones de SEO-001, FACT-001, CRM, marketing y resto de motores.
- No existe autorización automática para publicación, QA visual/de marca, ni formatos comerciales adicionales (4:5, 16:9).
- Cloudflare cuenta con posible método de pago, pero facturación no consultable con permisos disponibles; **no certificar coste adicional 0 €** ni gasto ilimitado autorizado. Mantener guardas de modelo y cuotas internas.

## Rollback
1. Workers.dev del owner gateway: deshabilitar subdomain (NO borrar Access primero).
2. Social Bridge: revertir al commit anterior del Worker o pasar `SOCIAL_BRIDGE_ENABLED=false`; conservar sus queues y KV.
3. Factory: `GENERATION_ENABLED=false` si incidente.
4. Router: `SOCIAL_QUEUE_ENABLED=false` para detener intake.
5. Restaurar las versiones previas; no tocar App, CRM, DNS, WordPress, Instagram AUTOQUAL ni Buffer.
Regla: mantener gateway protegido por Access hasta que no tenga ruta pública.

**PR LAB:** https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/46 · no fusionar a main sin gates, QA, rollback y prueba del emisor nativo.
