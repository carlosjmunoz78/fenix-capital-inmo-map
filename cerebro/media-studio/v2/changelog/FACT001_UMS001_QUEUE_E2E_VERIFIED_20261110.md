# CEREBRO OS · FACT-001 → UMS-001 · CIERRE FÍSICO LAB 2026-11-10

## HECHO · EVIDENCIA REAL
- Cloudflare EU Queue `cerebro-fact001-ums001-read-lab-eu`, ID `dbfb6b4bde2d448f88ca60ca9aa2cd5b`, consumidor FACT-001 existente `54a8996624344930a34c07146cdeecea`.
- Mensaje de CEREBRO vía Cloudflare API → Queue → Worker `cerebro-fact001-gateway-lab-eu-20261109` → named private Service Binding `UMS_PRODUCER` → `ProducerLibraryLab.readSelected` → KV original.
- Recibo físico VERDE en KV `meta/fact001-ums001-queue-e2e/v1/UMS001-QUEUE-CLEAN20261110C`: 20:01:46Z, 208766 bytes, SHA-256 `e84f82f453c52151d3a28ef22a22faeefdd5dda51f656c4b089c4b88dab8b508`, `downloaded_again=false`, `publish_authorized=false`.
- Segundo recibo anterior `UMS001-QUEUE-PHYS20261110B`: 19:59:57Z, mismo SHA. Se retiró el código temporal de diagnóstico y se verificó de nuevo el Worker limpio con un segundo envío.
- No se habilitaron rutas públicas ni crons. El Gateway FACT global mantiene `GATEWAY_ENABLED=false`, `CLOUDFLARE_API_ENABLED=false`, `ALLOW_MUTATIONS=false`.
- Nueva función exclusiva LAB `UMS001_QUEUE_ENABLED=true`. Secretos existentes intactos. No se expuso la clave de Cloudflare ni `UMS001_CALLER_TOKEN` en el mensaje o en GitHub.
- 14/14 tests locales del nuevo consumer: denegación PROD/otra empresa/cualquier actor/bulk/publicación/coste, SHA, error, idempotencia.
- Poly Haven: 3 assets originales, 4361001 bytes, un único cron `23 6 * * *` UTC. Sin cambios en App, CRM, Supabase PROD, SEO, WP, JARVIS ni Trading.
- Cloudflare Queues Workers Free incluye 10000 operaciones/día y retención 24 horas. Ningún servicio de pago contratado; no se auditó factura.
- Versión FACT aceptada `fbf9e7f0-59ed-433c-a25b-d02dcbfa3602`, original anterior `16bb1a1a-e0a7-4fe8-b15c-8d249c28cfa4`.
- Todos los resultados siguen `production_approved=false`, `publish_authorized=false`, y `RIGHTS_REVIEW_PENDING`.

## LÍMITE DEL GATE (NO INVENTAR AUTONOMÍA)
- La cola Cloudflare autentica las órdenes por cuenta API y solo acepta `READ_ONLY` del asset de laboratorio `met:436524`. No autoriza descarga masiva, búsqueda arbitraria ni publicación.
- La interfaz existente `CerebroConsoleShell` depende del Gateway canónico `cerebro-console-gateway-v0` en **Supabase PROD**. No se ha conectado ni modificado: hacerlo sería cambiar un sistema protegido sin los gates PROD.
- **HECHO:** FACT-001 puede llamar físicamente a UMS-001 en LAB.
- **PARCIAL:** CEREBRO Console real como interfaz visual para enviar estas órdenes. No confundir con esta conexión entre motores.

## ROLLBACK SEGURO
1. En FACT poner `UMS001_QUEUE_ENABLED=false`. Mantener `GATEWAY_ENABLED=false`.
2. Quitar el único consumer nuevo `54a8996624344930a34c07146cdeecea` si hace falta. No borrar pruebas ni contenido existente.
3. Restaurar versión FACT `16bb1a1a-e0a7-4fe8-b15c-8d249c28cfa4` solo tras revisar los consumidores/dependencias.
4. Verificar ningún cron adicional, 404/403 sin rutas públicas, tres assets Poly Haven y prueba histórica de Met. No tocar otros motores.

## SIGUIENTE PROMOCIÓN / CONSOLA
Auditar el contrato del Supabase Console PROD y preparar una ruta de interconexión server-side con credenciales guardadas en Vault, sin keys Cloudflare en navegador, con aislamiento de empresa, JWT, RBAC, observabilidad, rate limits, rollback y PREPROD equivalente.
