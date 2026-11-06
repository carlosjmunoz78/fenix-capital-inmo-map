# CUT42 · JARVIS · Verificación visible de capacidades del Gateway

Fecha: 2026-11-06. Estado: **IMPLEMENTADO EN RAMA LAB, NO PUBLICADO**.

## Objetivo

El propietario solicita poder hablar, dictar, escribir, consultar información y ejecutar órdenes desde las cuatro interfaces de CEREBRO. Para que el UI no muestre capacidades supuestas, se introduce una comprobación de contrato en el mismo JARVIS, sin duplicar runtime ni usar credenciales nuevas.

## Inventario preservado

- App/CRM real: inalterados.
- Gateway existente: `cerebro-console-gateway-v0` desplegado en Supabase `cluhljgonannaafpmblx`, versión 33, requiere autenticación de usuario y autorización del propietario.
- Respuestas observadas en código desplegado: `GET /health`, `GET /contract`, `GET /engines`.
- Cinco motores lógicos declarados: `CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001`.
- Registro general CEREBRO: 179 IDs lógicos, pero no implica 179 motores ejecutables.
- CUT39: núcleo JARVIS compartido entre JARVIS, OPERATIVA, NEURONAL y NAVEGADOR, PR #27 (DRAFT), base PR #26 (DRAFT).
- `CEREBRO_E2E_USER_JWT` de Actions presente pero caducado; no se actualiza ni se utiliza service_role para eludir el bloqueo.

## Cambios en la rama

1. `src/jarvisGatewayDiagnostics.ts`: inspector **read-only**, tres GETs autenticados por el cliente existente; valida bandera de transporte, ausencia de modelo directo, ausencia de operaciones/Trading PROD y coincidencia exacta de los cinco IDs. Devuelve estado `VERIFIED_READONLY`, `AUTH_REQUIRED`, `GATEWAY_UNAVAILABLE` o `CONTRACT_MISMATCH`. No ejecuta motores, no consulta clientes ni publica.
2. `src/JarvisGatewayCapabilityPanel.tsx`: componente de presentación común, con protección frente a respuestas tardías tras perder la sesión y consulta automática al recuperar `ready`; permite repetir la comprobación por decisión del usuario.
3. `src/JarvisOmniDock.tsx` y `src/JarvisOperativaComposerPortal.tsx`: reutilizan el mismo componente. La inspección se muestra tanto en la interfaz principal como en los accesos de las otras tres vistas.
4. `src/jarvis-composer-presence.css`: estilos pequeños y accesibles en ordenador y móvil.
5. `tests/jarvis-gateway-capability-lab.test.mjs`: pruebas offline de positivo, JWT ausente, contrato inseguro, motor desconocido, duplicado, incompleto y caída de red.
6. `.github/workflows/jarvis-interface-lab-ci.yml`: compila frontend, ejecuta tests y Playwright Chromium escritorio/móvil.

## Cómo interpretar resultados

**VERIFIED_READONLY** confirma únicamente que la App, con una sesión que el Gateway acepta como propietario, pudo leer las tres rutas y que su contrato coincide con el allowlist. No confirma:
- conversación STT/TTS física en el dispositivo,
- toda la memoria, historial de otros chats, Notion y archivos,
- ejecución real de cualquier motor,
- poderes indiscriminados, publicación o acceso a Trading,
- sincronización entre diferentes equipos.

**AUTH_REQUIRED** implica sesión ausente o denegada; **CONTRACT_MISMATCH** impide dar por buena una respuesta relajada, aumentada o malformada; **GATEWAY_UNAVAILABLE** no se presenta como conexión verde.

## Autenticación, coste, rollback

Utiliza el `supabase.auth.getSession()` actual de la App. **No extrae ni muestra el JWT**, no crea secreto GitHub ni necesita la antigua credencial E2E caducada para ejecutar este diagnóstico dentro de la App firmada. Pero el código LAB todavía no está publicado y por tanto no prueba conexión real del usuario hasta desplegarse tras todos los gates.

No se añaden nuevas suscripciones ni llamadas a LLM. No se realizan POST, cambios de Supabase, main, DNS, App o CRM. Para deshacer, descartar cambios de rama LAB/PR DRAFT; no hay efecto externo ni migración.

## GATE de promoción (NO-GO vigente)

- Compilación y tests offline de CUT42 en verde.
- Playwright Chromium desktop+mobile en verde.
- E2E físico bajo propietario: GETs reales, login/logout y denegación otro usuario.
- Conversación completa JARVIS/Operativa/Neuronal/Navegador, STT real, TTS real, autorización de acciones concretas.
- Backup/snapshot, OLD vs NEW y rollback probado.
- Solo después de aprobación y promotion gate se podrá publicar la UI. Ninguna prueba de esta rama autoriza migración destructiva o ejecución autónoma de PROD.
