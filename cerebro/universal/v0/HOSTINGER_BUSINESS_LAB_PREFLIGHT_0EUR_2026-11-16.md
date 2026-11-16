# CEREBRO · Hostinger Business · Piloto aislado a 0 € adicionales

Fecha: 2026-11-16. Empresa Fénix. Entorno LAB. **No equivale a lanzamiento OPERATIVA PROD**.

## Evidencia existente y verificación
- Business Web Hosting anual renovado marzo de 2026. Hosting ya pagado; no se autorizan compras, upgrades ni VPS.
- WordPress real responde con PHP 8.5.12, MariaDB 11.8.9 y WP 7.1.4 mediante lectura; no demuestra acceso hPanel ni recursos libres.
- Hostinger anuncia apps Node.js 22 y 24 en Business, máximo 5 apps por plan (sujeto a versión); upload ZIP, dominio temporal disponible, crons de hasta 30 min, sin workers siempre activos. Fuentes oficiales:
  - https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
  - https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/
  - https://www.hostinger.com/support/how-to-run-cron-jobs-for-node-js-websites-at-hostinger/
  - https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans-in-hostinger/

## Artefacto preparado y probado
- Paquete `CEREBRO_HOSTINGER_LAB_PREFLIGHT_0EUR.zip`, **4.297 bytes**.
- SHA256 `b3ac9552058e75a21d6f33b4655dda096c914cd1ca15d1ae4a787a02ce2bd66f`.
- Contiene `package.json`, `server.mjs`, `test/server.test.mjs`, `LEEME_HOSTINGER.txt` (en raíz del ZIP).
- Node v22 local: `node --check` PASS y `node --test` **4 PASS, 0 FAIL**; rutas de ejecución, archivos privados y POST rechazados; no hay dependencias ni API externa.
- Solo endpoint público de prueba `/healthz` con `status=READY`, `environment=LAB`, `operation=READ_ONLY_PREFLIGHT`, `owner_auth_test=NOT_RUN`, `prod_execution=DISABLED`. No credenciales, no usuarios ni conexiones.

## Paso de cuenta necesario
Abrir https://hpanel.hostinger.com y comprobar en Sitios web → plan Business → recursos:
1. Número de aplicaciones Node existentes; una plaza libre sin cargo.
2. CPU y RAM disponibles, ausencia de facturación añadida.
3. Crear solo sitio Web App temporal si es gratuito y sin tocar la web existente.
4. Seleccionar Subir archivos → ZIP, Node 22 o 24, framework Other, build None, entry server.mjs, npm start; **NO introducir variables** ni programar cron.
5. Visitar URL temporal `/healthz`; auditar WordPress y consumo; registrar URL y rollback antes de proceder.

**Conector hPanel:** No disponible. Hostinger Mail accede a correo, no a recursos del hosting. Dos Opera no respondieron. No se ha ejecutado instalación remota.

## Gates y rollback
Hostinger desplegado: POR AUDITAR. Runner Auth LAB sin Actions: preparado en PR #66, sin ejecutarse live.
P0-A logout/revocación real: BLOQUEADO; P0-B provider receipt: PARCIAL; P0-C...H pendientes. OPERATIVA PROD: HOLD.
Rollback del piloto: desactivar/eliminar **solo** Web App temporal sin tocar WordPress, DNS, App, CRM ni planes.
Coste de suscripción nueva: **0 €**. Consumo real incremental: NO_MEDIDO.


## 17. Hostinger Node piloto · DNS de subdominio individual creado en Cloudflare · 16/11/2026

**AUTORIZACIÓN/PROCEDENCIA:** usuario siguió hPanel, subió el ZIP aislado y mostró pantalla de app `cerebro-lab.fenixcapital.es` en Business Web Hosting, Node 22.x, `server.mjs`, `npm`, ninguna variable de entorno; después aportó panel `Detalles del plan` con **IP 92.113.19.11**, Frankfurt, 3072 MB RAM y 2 CPU de hosting. El usuario pidió conexión y permitió revisar los recursos. El panel indica nameservers Cloudflare `harlee.ns.cloudflare.com`, `rene.ns.cloudflare.com`; **NO deben cambiarse**, independientemente de la recomendación de Hostinger. La pantalla de aplicación mostraba `Dominio conectado`, pero esta es una etiqueta de hPanel, no prueba DNS pública ni HTTP.

**INVENTARIO DNS ANTES:** consulta Cloudflare API a cuenta `e39a57e1ac42650ca5a6d5307cf0ac8e`, zona activa `fenixcapital.es` id `a00ec81375b4acb02f9bd6e0fd64942f`: `cerebro-lab.fenixcapital.es` sin registros DNS; wildcard `*.fenixcapital.es` sin A/CNAME. Apex `fenixcapital.es` A **92.113.19.11** ya existente (proxied=true, NO alterado). `app.fenixcapital.es` CNAME `cname.vercel-dns.com` (NO alterado). El dominio mostró `DNS_PROBE_FINISHED_NXDOMAIN` antes del cambio.

**HECHO FÍSICO EN CLOUDFLARE (ÚNICA MUTACIÓN):** se creó exclusivamente el DNS `A cerebro-lab.fenixcapital.es → 92.113.19.11`, `proxied=false` (DNS-only, adecuado para permitir a Hostinger gestionar SSL de la app), TTL=300 s. **ID real del recurso nuevo `91942f6c1a703382f7c93ed969b09093`**. Relectura Cloudflare API posterior confirmó exactamente un registro A coincidente. Sin cambios de nameservers, apex, `www`, `app`, `staging`, MX, Mail, CRM, App, WordPress ni otros registros. Sin suscripción nueva.

**VERIFICACIÓN DISTINTA:** éxito confirmado de escritura/lectura Cloudflare API. La prueba inmediata de resolución pública desde un contenedor auxiliar no resolvió aún y el navegador web tampoco pudo abrir `/healthz`; puede haber propagación o caché NXDOMAIN, y acceso externo de esa herramienta limitado. **NO afirmar que HTTPS, certificado SSL, app Node o endpoint READY funcionen aún.** No cambiar DNS over HTTPS de Opera como solución principal. Verificación pendiente: respuesta pública HTTPS `https://cerebro-lab.fenixcapital.es/healthz` con `status=READY`, sin redirección a WordPress; comprobar despliegues Hostinger/SSL si no responde y que WordPress original sigue normal.

**ROLLBACK ACOTADO Y SEGURO:** si se comprueba error, eliminar únicamente Cloudflare DNS record ID `91942f6c1a703382f7c93ed969b09093` de la zona indicada, tras verificar que sigue teniendo nombre/tipo/valor originales; NO `DELETE` de ningún registro antiguo ni del apex. Hostinger app piloto puede retirarse por separado solo ante decisión; NO es necesario tocar WordPress ni comprar servicios.

**ESTADOS:** `HOSTINGER_PILOT_ZIP_UPLOADED=USER_EVIDENCE`; `HOSTINGER_PLAN_RESOURCES=USER_SCREENSHOT`; `CF_DNS_LAB_A=HECHO_API_READBACK`; `PUBLIC_DNS_RESOLUTION=NO_VERIFICADO`; `HTTPS_HEALTHZ=NO_VERIFICADO`; `P0A_LIVE_AUTH_E2E=BLOCKED`; `OPERATIVA_PROD=HOLD`. Esta es una **app de diagnóstico LAB**, no un motor conectado ni la interfaz OPERATIVA. Coste adicional contratado 0 € en esta operación; coste real de recursos NO_MEDIDO.
