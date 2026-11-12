# UMS001 · Formato físico, coste y control de salida · Addendum LAB 2026-11-12

## Hallazgo y corrección
La prueba original almacenó JPEGs de **1024×1024 píxeles** con contrato de petición de 512×512. Eso era un falso verde de validación dimensional; JPEG/SHA correctos no bastaban para acreditar formato. Se midieron los bytes JPEG originales y se corrigió el contrato y el generador en Cloudflare LAB:
- Social bridge normaliza el contrato de imagen a 1024×1024, `image/jpeg`, sin publicación.
- Router valida 1024×1024 en la ruta de imágenes.
- Factory rechaza dimensiones que no sean 1024×1024 y analiza los segmentos SOF del JPEG para comprobar anchura y altura reales antes de `PRIVATE_READY`.
- Factory incluye `width_px`, `height_px`, `format_verified:true` en el recibo.
- Estimador de neuronas corregido a 57.6 por imagen 1024×1024 con 4 pasos (4 tiles × 4.8 neuronas + 4 pasos × 9.6), conservando margen de 8000 neuronas estimadas/día. Los contadores anteriores se reconciliaron al menos con `max(count*57.6,estimated_neurons)` para no infravalorar consumo.
- No se activaron servicios de pago adicionales ni publicación. El plan y consumo global de facturación siguen sin poder verificarse desde Cloudflare API (403). Este control KV no es una cuota atómica.

## Nueva prueba positiva y negación
`UMS001-LAB-SOC001-FORMAT-QA-20261112-V1`: origen de contrato SOC-001/INSTAGRAM (inyectado por Cloudflare ADMIN), archivo privado JPEG 1024×1024 de 637457 bytes, SHA256 `e3dbaab53a1e587e63f5f71aad48d6250e83b868cb7941d5cb2f867fb8a0462d`, factory `PRIVATE_READY`, `format_verified:true`, devolución `PRIVATE_ASSET_RECEIVED`, SHA igual, QA técnico PASS.
`UMS001-LAB-REJECT-DRAFT-20261112-V1`: solicitud no aprobada -> `HELD/UMS001_SOCIAL_NETWORK_APPROVAL`, 0 llamadas al modelo.

## Gating permanente
- Las imágenes previas emitidas con contrato 512×512 deben quedar **formato NO CERTIFICADO para comercial**; sus recibos históricos `TECHNICAL_QA_PASS` solo indican JPEG e integridad, no forma publicable.
- Imagen 1024×1024 cuadrada sirve de base editorial, pero **no** verifica composición vertical 4:5, ratio 16:9, logo oficial, accesibilidad ni afirmaciones publicitarias. QA visual/brand/rights pendiente.
- `trusted_mapping=GATEWAY_IAM_VERIFIED_FENIX_LAB` sigue siendo un campo declarativo del evento ADMIN; **NO** implica IAM verificado. Antes de recibir eventos automáticos del Social nativo debe implementarse Gateway IAM/credenciales secretas/capacidades y prueba positiva y negativa de autenticación. No usar el canal LAB administrativo como interfaz pública.
- Se mantuvo `AUTOQUAL_ENABLED=false` en Instagram. No hay conexión de cuenta Meta ni publicación; no afirmar producción autónoma total.

## Cloudflare referencias de coste/modelo
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/

## Rollback
Cambiar `SOCIAL_BRIDGE_ENABLED` a `false` en bridge; `SOCIAL_QUEUE_ENABLED` y `IMAGE_BRIDGE_ENABLED` a `false` en Router, `GENERATION_ENABLED` a `false` en Factory. Restaurar versiones anteriores identificadas por despliegues; no borrar ni tocar D1/otros Workers. GitHub PR #46 snapshot para recuperación.
