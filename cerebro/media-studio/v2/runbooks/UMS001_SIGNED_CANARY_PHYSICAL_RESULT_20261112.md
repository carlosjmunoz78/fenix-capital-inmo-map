# UMS-001 · Canario físico de orden Ed25519 · 12/11/2026

**Estado: PARCIAL — FIRMA EMITIDA, ACEPTACIÓN CRIPTOGRÁFICA DEL RECEPTOR NO DEMOSTRADA.**

## Hechos verificables

- Cloudflare account `e39a57e1ac42650ca5a6d5307cf0ac8e`, solo dos Workers LAB previamente creados.
- La clave privada `ORCH_SIGNER_PRIVATE_PKCS8_BASE64` está configurada como `secret_text` solo en `cerebro-ums001-signed-orchestrator-lab-eu`.
- El receptor `cerebro-ums001-signed-qa-receiver-lab-eu` contiene `ORCH_PUBLIC_SPKI_BASE64` como `secret_text` y `ORCH_PUBLIC_SPKI_SHA256` como `plain_text`; no contiene la clave privada.
- Desplegado el código endurecido del PR #45 en versiones: emisor `f024c03d-2a4f-4ae6-accc-ffa0c5bf2ff4`; receptor `288f0236-e535-4691-abf8-f919c274bfbf`; preservados todos sus bindings mediante `inherit` estricto.
- Consumidor temporal firmado, batch 1 / concurrencia 1 / retry 1, asociado exclusivamente a la cola `39d92161f2ac429791bbcc3dfd25c6b8`.
- Cron temporal del emisor `* * * * *`.
- KV ONCE `475ba0abb99640848b0bfacfb5431f70` contiene una entrada para `meta/ums001-signed-once/v1/fenix/UMS-001/LAB/LI-FEED-01`, con estado `SIGNED_COMMAND_SENT` y tiempo `2026-11-12T09:36:19.387Z`; esto prueba que el emisor importó clave privada, firmó y envió una orden a la cola, pero **NO prueba aceptación del receptor**.
- KV REPLAY `561e0d5ce2be437085144c16eae5f712` no mostró ninguna clave bajo `meta/ums001-ed25519-replay/v1/` durante el readback del 12/11/2026 09:37–09:38 UTC. La cola firmada tenía backlog 0. **No se ha observado la aceptación ni el envío downstream a QA**. No hay registro de motivo exacto del rechazo; no inventarlo.
- Rollback físico HECHO: cron del emisor eliminado, cron count=0; consumidor temporal `f7e5d436c1c949e09f8921c2c48c1231` eliminado, consumer count=0; backlog de la cola=0.
- No se abrieron rutas públicas ni se cambiaron App, CRM, Supabase, WordPress, redes sociales, DNS o otros Workers. Generaciones IA de pago en esta prueba = 0; publicaciones = 0.

## Bloque exacto siguiente

1. Obtener evidencia de recepción y código de rechazo sin imprimir claves, payload completo ni identificadores confidenciales: observabilidad aislada de Cloudflare Worker del receptor, solo códigos normalizados y contadores; no activar logs generales de PROD.
2. Verificar con test aislado en LAB que la huella SPKI del secreto público coincide con la variable fija y la firma del emisor; **no copiar/recuperar claves al chat**.
3. Preparar un **nuevo** canario permitido por contrato, distinto del one-shot ya usado; mantener límites y no resetear/borrar la entrada ONCE para simular éxito. Añadir evidencias de recepción y el rollback al flujo.
4. Repetir un canario en la misma cola únicamente después del test/observabilidad; verificar KV de replay, lectura del receptor y QA destino; después apagar cron y quitar consumidor.
5. Una firma de `QA_METADATA_ONLY` no habilita inferencia pagada, publicación, entrega comercial ni vídeo. El módulo compartido Ed25519 de imagen+vídeo aprobado por CI está en `security/media-command-signature-v1.mjs` pero **aún no se ha integrado físicamente a ambos runtimes de medios**. Gate `MEDIA_SIGNING_IMAGE_VIDEO_OPERATIONAL=false`.
6. Mantener `IMAGE_GATE_GREEN=false` mientras sigan derechos/QA editorial, seis piezas sin generar, problemas de historia Instagram y entrega end-to-end sin aprobar.

**No tomar el éxito del envío como éxito de firma extremo a extremo ni declarar la productora en producción.**
