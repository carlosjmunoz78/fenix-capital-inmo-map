# CEREBRO OS · PC-001 · Auditoría viva de transporte e integración (2026-11-05)

**Alcance:** `fenix / PREPROD / PC-001`. **Modo:** lectura de código Edge, tabla de comandos y reporte físico aportado. Ningún cambio en Supabase, PROD o Windows.

## Estado confirmado y evidencia
- Prueba local de PC001 Control V0.1: `LOCAL_UI_AND_FILES_PASS_REMOTE_PENDING` en `CEREBRO_PC001_CONTROL_RESULT.json`, fechado `2026-11-04T19:07:53Z`. SHA-256 del reporte `7873089c3143db81607a3e45613bd2b17bfce2fb5fcadd9578ea29fea2a5f9a9`.
- Consentimiento visible, clic/ratón/teclado dentro de ventana propia, screenshot local y creación/copia/movimiento/renombrado/eliminación recuperable **de ficheros sintéticos** según reporte del equipo.
- No existe prueba de atestación de identidad del nuevo EXE: `device_id=LOCAL_NON_ATTESTED`. No existe prueba de control remoto real.
- Dispositivo anterior con id canónico `78ca78cf158b3cda329cf39e0270f0a5` aparece `ONLINE` en `public.cerebro_device_agents_preprod`, con heartbeat `2026-11-05T08:13:26.612Z`, antigüedad 64 s en consulta; ello **NO vincula** el nuevo ejecutable V0.1 al Gateway.
- Única orden registrada del dispositivo en `public.cerebro_device_commands_preprod`: `capability=SERVICE_HEALTH`, `action=READ_HEALTH`, esquema V2, completada 2026-11-04 16:02 UTC con `semantic_verified=true`. No se encontró orden de ratón/teclado/navegador.

## Contrato vivo reutilizable
Edge Function: `cerebro-device-gateway-preprod`, versión **9**. Endpoints revisados:
- `GET /health`: información sanitaria, PREPROD.
- `POST /v1/agents/enroll`: enrolamiento con prueba de pairing y digest de token.
- `GET /v1/agents/poll`: cola exact-scoped por dispositivo/empresa/entorno/versión, lease de 90 s y recuperación del lease vencido.
- `POST /v1/agents/result`: persiste resultado vinculado a dispositivo, deduplica por hash, marca `COMPLETED` solo con `semantic_verified=true`.
- El Gateway **no presenta** aquí una ruta pública de emisión de órdenes. La emisión canónica no se improvisa insertando directamente SQL.
- Contrato ya existente: `cerebro/runtime/universal-device-command-envelope-v2.mjs`. Valida device/company/venture/engine/environment/version, policies, caducidad, idempotencia y secretos en claro.

## Gap técnico exacto
**No falta infraestructura de cola ni heartbeat.** Falta añadir al **host Windows existente** un adaptador ejecutor de comandos UI/FS con aislamiento por sesión, consentimiento explícito, kill switch y receipts semánticos, usando la identidad real emparejada y el transporte V2 existente. El candidato V0.1 realiza únicamente pruebas locales con consentimiento y NO es ejecutor de órdenes Gateway.

## Secuencia de implementación sin romper
1. Inventariar el dispatcher real de AccessBoot/8766/8768 y su firma de comandos (no duplicar worker ni instalar listener remoto nuevo).
2. Definir capability allowlist inicial: `PC001_SYNTHETIC_UI_PROOF`, `PC001_SYNTHETIC_FS_PROOF`, rechazando acceso arbitrario a carpetas/programas y shell libre.
3. Autenticar transport y vincular `canonical_device_id` con sesión interactiva, `company_id=fenix`, `environment=PREPROD` y `version=pc001-windows-v1`. El archivo de prueba no concede por sí mismo autoridad.
4. Implementar idempotencia, bloqueo de replays, consentimientos temporales visibles, prioridad de interrupción local, secretos excluidos y readback real de cada operación.
5. Ejecutar E2E remota en carpeta de ensayo: ordenar → entregar por Gateway → interacción visual permitida → verificar → receipt → comprobar DB. Probar fallo, revocación, kill switch y rollback antes de ampliar a Chrome/Opera o aplicaciones.
6. Solo cuando esto esté verde: integración con navegación real, transferencias autorizadas, gestión de programas y segundo Windows.

**Estado:** LOCAL_CONTROL_PHYSICAL_PASS / GATEWAY_TRANSPORT_EXISTING / REMOTE_ACTUATOR_NOT_IMPLEMENTED / PROD_UNTOUCHED / COSTE_ADICIONAL_0_EUR.
