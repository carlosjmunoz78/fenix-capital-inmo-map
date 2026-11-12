# CEREBRO UMS-001 · Autonomía de encargos de imágenes · LAB V1

**Estados:** recepción automática en LAB **ACTIVA al escribir una orden válida en la rama**; planificación CEREBRO sin IA pagada; generación autónoma de pago **BLOQUEADA** hasta registrar presupuesto realmente prepagado y pruebas físicas end-to-end de QA/derechos. No modificar App/CRM/PROD, redes, Supabase, WordPress ni main.

## Recepción técnica real
Una nueva petición escrita bajo `requests/autonomous-inbox/*.json` en la rama aislada dispara un workflow `push`, sin mensajes manuales ni dependencias de Make, Notion Agents o suscripciones. Valida 22 campos exactos, empresa y entorno, una de las 11 piezas del briefing maestro, el motor consumidor original, el propietario creativo CEREBRO, formato y costes 0 € adicionales, 2 intentos máximos, proveedor permitido y prohibición estricta de recargas/publicación/vídeo. Guarda plan auditable, 11 prompts procedentes de la Fábrica existente y manifiesto en artefacto privado GitHub Actions. La fuente física es la rama LAB, no inventar que App/CRM recibe ya los archivos.

## Tribunal y entrega
`runtime/ums001_image_autonomous_intake_lab_v1.mjs` evalúa una pieza candidata con rubrica de 7 dimensiones, suma exacta, mínimo 88, sin violaciones, SHA del archivo físico, logotipo oficial verificado SHA, formato y titular canónicos, derechos de comercialización con prueba documentada y revisión editorial independiente. **Ni siquiera ese conjunto, por sí solo, habilita publicación**: solo admite propuesta de artefacto privado y requiere recibo de destino firmado. Un modelo que proclama 90/100 sin otras evidencias no pasa a entrega comercial.

Con 2/2 intentos rechazados, p.ej. `IG-STORY-01`, `HUMAN_REQUIRED(LOW_CONFIDENCE)` bloquea tercer intento; ningún bucle automático. `max_model_usd_per_attempt=0.03`, `max_qa_usd_per_attempt=0.02` como estimación con saldo prepagado; **no es certificación de saldo ni factura actual**.

## Evidencias reales y pendientes
- Imagen LinkedIn Seedream4 con postproducción auténtica y evaluación DeepSeek coherente 90/100; derechos/editorial aún no aprobados.
- Instagram Stories: dos pruebas 9:16 reales rechazadas, segunda score real 69 vs score comunicado 74. Prohibido nuevo intento automático.
- 9 predicciones físicas en 5 IDs; 6 IDs sin imagen generada.
- Sin ninguna pieza con derechos/editorial + entrega completa certificados; `IMAGE_GATE_GREEN=false`.
- No existe aún una conexión probada desde departamentos a LAB inbox ni flujo de generación/QA/postproducción/delivery por evento, ni saldo seguro para series sin coste adicional. **No declarar Productora autónoma para producción ni pasar a vídeo**.

## Próxima mejora tras este LAB V1
Conectar la entrada propia CEREBRO Gateway y Worker privado por token con cola transaccional (sin mover cargas pesadas a Supabase), hacer reserva única por cada POST de pago, verificar saldo con fuente de facturación, ejecutar generador compatible con cada ratio y un tribunal de dos evidencias independientes, publicar solo archivos de entrega privada al consumidor al recibir firmas criptográficas e integridad; exportar métricas y controlar retries. Probar real 11 formatos y promover por fases tras los gates. El sistema ya puede organizar encargos automáticamente en LAB sin nuevas llamadas de pago.

**Rollback:** revertir workflow+fuente+inbox nueva de PR45 DRAFT; no se cambió PR39, main ni ningún recurso existente.

## Integración LAB privada 2026-11-11 · V2 (conserva V1)

**HECHO (código + CI, NO servicio en producción):**
- Controlador de aceptación firmado `runtime/ums001_image_acceptance_controller_lab_v2.mjs`; rubric 88/100 con suma correcta; verifica SHA de bytes físicos, logo oficial, claims, derechos, cuatro firmantes independientes (VISUAL, FINISHER, RIGHTS, EDITORIAL) y acuse firmado de DESTINATION. Un certificado de un único LLM nunca basta.
- Nuevo registro transaccional SQLite `runtime/ums001_private_image_ledger_lab_v1.py` con `BEGIN IMMEDIATE`, WAL, concurrencia real, idempotencia por orden + predicción + destino, anti-reset por pieza y bloqueo ante POST incierto. No autoriza pagos, envíos a Replicate, publicaciones ni vídeo.
- Puente `runtime/ums001_private_order_bridge_lab_v1.mjs`: usa `planIntake` ORIGINAL de CEREBRO, registra solicitud en SQLite privado, incorpora solo imágenes existentes con SHA físico y Ed25519 del proveedor, exige HMAC del servicio interno para mutaciones, verifica el Tribunal existente con los archivos privados y solo registra confirmación privada cuando existe recibo independiente válido.
- Nunca guardar SQLite, journals, credenciales, claves, imágenes ni manifests sensibles en este repo **público**; `--db`, datos físicos y trust registry deben vivir fuera del checkout, en un runtime aislado y persistente. Un directorio temporal de GitHub Actions NO sirve como almacenamiento durable real.
- **Prueba real CI**: [43116064364](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43116064364), SUCCESS; **63/63 checks** (8 intake + 10 gate anterior + 16 aceptación firmada sintética + 20 SQLite + 9 bridge Node→SQLite), 0 fallos. Se detectaron y corrigieron en LAB dos defectos durante la primera ejecución: sombra de campos `status` y conflicto concurrente en inicialización WAL. No reescribir el baseline ni la PR #39.
- El test usa claves efímeras y pruebas sintéticas; no cuenta como evidencia de dos revisores reales ni firma real de proveedor. El uso comercial no está autorizado.

**PARCIAL y próximos gates físicos:**
1. Elegir el servicio de ejecución privado ya existente y su almacenamiento duradero (comprobar primero el repositorio privado de assets y Drive, pero NO moverlo ni duplicarlo por comodidad). Configurar secretos y firmantes con IAM/Vault y roles independientes. No introducir permisos públicos.
2. Conectar la cola real de CEREBRO Gateway a la entrada firmada, con idempotencia persistente; enlazar RESERVA FINOPS real y prueba de saldo prepago/auto-reload OFF antes de activar un solo `paidEnabled`. Actualmente `paidEnabled=false` en esta misión.
3. Sobre una imagen real existente con bytes accesibles: `provider proof → raw SHA → finisher SHA → visual QA → rights provenance → signed editorial → destination signed receipt → ledger`. Comparar OLD/NEW, comprobar 0 duplicados y restauración tras caída.
4. Completar física y visualmente 11/11 piezas en los seis formatos/canales y 1 campaña completa; no superar dos intentos sin intervención para piezas rechazadas. El historial V5 sigue siendo la base: 9 generaciones/5 IDs; 6 IDs sin generar; ningún derecho+editorial+entrega final certificado.
5. Restauración del ledger y almacenamiento, auditoría de claves/revocación, coste real y supervisión; solo entonces evaluar `IMAGE_GATE_GREEN`. Vídeo/caretas/publicación siguen OFF.

**HUMAN_REQUIRED:** únicamente las excepciones canónicas cuando exista evidencia concreta. Que falte un servicio privado real es **BLOQUEO TÉCNICO/PARCIAL**, no aprobación ficticia. Ningún contrato obliga a usar de forma pagada el modelo durante LAB.

**Rollback:** cierre de PR #45 DRAFT o reversión de commits LAB de esta integración. `main`, PR #39, App, CRM, WordPress, DNS, Cloudflare **preexistente**, SEO, publicaciones y vídeo no modificados. Se autorizan únicamente recursos Cloudflare **nuevos, aislados y gratuitos** descritos a continuación.

## Gate físico 12-11-2026 · Cola de imágenes SOMBRA (solo QA LAB)

**Motivo del envoltorio nuevo:** el Worker original `cerebro-ums001-producer-private-gateway-lab-eu` y su cola `cerebro-ums001-producer-demand-lab-eu` aceptan únicamente `METADATA_ONLY` para catálogos externos; no reciben pedidos de creatividades. **No cambiar su contrato ni sus bindings.**

**EXISTENTE / CONSERVADO:** Gateway, servicio Media, Source Scout, namespace `cerebro-ums001-polyhaven-assets-lab-eu`, cola de demanda previa, D1, App, CRM, PROD, MAIN, DNS. **HECHO: se han creado tres recursos totalmente nuevos e independientes en Cloudflare Free, jurisdicción UE:**
- Worker `cerebro-ums001-image-qa-shadow-lab-eu`, código reproducible en `cloudflare/ums001-image-qa-shadow-lab-eu/worker.mjs`. GET HTTP retorna exclusivamente 404, subdominio workers.dev OFF, previews OFF, cero rutas, cero cron, sin secretos de proveedores.
- Cola `cerebro-ums001-image-qa-shadow-lab-eu`, ID `74c48e70ebc24b00ab56aef6c74aac58`, un mensaje/lote, concurrencia uno, un reintento.
- Namespace KV dedicado `cerebro-ums001-image-qa-shadow-kv-lab-eu` (UE), ID `dc33879e8567422a8722eb47b398a15d`. **No usa la KV original de medios.**

**HECHO · E2E REAL DE TRANSPORTE DE METADATOS** (no certificación comercial): el operador autenticado de Cloudflare envió `UMS001-LAB-LI-FEED-01-ARCHIVE-20261112` con referencias a la imagen real ya archivada de LinkedIn (SHA imagen `5e65cfc30f9cdee5c8e9a93942d05e85a3f1e362d66fd623689525b8b7b2e170`). Cloudflare Queue entregó al Worker y el Worker persistió en su KV un único registro:
`meta/ums001-image-qa-shadow/v1/UMS001-LAB-LI-FEED-01-ARCHIVE-20261112`.
Readback por API autenticada: `QA_INBOX_RECEIVED_UNVERIFIED`, SHA coincidente, `cost_added_eur=0`, `commercial_delivery_allowed=false`, `publish_enabled=false`, `paid_execution_enabled=false`, `independent_qa_signatures_verified=false`, `source_asset_verified_by_this_worker=false`. Cola al final **0 mensajes pendientes**.

**Pruebas adversariales físicas:**
1. Evento malicioso separado con `publish_enabled=true`: la cola lo procesó, **NO creó registro** y terminó con 0 pendientes. No hubo publicación ni llamada de pago.
2. Reenvío de la orden válida con misma identidad y SHA: idempotencia física, permanece **un solo** registro, cola 0.
3. Rollback real de la conexión de este circuito: desconectado el consumidor nuevo, verificado 0 consumidores; reconectado con los ajustes originales y verificado nuevamente 1 consumidor. **No se ha probado rollback de las claves reales ni de una entrega comercial.**
4. Código previo a promoción superó **82/82 checks** (8 intake + 10 old gate + 16 firma/QA simulada + 20 SQLite + 13 puente + 15 shadow), [GitHub Actions 43119863247](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43119863247).

**MUY IMPORTANTE · LÍMITES DE ESTE RESULTADO:**
- El origen del mensaje fue la **API administrativa de Cloudflare**, todavía no CEREBRO Gateway. El destino es la **bandeja técnica QA de metadatos**, no el departamento comercial. El Worker no descargó el WEBP de Drive; conserva hashes y referencias que se contrastaron externamente. No existe acuse de destino firmado ni revisión jurídica/editorial real.
- Cloudflare KV es eventualmente consistente y no es la reserva FINOPS transaccional. **No** usar esta cola para generar nuevas imágenes de pago, hacer publicaciones, confirmar derechos, prometer exact-once comercial o activar vídeos.
- El registro E2E más detallado, con identificadores de Drive, vive en la rama privada `cerebro/ums001-image-private-receipt-lab-20261112` de `carlosjmunoz78/cerebro-assets-autonomous-lab`. Nunca copiar esos archivos al repo público.
- Coste: **sin suscripciones nuevas ni recargas**, uso acotado a las operaciones incluidas en Cloudflare Workers, Queues y KV Free. R2 no habilitado.

**Rollback operativo exacto:** primero dejar vacía la cola nueva, luego eliminar únicamente el consumer ID de esta cola o desconectarlo; deshabilitar `QA_ONLY_ENABLED` en el Worker nuevo para cortar ingestión, mantener evidencia KV/Drive y registros privados; si se elimina el Worker/Queue/KV nuevos hacerlo tras exportación y backup, sin tocar el Gateway ni colas originales. El consumer activo tras el test de rollback se identifica como `df703b5d6b4e460c99f9ef3761372202` (consultar ID fresco antes de mutar).

**Siguiente objetivo autorizado y pendiente:** crear el **adaptador emisor privado** de órdenes desde CEREBRO Gateway sin romper la cola preexistente; garantizar autenticación de origen, aislamiento tenant y protección antirreplay. Después adjuntar acceso a bytes reales y auditoría de licencias, firmas reales independientes, lectura por departamento y acuse firmado. Solo entonces `IMAGE_GATE_GREEN` podría pasar a evaluación (actualmente FALSE). Publicación/vídeo OFF.


## Gate físico · Emisor privado autenticado por cuenta Cloudflare y RPC CEREBRO · 12-11-2026

**HECHO — nueva implementación aditiva, no invasiva:** Worker `cerebro-ums001-image-auth-sender-lab-eu`, origen en `cloudflare/ums001-image-auth-sender-lab-eu/{core,worker}.mjs`, manifest FACT001 `cloudflare/ums001-image-auth-sender-lab-eu/engine.manifest.json`. Sin rutas públicas, workers.dev OFF, preview OFF, cron OFF, ni permisos de pagos/publicación/vídeo. El Worker **NO** reemplaza los Gateways, Workers o colas existentes.

**Contrato real de conexión:**
- Trigger: nueva Queue UE `cerebro-ums001-image-sender-command-lab-eu`, ID `eb196c69f0384170b10c8e9030e38b38`, limitada a un comando por lote, un consumidor, una concurrencia y un reintento. Ingreso en prueba mediante Cloudflare API **autenticada con la cuenta de operador**, NO mediante el orquestador automático de CEREBRO todavía.
- Emisor: Worker nuevo `cerebro-ums001-image-auth-sender-lab-eu`. Enlace RPC Cloudflare de tipo **service** `CEREBRO_PRODUCER` con `ProducerLibraryLab.latest` del Gateway existente `cerebro-ums001-producer-private-gateway-lab-eu`. RPC **read-only** `provider=met,kind=images,mode=METADATA_ONLY`; devuelve metadatos de catálogo, **no certifica firma/origen de una imagen ni pedido de negocio**. El contrato exige identidad fenix/UMS-001/LAB, coste 0 y flags comerciales OFF. Cualquier resultado incompatible detiene emisión.
- Archivo de muestra: información SHA/tamaño/referencias de los ZIP originales almacenada como **`PRIVATE_ARCHIVE_MANIFEST` de Cloudflare secret_text** en el Worker nuevo. El trigger no puede suministrar URL, claves, modelo, pago o atributos de aprobación; su comando consta de nueve campos exactos. Valores y secretos no guardados en GitHub público.
- Destino: binding queue-producer `QA_QUEUE` a **cola QA sombra preexistente** `cerebro-ums001-image-qa-shadow-lab-eu` (ID `74c48e70ebc24b00ab56aef6c74aac58`), que persiste su expediente en KV privada UE `dc33879e8567422a8722eb47b398a15d`.
- Evento válido físico: `UMS001-LAB-LI-FEED-01-ARCHIVE-20261113` (sufijo técnico distintivo, no fecha de generación) → RPC de CEREBRO satisfactoria → mensaje QA → KV clave `meta/ums001-image-qa-shadow/v1/UMS001-LAB-LI-FEED-01-ARCHIVE-20261113` con SHA WEBP `5e65cfc30f9cdee5c8e9a93942d05e85a3f1e362d66fd623689525b8b7b2e170`, status **`QA_INBOX_RECEIVED_UNVERIFIED`**. Lectura directa verificada; cola emisor y cola QA **0 pendientes**.
- Pruebas físicas adversariales: comando con `publish_enabled=true` fue rechazado sin crear expediente; repetición del mismo comando válido conservó **un único registro**. Rollback del consumidor de la nueva cola realizado físicamente: desconexión verificada con 0 consumidores → restauración con ajustes iguales; nuevo consumidor `4b88a00c458e48119ff82d2be9a45419`.
- Pruebas CI: [run 43122191058](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43122191058), **100/100** (82 previas +18 del emisor); todo local/sintético sin llamadas a IA ni servicios pagos. La prueba física posterior usa Cloudflare real.
- Evidencia sensible e identificadores de Drive en repo **privado** `carlosjmunoz78/cerebro-assets-autonomous-lab`, rama `cerebro/ums001-image-private-receipt-lab-20261112`, archivo `producer_lab/archive_receipts/UMS001_CEREBRO_RPC_AUTH_SENDER_E2E_20261112.json`.

**LÍMITE DE AUTENTICACIÓN (no confundir):** Cloudflare autentica al operador que publicó el comando en Queue y el RPC entre Workers está aislado por una **service binding interna**. El `actor_id` del comando es una declaración de texto, **no** una firma criptográfica independiente del orquestador. Por tanto el camino `CEREBRO Gateway → orden automática` aún **NO** es un hecho: se ha acreditado **`cuenta administrativa autenticada → emisor privado → consulta RPC real al Gateway existente → Queue QA → KV`**. No afirmar `IMAGE_GATE_GREEN` por ello.

**CONSERVADO:** Gateway UMS001 original con `modified_on` igual a `2026-11-10T22:16:45.925382Z`, FACT001 Gateway general desactivado, cola de catálogos, KV media, App, CRM, WordPress, SEO, MAIN y PROD. Solo se añadieron **un Worker** y **una Queue** de origen separado, sin pagos/suscripciones, más pruebas y documentación en PR #45 DRAFT. No hubo publicación, conversión en vídeo ni generación de imagen de pago.

**Rollback:** comprobar 0 pendientes; desconectar únicamente el consumidor de la Queue `cerebro-ums001-image-sender-command-lab-eu` (ID actual consultar antes), mantener el Worker y la evidencia de QA para auditoría; opcionalmente poner `SENDER_ENABLED=false` en Worker nuevo; jamás alterar los bindings o código del Gateway original para revertir este circuito. Rollback de consumidor **físicamente probado**, no se ha simulado un rollback comercial inexistente.

**SIGUIENTE BLOQUE SIN REPETIR:** el orquestador autorizado de CEREBRO debe originar un comando **firmado** por identidad privada (no imitable por actor_id) a esta Queue mediante binding y política específica, sin cambiar el comportamiento actual de FACT001 Gateway; después bytes reales descargados y verificados por QA y firmas independientes de derechos/editorial/finalizador/destino. Hasta entonces generación comercial autónoma y publicación/vídeo **OFF**; saldo pagado no utilizado.


## Gate firma real Ed25519 · 12-11-2026 · código validado, infraestructura INERTE por bloqueo de credencial

**Motivo:** el emisor anterior de la PR #45 tiene un *service binding* RPC real, pero el origen de la orden lo aportaba la cuenta administrativa de Cloudflare, no un orquestador autónomo criptográficamente autenticado. No se debe rebautizar un actor_id de texto como firma real.

**HECHO — implementación en paralelo / sin alterar contratos V1:**
- Fuente `cloudflare/ums001-signed-orchestrator-lab-eu/{core,worker}.mjs`: nueva tarea de CEREBRO LAB con evento de scheduler de Cloudflare, una sola orden de **metadatos de la imagen LinkedIn ya archivada**, firma Ed25519 con PKCS8 secreto, caducidad de 180 segundos, one-shot KV, sin llamadas pagadas.
- Receptor `cloudflare/ums001-signed-qa-receiver-lab-eu/{core,worker,sender-core}.mjs`: valida firmante por clave pública SPKI fijada fuera del pedido, issuer, scope fenix/UMS-001/LAB, campos exactos, expiración y nonce antirreplay; solo después consulta por RPC al Gateway original y envía a la Queue QA ya comprobada. Rechaza órdenes antiguas sin firma y aprobaciones/pagos/publicaciones introducidos por el remitente.
- Fuente GitHub **PR #45 DRAFT**; los contratos y artefactos antiguos siguen intactos.
- [GitHub Actions 43126372664](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43126372664): **128/128 tests VERDE, 0 fallos** (100 anteriores +28 firmas/cron/nonce/fallos).
- Cloudflare Free cuenta autorizada: se ha creado la nueva Queue EU `cerebro-ums001-image-signed-command-lab-eu` ID `39d92161f2ac429791bbcc3dfd25c6b8`, namespace KV EU de one-shot `cerebro-ums001-signed-once-lab-eu` ID `475ba0abb99640848b0bfacfb5431f70`, y namespace KV EU antirreplay `cerebro-ums001-signed-replay-lab-eu` ID `561e0d5ce2be437085144c16eae5f712`.
- Dos Workers **nuevos** desplegados: `cerebro-ums001-signed-orchestrator-lab-eu` (scheduler one-shot preparado) y `cerebro-ums001-signed-qa-receiver-lab-eu` (receptor firmado); `workers.dev=false`, previews OFF, rutas públicas ninguna, CRON=0. Se añadieron únicamente bindings a estas instancias nuevas: Queue nueva, KV privada nueva, RPC de consulta del Gateway viejo y salida a Queue QA existente. El receptor tiene `PRIVATE_ARCHIVE_MANIFEST` como secreto Cloudflare; **no se imprime ningún valor**.
- Recursos preexistentes, contratos, publicación, vídeos y App/CRM/PROD no modificados. Ninguna suscripción, inferencia pagada ni gasto adicional.

**BLOQUEADO — identidad criptográfica real:** al intentar aprovisionar un par Ed25519 aislado con clave privada solo en el nuevo Worker orquestador y clave pública fijada solo en el nuevo Worker receptor, el conector devolvió **denegación explícita por controles de seguridad de la plataforma**. No se intentó eludir. La lectura posterior confirmó **SIN** secret `ORCH_SIGNER_PRIVATE_PKCS8_BASE64`, **SIN** secret `ORCH_PUBLIC_SPKI_BASE64`, `cron=0`, `signed_queue_consumers=0`, `signed_queue_backlog=0`. **NO** se ha creado identidad real ni emitido mensajes firmados. No habilitar cron/consumer hasta que el aprovisionamiento sea permitido por el flujo administrativo seguro y se verifiquen ambos secretos sin leer sus valores.

**Procedimiento habilitación posterior autorizado y trazable (NO EJECUTADO):**
1. Provisión segura administrada de identidad Ed25519 con clave PKCS8 cifrada `ORCH_SIGNER_PRIVATE_PKCS8_BASE64` solo en Worker orquestador; SPKI pública `ORCH_PUBLIC_SPKI_BASE64` como binding confiable solo en receptor; verificar fingerprint fuera del pedido. La clave privada nunca debe ir a GitHub, logs, chat ni artefactos.
2. Comprobar get/list secrets solo por *nombre*, no por valor. Conservar políticas que impiden modificar los Workers/Gateway originales.
3. Asociar un consumidor único a la cola firmada; realizar pruebas adversariales físicas con un comando SIN FIRMA y con key-id incorrecto (deben rechazarse sin emitir QA), antes de activar cualquier tarea.
4. Activar `* * * * *` **solo** para un canario LAB dentro de la ventana autorizada, revisar el registro `meta/ums001-signed-once/v1/fenix/UMS-001/LAB/LI-FEED-01`, la entrada antirreplay y el nuevo recibo QA. Cron debe volver a lista vacía al terminar; no abrir superficie pública.
5. Confirmar fin a fin que un evento de scheduler real de un Worker aislado de CEREBRO emitió y firmó la orden, sin uso de la cuenta administrativa para dispararla. No llamar “orquestador FACT-001 original” a este Worker independiente.
6. Solo entonces evaluar transición de `SIGNED_SOURCE_PROOF` a VERDE. **`IMAGE_GATE_GREEN=false`** hasta lectura real de bytes, derechos/editorial, firmas del destinatario, FINOPS y pruebas de promoción.

**Estado final exacto:** `ED25519_CODE_TESTS=GREEN`, `SIGNED_WORKERS_DEPLOYED=INERT`, `REAL_SIGNED_ORIGIN_E2E=BLOCKED_BY_SECURITY_CONTROL`, `ORCHESTRATOR_CRON=OFF`, `SIGNATURE_QUEUE_CONSUMER=OFF`, `COMMERCIAL_IMAGE_DELIVERY=OFF`, `PAID_IMAGE_GENERATION=OFF`.

**Rollback:** sin cron, sin consumidor y sin claves, ambos nuevos Workers son inertes. La reversión aislada consiste en mantener esos dos interruptores OFF y preservar registros de QA/Drive/CI; no eliminar nada sin backup ni tocar Gateway original. No hay rollback de firmante real que afirmar, ya que nunca se aprovisionó.

