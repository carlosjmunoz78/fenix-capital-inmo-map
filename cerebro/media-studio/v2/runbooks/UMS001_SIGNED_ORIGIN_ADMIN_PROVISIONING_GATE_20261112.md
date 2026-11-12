# UMS-001 · Gate administrativo de identidad Ed25519 LAB · 2026-11-12

**ESTADO FÍSICO VERIFICADO:** ambos Workers LAB exclusivos desplegados sin rutas públicas; el emisor `cerebro-ums001-signed-orchestrator-lab-eu` no tiene cron ni `ORCH_SIGNER_PRIVATE_PKCS8_BASE64`; el receptor `cerebro-ums001-signed-qa-receiver-lab-eu` no tiene consumidor ni `ORCH_PUBLIC_SPKI_BASE64`. La cola firmada permanece vacía. No hay órdenes reales firmadas ni generaciones pagadas. La conexión antigua por RPC y cola QA continúa conservada.

**ESTADO DEL CÓDIGO:** candidato endurecido en PR #45 DRAFT, CI [43166594450](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43166594450) **133/133 tests verdes**. Los dos Workers Cloudflare aún ejecutan el código anterior, inerte, no el candidato endurecido. **NO activar secretos, consumidor ni cron antes de desplegar el candidato endurecido y comparar los bindings existentes.**

## 1. Bloqueo que requiere administración autorizada

El intento de crear/aprovisionar directamente una identidad privada Ed25519 desde el conector se detuvo mediante un control de seguridad de OpenAI. No se reintenta por un conector alternativo ni se pide pegar ninguna clave en el chat.

El administrador autorizado puede usar el flujo oficial de Cloudflare **Workers & Pages → Worker → Settings → Variables and Secrets → Add → Secret → Deploy**. Fuente oficial: https://developers.cloudflare.com/workers/configuration/secrets/.

**Exactamente estos valores, generados y manejados FUERA del chat con procedimiento de secretos aprobado:**

| Worker nuevo, único destinatario | Nombre de variable | Tipo / contenido | Estado |
|---|---|---|---|
| `cerebro-ums001-signed-orchestrator-lab-eu` | `ORCH_SIGNER_PRIVATE_PKCS8_BASE64` | **Secret**: clave privada Ed25519 PKCS8 en base64 | NO INSTALADA |
| `cerebro-ums001-signed-qa-receiver-lab-eu` | `ORCH_PUBLIC_SPKI_BASE64` | **Secret**: clave pública correspondiente Ed25519 SPKI en base64 | NO INSTALADA |
| `cerebro-ums001-signed-qa-receiver-lab-eu` | `ORCH_PUBLIC_SPKI_SHA256` | **Variable ordinaria**: SHA-256 hexadecimal de los bytes SPKI, calculado y fijado de forma independiente | NO INSTALADA |

**Nunca** guardar claves privadas, contenido de secretos, contraseñas, tokens, archivos PKCS8, PEM o volcados de consola en el repositorio, Notion, Google Drive abierto, chat, incidencias ni logs. El hash público puede registrarse sin revelar la clave. Requiere verificación de que privada, pública y fingerprint forman un mismo par y que el operador controla la cuenta propietaria. Nada debe instalarse en Gateway histórico, App, CRM o PROD.

## 2. Gate de código y bindings antes de activar cualquier trabajo

1. Anotar los scripts desplegados y backup de configuración/bindings de ambos Workers; verificar `workers_dev=false`, `preview_urls=false`, cron [] y consumidor [].
2. Publicar SOLO los dos Workers LAB nuevos con el contenido endurecido de PR #45, sin tocar sus bindings previos: `cerebro/media-studio/v2/cloudflare/ums001-signed-orchestrator-lab-eu/{core,worker}.mjs` y `cerebro/media-studio/v2/cloudflare/ums001-signed-qa-receiver-lab-eu/{core,worker,sender-core}.mjs`. Verificar que el receptor sigue usando solamente `CEREBRO_PRODUCER` y `QA_QUEUE`, y que la clave pública y su SHA estén correctamente configurados antes de pruebas.
3. Ejecutar de nuevo 133+ tests y prueba de rechazo: orden vieja SIN firma, firma con otra clave, fingerprint incompatible, otro `order_id`, `publish_enabled=true` y firma caducada; todas deben rechazarse sin llegada a QA.
4. Confirmar que el key-id es `UMS001-LAB-ORCH-ED25519-20261112-V1` y la pareja solo da permiso a `fenix` / `UMS-001` / `LAB`, única orden `UMS001-LAB-LI-FEED-01-ARCHIVE-20261116` y request `UMS001-SENDER-REQ-AUTOSIGNED20261112`.
5. La ventana del código actual cierra `2026-11-13T00:00:00Z`; si la provisión se hace después o hay retraso, **no cambiar el reloj**: editar una ventana de canario FUTURA y explícita en la rama de pruebas, volver a validar y desplegar de forma paralela antes de habilitar un cron.
6. Activar consumidor firmado con batch=1, concurrencia=1, máximo un retry. SOLO tras lo anterior activar cron del Worker orquestador exclusivamente durante la ventana autorizada de un único canario. Desconectar cron tras comprobar recepción y dos queues backlog=0. Verificar el registro de one-shot y el anti-replay en KVs privadas.
7. Guardar evidencia en repo PRIVADO y conservar marcado `QA_INBOX_RECEIVED_UNVERIFIED`. NO aprobar derechos, editorial ni entrega comercial; sin estas firmas `IMAGE_GATE_GREEN=false`. El uso de Workers KV es eventualmente consistente y **NO** sustituye idempotencia transaccional ni un ledger financiero.

## 3. Rollback real y costes

**Abort seguro ya existente:** cron=0, consumidor=0, sin claves. Estado **INERTE**. Si falla cualquier paso, no añadir cron/consumer, mantener historial y revisar las vinculaciones exclusivas.

**Rollback posterior (NO probado en este gate):** dejar vacía la cola firmada; retirar exclusivamente el consumidor de esa cola; eliminar solo su cron; desactivar los nuevos Workers, no tocar Gateways/colas antiguas, verificar la recepción QA y guardar snapshot. La revocación/rotación de claves debe ejecutarla el operador autorizado.

**Coste autorizado:** adicional 0 €; Cloudflare Workers, Queues, KV Free dentro de límites; sin IA de pago, sin crons heredados ni activaciones de billing.

**Nota de autoridad:** el disparo anterior autenticado por cuenta Cloudflare NO prueba identidad de CEREBRO; el objetivo pendiente es `Native Scheduler (Worker LAB) → firma privada Ed25519 → verificador con fingerprint independiente → RPC de Gateway → QA Queue → KV`. No declarar físicamente VERDE sin un mensaje genuino y su readback.


## Extensión general IMÁGENES + VÍDEOS · identidad compartida (12/11/2026)

**HECHO EN CÓDIGO / NO INSTALADO EN WORKERS:** se ha añadido `cerebro/media-studio/v2/security/media-command-signature-v1.mjs` como contrato común **Ed25519 CEREBRO MEDIA** para ambos tipos de trabajo. El par de claves **se instala una sola vez**, y el verificador usa `key_id=CEREBRO-UMS001-MEDIA-ED25519-V1`, empresa, entorno, motor, versión, fecha, nonce, medio, capacidad, order_id, request_id y fingerprint SPKI. Pruebas en `tests/media-command-signature-v1.test.mjs`.

**Dos permisos, una sola identidad:** `media.image.qa.metadata` para imágenes; `media.video.qa.metadata` para vídeos. Son **contratos de autentificación de orden y revisión**, NO conceden `generate`, `pay`, `publish`, `deliver` ni `rights_approved`. El receptor debe aplicar lista de capacidades y order_id permitidos; firma válida sola **no** autoriza trabajo.

**Importante:** el nuevo `KEY_ID` define un **contrato futuro compartido**; NO sustituye a la identidad LAB de imagen que aún no está provisionada, ni se añade un secreto inexistente. Los Workers actuales siguen **INERTES** y el permiso de vídeo **no está operativo**. Antes de consumir vídeos se debe conectar el contrato común al runtime aislado de vídeos, con sus propios tests/evaluación/política, e integrar el almacenamiento antirreplay transaccional o limitarse a pruebas idempotentes sin gasto.

**Instalación única posterior:** el administrador autorizado provisiona un único PKCS8 privado en CEREBRO Media Orchestrator; fija su SPKI público y huella SHA-256 independientemente en receptores de imagen y vídeo. Los receptores reciben permisos de medios separados. No hay que generar un par nuevo por vídeo. El procedimiento administrativo Cloudflare y bloqueo vigente están explicados arriba; está prohibido pegar claves en el chat o evitar las restricciones del conector.

**Gate físico pendiente:** generar e instalar la identidad por flujo autorizado, desplegar un Worker orquestador que use el contrato compartido, probar firma de una orden de imagen y de una orden de vídeo sintética; comprobar prohibición cruzada, caducidad y rollback sin publicación ni gasto. Solo entonces registrar `MEDIA_SIGNING_IMAGE_VIDEO_OPERATIONAL=true`.
