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
