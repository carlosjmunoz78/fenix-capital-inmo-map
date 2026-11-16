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


## V2 · 503 · Corrección preventiva de arranque después de 503 · 16/11/2026

**EVIDENCIA USUARIO:** en `cerebro-lab.fenixcapital.es`, la vista Hostinger → Despliegues mostró `CEREBRO_HOSTINGER_LAB_PREFLIGHT_0EUR.zip`, `Se ha completado`, `Actual`, fecha local `2026-11-16 13:48:57`. Al abrir el host, usuario reportó HTTP **503 Service Unavailable**. Por tanto, **build/deploy figura SUCCESS, runtime HTTP=FAILED**; no inferir `READY`.

**FALLO DE CÓDIGO REPRODUCIDO EN LOCAL:** ZIP original contenía `resolve(process.argv[1]) === fileURLToPath(import.meta.url)` para decidir si arrancar `app.listen`. Cuando Node.js inicia un archivo vía ruta simbólica `hbuilds/current/nodejs/server.mjs`, `process.argv[1]` puede conservar la ruta simbólica pero `import.meta.url` resolver al archivo físico, dando falso y finalizando el proceso sin escuchar, compatible con un HTTP 503. Reproducción exacta en Node v22 del original: al lanzar desde fuera del cwd usando symlink, stdout de arranque VACÍO y proceso termina sin escuchar. **HIPÓTESIS FUERTE, NO CAUSA 503 CONFIRMADA EN HOSTINGER SIN SUS LOGS.**

**CORRECCIÓN V2 SIN ACTIONS:** se preparó ZIP `CEREBRO_HOSTINGER_LAB_PREFLIGHT_0EUR_V2.zip`, 5.593 bytes, SHA-256 `8484198830c537970df17b821f8de4ee2737fed4cb2863b6666823c00cbe594f`. Se reemplazó comparación del entry por `realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))`; scripts, rutas públicas, restricciones, ausencia de secretos y dependencias conservados. Incluye prueba adicional que lanza el archivo entry por symlink y exige HTTP 200 + `READY`. Ejecución local **Node 22 `node --check` PASS, `node --test` 5/5 PASS**; ZIP integrity PASS y archivos en raíz. El artefacto binario se generó y enlazó en conversación, NO está subido al servidor aún.

**PASO HOSTINGER USUARIO:** en la misma Web App → `Despliegues` → `Redistribuir` → `Archivos de origen` → **`Subir nuevos archivos`** (NO `Usar archivos anteriores`) → ZIP V2 → conservar Node 22.x, npm, compilación ninguna, directorio salida vacío, entrada `server.mjs`, variables de entorno ninguna, sin costes → `Redistribuir`. No crear otra web ni alterar DNS. Documentación Hostinger: https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/.

**VERIFICAR:** tras redeploy comprobar `https://cerebro-lab.fenixcapital.es/healthz` devuelve `status=READY`. Si aún 503, ir a `Registros de tiempo de ejecución`, revisar las entradas del último despliegue y `domains/cerebro-lab.fenixcapital.es/hbuilds/current/nodejs/stderr.log` por File Manager. No dar por cierta esta causa mientras no haya logs reales. Hostinger indica que HTTP 503 también puede señalar límite compartido de procesos o memoria: **NUNCA pulsar `Detener procesos en ejecución` global**, pues afectaría a WordPress del mismo Business.

**GATES:** `DNS_A_LAB=HECHO`; `LOCAL_V2_5/5=HECHO`; `HOSTINGER_V2_DEPLOYED=NO`; `HTTPS_READY=NO_VERIFICADO`; `OPERATIVA_PROD=HOLD`. Coste nueva suscripción 0 €; consumo NO_MEDIDO. Rollback V2 si fallara: `Redistribuir` usando ZIP anterior en **esta app aislada exclusivamente**; no borrar DNS/web principal ni registros antiguos. El viejo ZIP puede reproducir el fallo; rollback es de artefacto, no una solución del runtime.
