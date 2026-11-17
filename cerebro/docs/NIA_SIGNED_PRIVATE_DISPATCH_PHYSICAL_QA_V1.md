# NIA · Prueba física de firma de despacho privado LAB

Este artefacto es **exclusivamente para un test efímero**. Se crea un Worker de Cloudflare sin URL/cron ni secretos de producción, con una clave sintética que NO debe utilizarse fuera de QA.
El Worker carga los módulos reales `nia-private-dispatch-v1.mjs`, `action-gateway-v1.mjs`, `nia-action-gateway-binding-v0.mjs` y recibe un solo mensaje privado en una cola EU efímera. Observability únicamente registra PASS/FAIL.

Tras ejecución: borrar cola, consumidor y Worker entero, confirmar desaparición. Prohibido fusionar o activar como Gateway central con esta clave. La firma real y el almacén antirrepetición atómico aún no están provisionados para el emisor central.
