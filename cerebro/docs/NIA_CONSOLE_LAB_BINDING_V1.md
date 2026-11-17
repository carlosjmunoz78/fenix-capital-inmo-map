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

## Resultado físico final del Paso 2 · 17/11/2026

**HECHO EN LAB:** código canónico de `CerebroGatewayV0` (misma clase V0, con registro JSON embebido sin dependencia Node fs) registró y ejecutó `notion.nia.discover.read` a través de `bindConsoleNiaToFactQueueLabV1`. La orden llegó a la Queue privada original de FACT-001 y este Worker invocó NIA mediante el enlace firmado ya existente. **No se modificó App, CRM, Supabase, Gateway de producción, FACT ni NIA.**

**Prueba Cloudflare Workers Observability, 2026-11-17 ~10:22:34–10:22:40 UTC:**

| Prueba | Valor registrado | Estado |
|---|---|---|
| Comando real registrado en Console V0 y enviado al productor privado | `CONSOLE_NIA_REAL_COMMAND=PASS` | HECHO |
| Otra empresa denegada antes de la cola | `CONSOLE_NIA_TENANT_GATE=PASS` | HECHO |
| Campo de autorización falseado por cliente denegado | `CONSOLE_NIA_FORGED_FIELD_GATE=PASS` | HECHO |
| Llamada sin autenticación de host denegada | `CONSOLE_NIA_NO_CALLER_GATE=PASS` | HECHO |
| Token inválido denegado | `CONSOLE_NIA_TOKEN_GATE=PASS` | HECHO |
| FACT-001 consumió orden privada | `FACT_NIA_PRIVATE_RESULT=PASS` | HECHO |
| NIA validó el HMAC, nonce SQLite y leyó Notion con ACTGW | `NIA_CENTRAL_RECEIVER_GATE=PASS` | HECHO |

**COSTES/PROTECCIÓN:** sin GitHub Actions ni contratos/suscripciones nuevos. La cola QA EU `cerebro-console-nia-once-test-eu` y su consumidor se eliminaron después de PASS, y Cloudflare confirmó su ausencia. Se restauró el código **sin handler de queue QA**. El Worker `cerebro-console-nia-binding-lab-eu` conserva solo `CerebroConsoleNiaLab` para RPC privado, `CONSOLE_NIA_ENABLED=true`, `CONSOLE_NIA_TEST_ENABLED=false`, secreto `CONSOLE_NIA_CALLER_TOKEN` cifrado y productor `NIA_FACT_QUEUE`, sin URL HTTP ni preview ni crons. Versión `1fd9be3a-37ee-42cc-9ad5-e8b4ab82247a`.

**ROLLBACK FÍSICO:** se desplegó 100% versión OFF `c1e2ca27-c4ac-4838-b6d2-bc15a7efaeb0`, se verificó `CONSOLE_NIA_ENABLED=false`, y después se recuperó 100% la versión RPC `1fd9be3a-37ee-42cc-9ad5-e8b4ab82247a` con `CONSOLE_NIA_ENABLED=true`, test handler retirado y credencial preservada.

**Verificación de no interferencia:** FACT-001 sigue en `a7bfd49b-f0ee-448f-b7e2-75e5512feee8`, NIA en `dcdacd05-6ef8-45c2-9a04-580115add9cd`; consumidor Queue FACT existente sin cambios. App React (`src/CerebroConsoleHost.tsx`, `src/cerebroConsoleApi.ts`) y Gateway de Supabase real no tocados.

### BLOQUEADO / NO AFIRMAR QUE ESTÁ TERMINADO EN LA APP

- El **frontend real de CEREBRO Console** sigue usando el `/chat` del Gateway de Supabase PROD con sesión JWT. La integración de ese host con el nuevo RPC privado **requiere modificar un sistema protegido**, prohibido expresamente en este paso. No existe botón/chat NIA de la App acreditado.
- El nuevo RPC `CerebroConsoleNiaLab.dispatchNiaCommand` está desplegado pero **ningún consumidor real del frontend tiene todavía su caller identity**; la prueba física utilizó una Queue privada de QA y llamó al mismo núcleo del comando con el contexto de prueba autenticado. **No afirmar E2E RPC con host real ni invocación directa desde el navegador**.
- Auditoría de QA demostrada en Cloudflare Observability; traza persistente por actor/correlation_id desde UI, lectura de respuestas sincrónicas e idempotencia Console duradera **pendientes** antes de publicar interfaz.
- La IA nativa de Notion continúa sin invocación externa demostrada; se ha leído la Skill de NIA por API (metadatos y bloques, ensayo previo). La respuesta Console `PRIVATE_QUEUE_ACCEPTED` significa QUEUED, no tarea completada.
- Prueba `node --test cerebro/tests/nia-console-command-binding-v1.test.mjs` queda preparada pero no ejecutada aquí por falta de runner Node conectado; **no declararla PASS** por el E2E Cloudflare.

**Siguiente gate:** integración autorizada en backend servidor de Console `/chat` o un host LAB existente equivalente, con autenticación real y trazabilidad `actor_id`; comparar OLD vs NEW, contract tests, snapshots, rollback, cero nuevas suscripciones. No modificar App/CRM/PROD sin autorización de ámbito distinta.
