# UMS-001 / SOC-001 · Image integration LAB · 2026-11-12

## Estado físico VERIFICADO
- LAB Cloudflare UE, sin subdominios, previews, cron ni publicación.
- Worker `cerebro-ums001-social-creative-bridge-lab-eu` recibe eventos privados de tipo `SOCIAL_CONTENT_REQUESTED` y registra brief.
- Cola entrada Social `cerebro-ums001-social-creative-event-lab-eu`: `bc357a2feb5e4c6fa0c979a964c5c8d0`; consumidor `3c746ac3517642ca85f2a6cd4a1cb397`.
- Cola universal Social `cerebro-ums001-universal-social-intake-lab-eu`: `adaf3bda0a9b4bfeb8ca0c02bebe6f40`; consumidor Router `0bb60833dfac48e3bd167af9ed78193c`.
- Router existente `cerebro-ums001-universal-router-lab-eu` conserva `GATEWAY_ENABLED=false`, y usa `SOCIAL_QUEUE_ENABLED=true` solo para queue privada.
- AI factory `cerebro-ums001-ai-image-factory-lab-eu` genera imagen JPEG 512x512 con Cloudflare FLUX.1 schnell, una llamada, sin fallback.
- Cola de retorno `cerebro-ums001-social-private-reply-lab-eu`: `8ec1e374e4ee48728a1c8f4b0564942f`; consumidor Social `739f53b49b7d46049c333fdd679f1862`.
- El receptor Social relee archivo privado en KV, verifica SHA256 y guarda ACK `PRIVATE_ASSET_RECEIVED`; publicación / entrega comercial = OFF.
- No se alteraron App, CRM, Supabase PROD, WordPress, Instagram AUTOQUAL ni Buffer. Instagram AUTOQUAL sigue `AUTOQUAL_ENABLED=false`.

## Pruebas
1. `UMS001-LAB-SOC001-INSTAGRAM-E2E-20261112-01`: JPEG 690278 bytes; SHA `e12cdf615cd589ba5bbd1977ed76b5d38edbc132eda4d7d5839606eda75d3177`; factory `PRIVATE_READY`, Router `PRIVATE_READY`.
2. `UMS001-LAB-SOC001-FACEBOOK-RETURN-20261112-01`: JPEG 1023679 bytes; SHA `cc20d639ddfb1c182a8dd522c5a75b54e115074a1bf12b08f6e02cfe93515d38`; callback añadido después de esta prueba.
3. `UMS001-LAB-SOC001-INSTAGRAM-DELIVERY-20261112-02`: JPEG 775607 bytes; SHA `60c57033aec17113481a2309438fac8b9ebea1869cf5b5f5dbde3cfa58caf2c1`; FACTORY: `PRIVATE_READY`; CALLBACK: `DELIVERY_QUEUED`; receptor SOC-001: `PRIVATE_ASSET_RECEIVED`, `UMS001_ASSET_QA_PENDING`, SHA igual; Queue retorno backlog 0.

## Límites y veracidad
- Las solicitudes de prueba se **inyectaron por la API de administración Cloudflare** usando `SOC-001` como identidad de contrato. Esto NO prueba que el motor de Instagram/Facebook real emita eventos automáticamente ni IAM real verificado. El campo `trusted_mapping=GATEWAY_IAM_VERIFIED_FENIX_LAB` usado en el canary es **una afirmación en el payload, no evidencia criptográfica**. PROHIBIDO promover esta validación a PROD sin resolver autenticación en Gateway.
- El contrato puro de Social en `fenix-capital-cerebro-social/social_orchestration_v0/ums001-universal-social-consumer-lab-v1.mjs` existe, pero tiene `dispatch_authorized:false` y requiere IAM de origen real. No se ha integrado el disparo autónomo del runtime Social.
- QA técnico PASS no equivale a validación visual/brand/copyright. Requiere marca oficial y revisión especializada antes de compartir/publicar.
- La salida de prueba es 512x512 JPEG y NO demuestra formatos publicables Instagram 4:5 o Facebook. La adaptación/ensamblaje oficial aún está pendiente.
- **Costes:** el bloqueo artificial 3 imágenes/día fue eliminado en LAB y sustituido por contador estimado de 8000 neuronas/día (4 steps x 512). El estimador KV NO es una reserva atómica ni un tope contable global; Cloudflare Billing no se pudo leer (403), el cargo real NO está certificado. No hay auto-topup.
- No existe aún entrega al publicador real, firma verificable de ACK, ni autonomía universal a todas las empresas/motores.
- LAB cuenta con una tarjeta de pago; los costes y plan deben auditarse antes de expansión continua.

## Próxima activación controlada
1. Registrar SOC-001 en Gateway IAM con credenciales cifradas, autorización de compañía y motor, firma + antirreplay.
2. Cablear el **emisor real** de eventos Social hacia la cola LAB sin simular `trusted_mapping`; prueba IAM negativa y positiva.
3. Adaptar formatos 4:5, 1:1, 16:9; composición de logo con hash de origen y QA derechos/marca.
4. Implementar devolución segura al scheduler/publisher existente con recibo firmado, y ejecutar shadow sin publicar.
5. Auditoría de coste y consumo real antes de autonomía y promoción; no abrir main ni cambiar PROD sin OLD vs NEW, backup y rollback.

## Rollback
- Social bridge `SOCIAL_BRIDGE_ENABLED=false`; Router `SOCIAL_QUEUE_ENABLED=false`, `IMAGE_BRIDGE_ENABLED=false`; Factory `GENERATION_ENABLED=false`.
- Si una cola debe desconectarse, retirar SOLO su consumer ID arriba identificado; no borrar otros recursos.
- Código Worker de referencia guardado junto a este documento, PR #46; no fusionar ni utilizar directamente como política de PROD.
