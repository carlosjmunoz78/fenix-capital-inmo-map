# CEREBRO OS · CUT33 · CONTRATO DE CONEXIÓN MULTIINTERFAZ JARVIS
**Fecha:** 2026-11-06 · **ESTADO:** DEFINIDO / SIN CONECTORES EN PRODUCCIÓN · PR #25 DRAFT.

## Respuesta funcional aprobada
Un solo JARVIS centralizado en la nube debe poder servir **CEREBRO Console, JARVIS Work Console, escritorio, móvil, tablet, interfaces de supervisión, voz bidireccional y futuras aplicaciones de distintas empresas**. Un canal es una interfaz, **no un nuevo núcleo JARVIS**. Todas las acciones pasan por CEREBRO Gateway y por autorizaciones B2/B3 y políticas; ninguna interfaz accede directamente a motores, secretos, D1 ni a DeepSeek.

## Inventario de código que debe preservarse (POR AUDITAR EN E2E)
- `cerebro/console/gateway.mjs`: contrato Console V0 existente, chat/command/context/auditoría, con restricción explícita de entorno `PREPROD`. No cambiar esta restricción ni utilizar su nombre histórico como autorización para crear una App PREPROD nueva.
- `cerebro/registry/console-v0.json`: referencia de contexto `company_id, engine_id, environment, version`, selección de empresa y protocolo HUMAN_REQUIRED. Contiene evidencia de Gateway Console PROD distinta de JARVIS nuevo: **no sustituir ni redirigir automáticamente**.
- `src/CerebroJarvisWorkConsole.tsx`, `src/CerebroConsoleHost.tsx`, `src/CerebroConsoleShell.tsx`, `src/JarvisEmbeddedConsole.tsx`, `src/cerebroConsoleApi.ts`: superficies actuales. No modificar App/CRM reales antes de inventario, backup, pruebas OLD vs NEW y rollback.
- `zeus/jarvis/core/jarvis-global-identity.mjs`, `jarvis-b2-device-session-gate.mjs`, `jarvis-b2-b3-gateway-read-gate.mjs`: identidad y protección del nuevo núcleo. **CUT32-33 no ha desplegado todavía B2/B3/Gateway reales**.
- `zeus/jarvis/voice/JARVIS_V2_OWN_VOICE_ALL_CEREBRO_SURFACES_2026-11-06.md`: JARVIS V2 propio para superficies CEREBRO; ANA sigue en App Fénix Capital ordinaria, sin sustitución.

## Contrato futuro, única puerta de entrada
- `company_id`: seleccionada en la interfaz, **revalidada en servidor**, nunca amplía permisos.
- `engine_id=JARVIS`, `environment=LAB|PROD`, `version`: siempre explícitos.
- `surface_id`: nombre canónico de la interfaz, definido en registry con política de voz (JARVIS V2 para CEREBRO, ANA para App ordinaria).
- `session`: credencial servidor/JWT verificado o cookie B2 específica del origen del Worker, más permisos B3 y revocación real. Jamás aceptar `owner_id`, compañía, roles o acceso a misiones proporcionados sin validar en payload del cliente.
- `capabilities`: lista de operaciones mínima por canal; inicialmente `JARVIS_STATUS` y `MISSION_INSPECT` (solo lectura), luego más acciones con tribunal, auditoría, costes y rollback.
- `correlation_id`, `request_id`, `action_id`: observabilidad sin credenciales, datos sensibles, audio bruto ni texto privado en logs.
- `human_required_reason`: únicamente motivos autorizados (LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST).

## Limitaciones reales antes de conectar los canales
1. **CUT33 aún es código LAB no desplegado**. El objetivo inmediato es crear un *segundo Worker* `cerebro-jarvis-cut32-lab-eu` OFF, con Access individual antes de exponer workers.dev; CUT30 original permanece intacto.
2. La cookie `__Host-jarvis_b2` queda vinculada al **origen del Worker**. No enviar esa cookie a otra App o dominio, ni incrustarla en URLs ni en client bundles. Para aplicaciones nativas y dominios nuevos se requiere un flujo de autenticación y sesión propio/broker validado de extremo a extremo, sin duplicar identidad ni tomar JWT de otra aplicación sin contrato.
3. Tras prueba real PC/móvil, revocación y controles B10, se puede exponer un Gateway read-only multiempresa mediante un contrato estable. **No conectar App Capital PROD directamente a un Worker de pruebas.** Primero usar clientes LAB aislados o mocks, compatibilidad OLD vs NEW y activación gradual cuando corresponda.
4. Para conversación por voz futura se requieren STT, TTS propio JARVIS V2, interrupción, continuidad, regulación de costos y rutas WebSocket protegidas por un mecanismo compatible. Cloudflare Access **a nivel Worker** no permite upgrade WebSocket según documentación; diseñar seguridad por hostname antes de habilitar voz en tiempo real.
5. **DeepSeek no será dependencia permanente**. El Router escogerá por calidad/seguridad/coste, hasta poder desactivar su adaptador después de comparación de paridad. Voz propia no significa inferencia LLM gratis.
6. Cero necesidad de ordenador local encendido para operar el núcleo: Workers y D1 Cloudflare. Backends de STT/TTS autoalojados podrán exigir recursos CPU/GPU cloud y coste medido; no presentarlos como gratuitos ilimitados.

## Gates de integración, en orden
**CUT33 remoto seguro** → **B2 sesiones físicas** → **B3 concesión mínima y política** → **Gateway cloud read-only** → **Console cliente LAB** → **móvil/tablet/futuras apps con adaptador común** → **VOICE-001** → **evaluación y mejora del diálogo** → **B10, OLD vs NEW, rollback** → **promoción gradual de acciones reales**. No fusionar PR #25 ni modificar main/PROD/App/CRM por estar las CI en verde.

## Recuperación y coste
El Worker CUT30 activo `cerebro-jarvis-lab-eu` versión `25e98edd-55a8-4222-b834-92f9d5b4bc21` no se reemplaza. El Worker paralelo puede ponerse OFF sin tocar CUT30. Rollback CUT30 documentado, todavía NO probado físicamente; no afirmarlo. Access nuevo y específico para Worker nuevo, sin reglas `all_workers` ni suscripción adicional. No realizar pagos o desplegar en este commit.

**PROD: NO-GO.**
