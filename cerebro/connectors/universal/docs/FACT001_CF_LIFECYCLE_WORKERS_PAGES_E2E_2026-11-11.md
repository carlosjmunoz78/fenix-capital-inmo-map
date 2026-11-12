# FACT-001 · Cloudflare Workers y Pages · Evidencia física LAB
Fecha: 11/11/2026. Estado: **CHATGPT OAuth LAB parcialmente VERIFICADO; CEREBRO headless independiente PARCIAL**.

## Inspección previa
Cloudflare cuenta e39a57e1ac42650ca5a6d5307cf0ac8e. GET inventario confirmó 13 Workers (incluidos servicios UMS001/JARVIS/redes/PROD) y 10/10 D1; cuenta Pages con un único proyecto preexistente fenix-capital-inmo-map. Por tener secretos y binding UMS001, se descartó tocar el Worker existente cerebro-fact001-gateway-lab-eu-20261109. No se creó ninguna D1 ni se alteró DNS, App, CRM ni gateways existentes.

## E2E real Worker de prueba totalmente aislado
Nombre exclusivo `cerebro-fact001-cf-lifecycle-e2e-lab-20261111`.
- Preflight nombre inexistente → **crear versión V1**. Version ID `6d2d8db2-9760-43e2-87d0-89002c9f5467`; verificado mediante API GET.
- Worker con `fetch=404`, sin funcionalidad de negocio, `workers.dev=false`, `previews_enabled=false`, `schedules=[]`, `bindings=[]`.
- **Actualización real V2** `44c69b4c-25f0-4dfb-ac54-83ad70bf078a`, comprobación GET deployment 100% V2, sin rutas ni conexiones.
- **Rollback físico** usando Cloudflare POST deployments a versión original `6d2d...` 100%; deployment de reversión `586b4db2-2543-40ce-b466-6e8e64f2dda2`, GET verificado; sin conexiones/rutas/crons.
- **DELETE** exacto de Worker creado por esta prueba; GET lista confirma ausencia y vuelta a **13 Workers**.
- **REBUILD** desde el mismo source V1 en el mismo nombre previamente liberado, versión nueva `69d5aa61-ba17-4501-a662-cb4e92623430`, configuración privada verificada; nuevo DELETE, GET confirma ausencia y **13 Workers** finales.

## E2E real Pages, alcance limitado al proyecto/ajustes
Nombre exclusivo `cerebro-fact001-pages-lifecycle-lab-20261111`.
- GET inventario previo: 1 proyecto de Pages existente.
- Creado proyecto sin source, sin deployment y rama ficticia `lab-inert-v1`.
- PATCH rama `lab-inert-v2`, GET confirma; PATCH vuelta `lab-inert-v1`, GET confirma; **rollback del ajuste** probado.
- DELETE condicionado a no tener deployment; GET final contiene únicamente el proyecto original `fenix-capital-inmo-map`.
- **NO** se ha probado publicación y rollback de un despliegue Pages; no declarar Pages deployment FULL.

## Limitación precisa para autonomía
Las operaciones de recurso de este bloque se hicieron mediante **Cloudflare OAuth del conector ChatGPT**, con orden expresa del propietario. Las credenciales headless de CEREBRO existentes no acreditan permisos equivalentes a Workers Scripts Write ni Pages Write; v2 solo tiene Account API Tokens Write. Por tanto, **NO** marcar `independent_service_identity` con capacidades universales de escritura y `autonomous_queue` como FULL.
La cola física firmada existente solo ejecuta `fact001.lab.heartbeat`, no modificaciones de Workers/Pages. Para cerrar Cloudflare FULL se requiere un ejecutor propio con credencial mínima y permisos verificables, cola de operaciones con allowlist, contratos, auditoría, costes, readback y rollback probado; acceso Console se conecta después y no bloquea el backend.

## Estado de salida
`WORKER_LAB_LIFECYCLE=VERIFIED_PHYSICAL`; `PAGES_PROJECT_SETTINGS_LIFECYCLE=VERIFIED_PHYSICAL`; `PAGES_DEPLOYMENT_ROLLBACK=PENDING`; `CEREBRO_HEADLESS_WORKER_PAGES_WRITE=PENDING`; `CLOUDFLARE_FULL=PARTIAL`.
`APP_CRM_DNS_MAIN_UNCHANGED=TRUE`, `RESOURCE_CLEANUP=PASS`, `NEW_D1=0`, `ADDITIONAL_SUBSCRIPTION_EUR=0`.
