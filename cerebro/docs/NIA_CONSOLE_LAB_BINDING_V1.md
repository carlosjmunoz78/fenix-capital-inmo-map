# CONSOLE-001 → FACT-001 → NIA · Paso 2 · LAB

## Alcance y procedencia
**CEREBRO Console V0** ya existe en `cerebro/console/gateway.mjs`, con `registerCommand` y sesiones PREPROD. No se altera este archivo. El adaptador añade el comando `notion.nia.discover.read` y publica en la **cola privada existente** `cerebro-fact001-nia-request-lab-eu` (consumida por el FACT-001 original), nunca llama a Notion ni al modelo directamente.

`cerebro/console/nia-console-command-binding-v1.mjs`: código canónico aditivo, validación estricta de company_id, environment, topic, payload, autenticación del host y auditSink. Devuelve `PRIVATE_QUEUE_ACCEPTED`, **NO declara que Notion ya ha contestado**; el recibo real se observa por separado en Cloudflare FACT/NIA.

`cerebro/console/nia-console-cloudflare-gateway-v1.mjs`: copia de la clase Console V0 de origen, únicamente con el registro JSON embebido en vez de importación `node:fs`, para ejecutar un ensayo físico en Cloudflare Workers sin mover App/CRM. No modificar la fuente original.

`cerebro/console/nia-console-worker-lab-v1.mjs`: adaptador aislado compatible con Cloudflare Service Binding RPC privado (`CerebroConsoleNiaLab.dispatchNiaCommand`); token de caller separado, queue producer privado, sin URL pública, cron ni scripts pagados. El handler de Queue de QA es efímero; la versión final queda SIN él.

## Requisitos de seguridad
- El propio Console V0 no proporciona identidad de usuario en los handlers de comando: **no confiar en `authorized` ni en el `company_id` de los clientes**. El host servidor debe verificar Supabase Auth/actor antes de entrar al puente, nunca desde navegador.
- No copiar ni reutilizar credenciales de App/Supabase. LAB usa su propio secreto de caller.
- El Worker no tiene ruta HTTP; cualquier petición devuelve 404. La prueba desde una cola temporal en LAB se limita a mensaje único y no concede a clientes acceso real.
- Nunca imprimir ni almacenar el valor del secreto, contenido Notion o datos privados. Audit logs sólo guardan estados.
- FACT conserva firma HMAC y NIA conserva su SQLite DO para antirrepetición.
- Para App real: `src/cerebroConsoleApi.ts` envía `/chat` al backend autenticado de CEREBRO Console; **ninguna modificación a App/CRM ni a ese Gateway de producción está autorizada en este paso**. Por lo tanto, el UI real seguirá PENDIENTE aun cuando el comando y puente LAB estén probados.

## Gates y rollback
- Snapshot FACT y NIA: comprobar ID de versión, ruta OFF, crons vacíos y consumidor original intacto antes y después.
- Unit (sin Actions): `node --test cerebro/tests/nia-console-command-binding-v1.test.mjs`.
- Cloudflare QA (sin Actions): activar sólo Worker CONSOLE-NIA LAB con queue test privada y producir una orden válida; verificar `CONSOLE_NIA_REAL_COMMAND=PASS`, `FACT_NIA_PRIVATE_RESULT=PASS` y `NIA_CENTRAL_RECEIVER_GATE=PASS`. Negativos de tenant, payload forged y no-caller no pueden publicar en FACT.
- Eliminar cola y consumidor de QA; restaurar Worker sin handler queue (RPC-only); comprobar servicio y binding; conservar pruebas y PR #70 DRAFT.
- Rollback: despliegue de versión inicial con `CONSOLE_NIA_ENABLED=false`, desconexión de productor CONSOLE LAB. Nada de revertir FACT/UMS originales para este puente.
- El uso nativo de Notion AI y conexión a la pantalla de producción quedan FUERA de estos gates.
