# FACT-001 → CEREBRO Gateway → UMS-001 · E2E universal LAB · 2026-11-12

## Resultado verificado (HECHO)
Se ha ejecutado una prueba real y completa de un **motor nuevo** mediante componentes compartidos, sin Workers/colas específicos para dicho motor:

`FACT-MEDIA-CANARY-001` → alta HMAC firmada desde runtime FACT (diagnóstico privado de una sola ejecución) → `cerebro-fact001-ums001-issuer-provisioner-lab-eu` → clave Ed25519 privada cifrada con AES-GCM en Vault KV (namespace `ef5338650a474aff97b818c242adaef7`) → `cerebro-ums001-universal-gateway-lab-eu` → petición Ed25519 validada → atestación HMAC de despacho → Queue `cerebro-ums001-registered-image-lab-eu` → `cerebro-ums001-registered-image-executor-lab-eu` → Cloudflare FLUX.1 schnell → KV → Queue `cerebro-ums001-registered-image-results-lab-eu` → receptor compartido FACT verifica SHA256 y guarda ACK.

- Inscripción del motor: `FACT-ENROLL-CANARY-UMS001-20261112-001`, estado `ACTIVE`, firma `REGISTERED_QA_PENDING`.
- Generación: `UMS001-LAB-REGISTERED-IMAGE-20261112-01`, ítem `FACTIMAGE001`, **JPEG 1024×1024 de 757.264 bytes**, SHA-256 `cb57e416a2a1731ff832060f83578a59d5ba8b63a84def2c43aa3ef51e9fc6ee`.
- Fábrica `PRIVATE_READY`, `format_verified:true`, QA técnico PASS, `delivery_status:QUEUED`.
- ACK final `PRIVATE_ASSET_RECEIVED` almacenado bajo `meta/fact001-ums001-issuer/v1/deliveries/FACT-MEDIA-CANARY-001/UMS001-LAB-REGISTERED-IMAGE-20261112-01/FACTIMAGE001`; coincide el SHA-256 y tamaño.
- Resultado **privado**, sin publicaciones ni activación de Instagram/Facebook/WordPress/App.
- Negativo de alta: `FACT_EVENT_SIGNATURE_DENIED`, sin engine registrado.
- Negativo de petición directa: `REGISTERED_IMAGE_BAD_ATTESTATION` al enviar HMAC falso, sin llamada de modelo.
- Las DOS entradas temporales de diagnóstico que permitieron emitir altas/peticiones de prueba se **retiraron** de los Workers tras registrar evidencias; no quedan endpoints públicos para ellas.

## Runtime y recursos
- Gateway registrado existente: `cerebro-ums001-universal-gateway-lab-eu`, flags `UNIVERSAL_GATEWAY_ENABLED=true`, `FACT_ENROLL_ENABLED=true`, `REGISTERED_IMAGE_ENABLED=true`. Su `REGISTRATION_WINDOW_ENABLED=false` se conservó; no permite autorregistro público. Conserva `core.mjs` original.
- Provisionador compartido `cerebro-fact001-ums001-issuer-provisioner-lab-eu`: consume una sola cola de altas en EU `45f17e040bcb4c10a509f31b1460da49`, consumidor `1bb3034a77e845638d5e54aeab29882f`; consume también la única cola de resultados EU `cf35d9d865594db8ac5f9ea3f9dfb667`, consumidor `6c50a63c21db4603bc58615c7e2eca74`.
- Ejecutor de imágenes genérico `cerebro-ums001-registered-image-executor-lab-eu`: consume cola EU `2cff3625d19b4c90a48a7b6b01567bf5`, consumidor `6f3a349057e243518594ecd97e96e874`. Solicitudes solo vía Gateway firmado, atestación HMAC, ámbito Fénix/LAB, modelo FLUX a 4 pasos y output 1024×1024 con análisis de JPEG SOF.
- No crea un Worker por motor; el provisionador guarda individualmente un par de claves por motor dentro del mismo Vault.
- Secretos `SIGNED_JOB_DISPATCH_KEY`, `FACT_PRIVATE_MASTER_KEY`, `FACT_EVENT_SIGNING_KEY`, `FACT_ENROLL_TOKEN` se conservan solo en Cloudflare Worker Secrets. No añadir valores a repos ni chats.

## Bloqueos restantes (NO reclamar autonomía universal en PROD)
- La **prueba positiva de alta y media** fue emitida por un diagnóstico Cloudflare privado con identidad de motor de prueba; no fue generada por el **ejecutor Python/GitHub real** cuando creó el motor.
- El `factory.py` de `capital-mapa-pro` incorpora el hook `FACT001_ENGINE_CREATED` y outbox, pero necesita una conexión única con secretos del runtime: `CEREBRO_COMPANY_ID`/contexto firmado, `CEREBRO_FACT_ENROLL_EVENT_KEY`, `CEREBRO_CLOUDFLARE_API_TOKEN`, `CEREBRO_CLOUDFLARE_ACCOUNT_ID`, `CEREBRO_FACT_ENROLL_QUEUE_ID`. Esos secretos del proceso Python **NO están verificados ni instalados** en GitHub Actions; ausencia de tales datos genera `PENDING_FACTORY_IAM_TRANSPORT` sin habilitar medios.
- Solicitudes **reales** de todos los motores existentes siguen sin conectarse al SDK/control-plane; un motor debe usar una identidad firmada aceptada por el Gateway, no afirmar `origin_engine_id` por payload. El registro universal evita conexiones por motor pero el único emisor firmado general necesita integrarse en el runtime real de FACT/CEREBRO.
- La entrega compartida acaba en el inbox privado FACT, auditada; falta verificar que cada motor real recoge el resultado.
- Otros tenants fuera de `fenix` no habilitados, costes facturados y ROI sin verificar; QA visual, marca, derechos y formatos especiales pendientes. El presupuesto de neuronas en KV no es un límite transaccional global.
- No se ha fusionado main ni modificado PROD, App, CRM, DNS, WordPress, Buffer ni Trading.

## Rollback y trazabilidad
- Backup anterior del signed gateway: `universal-signed-gateway.baseline.worker.mjs` y `universal-signed-gateway.baseline.core.mjs`.
- Para frenar la vía universal, desactivar `REGISTERED_IMAGE_ENABLED` y `FACT_ENROLL_ENABLED` del Gateway, `ENABLED` en el ejecutor y `FACT_PROVISION_ENABLED` en provisionador, sin tocar otros componentes.
- No eliminar claves/col as a ciegas; comprobar previamente trabajos pendientes, backups, policy, costes y compatibilidad.
- PR DRAFT previsto: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/46.
