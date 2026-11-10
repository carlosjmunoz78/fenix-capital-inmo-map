# FACT-001 → UMS-001 · Actualización 10-11-2026

**HECHO:**
- Worker general existente `cerebro-fact001-gateway-lab-eu-20261109` incorpora el Service Binding privado `UMS_PRODUCER`, dirigido al Worker UMS-001 existente y su entrada `ProducerLibraryLab`.
- El método privado `CEREBROFactUMS001Lab.route` reutiliza el adaptador canónico `routeMediaProductionResource`.
- La credencial `UMS001_CALLER_TOKEN` se creó y almacenó como secreto cifrado de Cloudflare, sin exponer su valor.
- `UMS001_PRIVATE_BINDING_ENABLED=true` habilita exclusivamente esta función. Los controles anteriores `GATEWAY_ENABLED=false`, `ALLOW_MUTATIONS=false`, `CLOUDFLARE_API_ENABLED=false` continúan desactivados.
- 15/15 tests locales correctos: búsqueda de metadatos, lectura SHA-256, selección única, rechazo de token incorrecto, otro entorno, otra empresa, publicación y gasto.
- No se creó Worker adicional, base nueva, dominio, ruta pública ni plan de pago.
- Worker limpio final: `16bb1a1a-e0a7-4fe8-b15c-8d249c28cfa4`.
- Una ejecución temporal de cron fue programada, pero **no produjo recibo físico** antes de retirarla. Cron temporal, código de prueba y acceso temporal a KV eliminados.

**PARCIAL:** El enlace existe en Cloudflare y los tests locales pasan, pero **no está físicamente acreditada una llamada real iniciada por FACT-001 hacia UMS-001**. La descarga física E2E anterior de `met:436524` pertenece al Producer Gateway, no a FACT-001.

**NO CONECTADO:** La Console de usuario y Supervisor PROD no tienen un caller autenticado y probado hacia este nuevo RPC; ningún componente de PROD fue modificado.

**PRÓXIMA VERIFICACIÓN:** Una prueba de invocación privada desde un caller LAB autorizado hacia `CEREBROFactUMS001Lab.route` con credencial ya provisionada, sin cambiar la función principal, antes de marcar el gate como VERDE.

**ROLLBACK:** Poner `UMS001_PRIVATE_BINDING_ENABLED=false`. Si se detectan regresiones, recuperar la versión original FACT Gateway `7c6dc6f0-0584-4939-a8a1-e86ad320a8ef` tras inventario de dependencias. No eliminar activos UMS ni tocar App/CRM/PROD.
