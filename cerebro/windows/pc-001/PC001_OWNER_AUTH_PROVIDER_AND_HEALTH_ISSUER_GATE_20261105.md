# CEREBRO OS · PC-001 · Autenticación real de propietario y emisor de salud V0

**Fecha:** 2026-11-05 · **Ámbito:** fenix/PREPROD/PC-001 · **Estado:** CODE_CI_GREEN / BACKEND_NOT_BOUND / PHYSICAL_REMOTE_PENDING.

## Evidencia viva verificada
- Edge Function PREPROD existente **cerebro-owner-decision-gateway-v0**, versión 1, `verify_jwt=true`: obtiene sesión mediante `auth.getUser(token)`, resuelve el actor en el servidor mediante `preprod_test_actor_context_by_auth_server` y valida `actor_code=CARLOS-ADMIN`, `role=Direccion`, `active=true`.
- Esta función **no emite órdenes al dispositivo**: solo registra `OWNER_DECISION` en `cerebro_action_requests_preprod`. Su autenticación puede ser reutilizada por un adaptador de confianza sin cambiar la ruta actual.
- Edge Function existente **cerebro-device-gateway-preprod**, versión 9: enrolled agent, reconnect, poll, result. No se ha modificado ni se ha habilitado ninguna nueva orden.
- Tabla `cerebro_device_commands_preprod`: tiene `PRIMARY KEY(command_id)` y `UNIQUE(company_id, environment, device_id, idempotency_key)`; no se requiere otra tabla/índice para el ensayo de salud.
- Cliente real `PC001-Gateway-PREPROD.ps1` dentro del paquete de continuidad registrado: acepta exactamente `SERVICE_HEALTH/READ_HEALTH`, política `pc001-readonly-preprod-v1`, y no ejecuta operaciones genéricas de Windows. Worker periódico con intervalo normal de 180 s.
- Emisor candidato `cerebro/windows/pc-001/issuer-v0/pc001-owner-issuer-v0.mjs`: biblioteca sin red, sin secretos y sin SQL; usa `evaluateOwnerAuthorization` y `validateUniversalDeviceEnvelopeV2`. Vigencia 8 minutos para cubrir el polling; alcance exacto `fenix/PREPROD/PC-001`.
- **GitHub CI real** [42003062430](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42003062430): **43 pruebas PASS, cero FAIL**, incluyendo los tests canónicos del propietario y del V2. Ensayo local con shims: 25 PASS; ese resultado NO sustituye el CI real.

## Integración pendiente: solo la pieza que falta
1. Dentro de un endpoint servidor de CEREBRO Console **PREPROD** existente o canary independiente, reutilizar la validación de sesión y actor del Gateway de decisiones, sin poner `service_role` en el frontend ni en el PC.
2. Leer del backend de comunicaciones una autorización `ONE_SHOT` o `ALL_SIMILAR` **exactamente vinculada** a dispositivo, capacidad, política, versión y medio de ejecución. La instrucción genérica «a todo» no es un registro criptográfico de permiso granular.
3. Proporcionar `enqueue_unique` como transacción privada del servidor sobre la cola vigente, cotejando la huella de la fila e imponiendo la restricción única de la tabla. No insertar directamente por consola como atajo de aceptación.
4. Con identidad de propietario real autenticada, enviar **una sola** orden `READ_HEALTH`, esperar `COMPLETED` con `semantic_verified=true`, y auditar duplicado/replay, expiración y revocación.
5. Solo después, con snapshot y rollback del trabajador original, probar el ejecutor remoto de ratón/teclado/archivos **únicamente en la ventana propia y carpeta sintética**, consentimiento visible y parada inmediata. La activación del control genérico y de las órdenes autónomas queda pendiente del tribunal de seguridad y de evidencias reales.

## Límites intactos
PROD y Trading sin cambios; ninguna clave exportada, ni segundo daemon, ni modificación de puertos 8765–8768, ni suscripciones adicionales. El emisor está desarrollado pero **no desplegado ni conectado a un backend de sesión real**. El PC no ha ejecutado una orden UI/FS remota bajo este candidato.

**No confundir CI verde con control remoto físico.**
