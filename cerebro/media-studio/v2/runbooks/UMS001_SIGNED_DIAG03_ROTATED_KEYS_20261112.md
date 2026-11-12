# UMS001 · DIAG03: comprobación E2E tras rotación Ed25519 · 12 noviembre 2026

## Estado

**HECHO:** claves de emisor y receptor reaplicadas manualmente por el propietario mediante Cloudflare Dashboard. Se verifican bindings (no los valores privados). Huella pública con formato SHA256. La igualdad entre SPKI y huella sólo la acredita el receptor ejecutando `crypto.subtle.digest`.

**CAUSA ANTERIOR CONFIRMADA (DIAG02):** KV del receptor indicó exactamente `UMS001_SIGNED_INBOX_TRUST_FINGERPRINT_MISMATCH` a las 2026-11-12T09:57:44.586Z. No confundir con un fallo de firma anterior sin evidencia. El segundo canario registró envío por el emisor; receptor rechazó antes de guardar replay.

## Nuevo canario físico seguro

- Cuenta Cloudflare `e39a57e1ac42650ca5a6d5307cf0ac8e`. Solo LAB, sin publicación, modelo pagado ni PROD.
- PR #45 DRAFT rama `cerebro/ums001-visual-learning-no-reference-lab-20261111`.
- Identidad rotada `UMS001-LAB-ORCH-ED25519-20261112-V2`, imagen metadata QA-only.
- Orden exacta `UMS001-LAB-LI-FEED-01-ARCHIVE-20261118`, idempotencia `meta/ums001-signed-once/v1/fenix/UMS-001/LAB/LI-FEED-01-DIAG03`.
- Diagnóstico seguro solo `meta/ums001-signed-diagnostic/v1/DIAG03` en KV de replay, código normalizado y estado aceptado/denegado, nunca contenido ni secretos.
- Emisor Worker `cerebro-ums001-signed-orchestrator-lab-eu` versión `d5c7cee7-c2e8-4768-87e2-5c1a8c027294`; receptor `cerebro-ums001-signed-qa-receiver-lab-eu` versión `e93402f2-9914-49ff-9fbd-63600500de28`. Subida de versiones con `inherit` estricto y despliegue 100% sin cambio de recursos ni permisos.
- CI `43197720902` en verde, pruebas de intake/seguridad/rechazo.
- Consumidor temporal y único de cola firmada `39d92161f2ac429791bbcc3dfd25c6b8`: `7e9f390ed25c4c16a83bed237fcb40fa`, batch 1, concurrency 1, max_retries 0.
- Cron temporal añadido `* * * * *` al emisor a las 2026-11-12T10:10:49Z; Cloudflare puede tardar hasta 15 minutos en propagar el trigger. ONCE controla duplicados y no se han borrado entradas antiguas.
- Cierre de seguridad programado 2026-11-12 11:32 Europe/Madrid (automación `Automation_80e00a7af2b88191a9503db9115e5494`): eliminar solo cron del emisor, luego solo consumidor temporal DIAG03 si backlog 0. Validar físicamente tras cierre.
- Resultado de prueba debe comprobar: ONCE `SIGNED_COMMAND_SENT`, DIAG03 `ACCEPTED/QA_SUBMITTED`, replay `stage:QA_QUEUE_SUBMITTED` y, si procede, cola QA. Sin esos elementos E2E queda **PENDIENTE**.

## Condiciones para seguir

Si `DENIED` con huella incorrecta otra vez: no re-generar claves automáticamente ni pedir que se escriban en chat; verificar el formato y correspondencia local de la huella calculada; no exponer contenido de secretos.

No promover imagen y vídeo a PROD ni publicar materiales sin prueba de calidad editorial, derechos y aprobación explícita. Firmar comandos de QA metadata no habilita gastos, descargas ni publicaciones.
