# CEREBRO OS · JARVIS FASTLANE · Empezar a usarlo ya y ampliar después

**Corte de evidencia:** 2026-11-07. `company_id=fenix`, `engine_id=JARVIS`, `environment=PROD_UI+LAB_BACKEND`, `version=FASTLANE-v0.1`.

## Decisión operativa: reutilizar, NO crear proyectos

**YA EXISTE** la interfaz pública de App Fénix `https://app.fenixcapital.es/cerebro`. La navegación autenticada desde Opera mostró:
- Pantalla **Fénix Capital · JARVIS**, conversaciones, proyectos.
- Campo de texto **Mensaje para Jarvis**, controles **Dictar** y **Conversación por voz**, acceso a **Inicio, Jarvis, Operativa, Neuronal y Navegador**.
- Esto acredita **renderizado UI**, NO certifica por sí solo micrófono/voz ni la respuesta de un chat nuevo con sesión Owner.

**YA EXISTE** una Edge Function desplegada en `fenix-capital-prod`, `cerebro-console-gateway-v0`, **versión 33**:
- `POST /functions/v1/cerebro-console-gateway-v0/chat`, `GET /health`, `GET /preferences`, etc.
- Usa wrapper `withSupabase({auth:'user'})` y `authorizedOwner(req)` comprobando JWT de Supabase e identidad `CARLOS-ADMIN` mediante RPC; no es un endpoint de chat anónimo.
- El propio contrato declarativo del gateway dice `environment=LAB`, `direct_model_access=false`, `prod_execution_enabled=false`. El gateway implementa lógica determinista, consulta de conocimiento y acceso a datos de App con comprobaciones Owner. **NO** convertir sus respuestas en un superagente general.
- El chat ya tiene mecanismos de **memoria estructurada y preferencias** existentes: durante las conversaciones autorizadas puede efectuar escrituras limitadas de memoria. No afirmar `no writes` acerca del servicio ya desplegado.
- La voz/dictado visible en frontend puede requerir permiso de micrófono y prueba humana sobre el dispositivo final. **No confirmada como E2E**.

**OBSERVADO** en los registros agregados reales de Supabase PROD (consulta READ ONLY, ventana 24 horas, filtrada por ruta y HTTP sin datos de usuario): nueve `GET /health` con 200, siete `GET /preferences` con 200 y dos `POST /chat` con 200. También se observaron GET health 401 sin sesión, coherente con protección de la ruta. `HTTP 200` NO demuestra calidad semántica ni ausencia de errores en el contenido de respuesta.

**Conclusión de fastlane:** chat básico **disponible para uso inmediato** a través de la App REAL, pero su E2E específico con la sesión del propietario y la voz deben verificarse en el dispositivo. **NO crear** nueva App, nueva base, nueva empresa, Cloudflare Worker ni proyecto alojado para este MVP.

## Separación rigurosa de ámbitos

| Capacidad | Estado con evidencia | Acción |
| --- | --- | --- |
| Interfaz JARVIS en App PROD | EXISTENTE y renderizada | Usar `/cerebro` |
| Gateway chat real `v0` | EXISTENTE, con respuestas HTTP 200 en logs | Comenzar a conversar |
| Consultas de conocimiento y App autorizadas | Código de gateway existente | Probar E2E Owner por casos concretos, sin escribir CRM |
| Botones dictar/voz | EXISTENTES en UI | Microfono/voz a validar en el dispositivo |
| Motor LRN-001 de aprendizaje autónomo | BLOQUEADO en backend objetivo | NO bloquear chat mínimo por LRN |
| DeepSeek por API | PAUSED por conciliación de gasto | No reactivar ni recargar de forma automática |
| Orquestador de acciones GitHub/Browser/CRM | PARCIAL | Mantener operaciones de riesgo desactivadas; habilitar gradualmente con permisos/gates |
| B2/B3 owner avanzado | OFF, sin concesiones B3 | NO bloquear conversación existente, pero sí operaciones elevadas |
| Backup real de Supabase | Entradas visibles en Pro; restore real no probado | NO bloquear consulta simple; sí nuevas mutaciones peligrosas |
| JARVIS V2 autónomo de producción | NO-GO | No declarar terminado |

## Ruta rápida de uso sin instalaciones

1. Abrir `https://app.fenixcapital.es/cerebro` con sesión propia autenticada.
2. Introducir: `Hola JARVIS, dime qué puedes consultar y qué acciones tienes bloqueadas.`. Verificar respuesta de texto sin invocar acciones críticas.
3. Probar `Dictar` o `Conversación por voz` con micrófono del propio dispositivo, concediendo permiso de navegador si lo solicita. Registrar si aparece error; no fingir éxito.
4. Continuar utilizando JARVIS para consultas, lectura de conocimiento, estados y proyectos. Extender una capacidad solo después de prueba OLD vs NEW, observabilidad, permisos y rollback comprobado.
5. Mantener el chat existente y las operaciones de lectura independientemente de Factory/LRN/tribunal 17 motores. El gate de 17 GREEN aplica a ciertas promociones del pipeline LRN; **no es prerrequisito del chat ya desplegado**.

## Protecciones y coste

- No se han modificado App, CRM, Supabase PROD, WordPress, DNS, Cloudflare ni GitHub main.
- Este documento y el registro de la estrategia son **solo GitHub LAB**.
- No se ha creado ningún proyecto, suscripción ni servicio. No se han hecho nuevas llamadas de pago.
- Se mantiene `company_id,engine_id,environment,version`; respetar permisos humanos y las ocho categorías HUMAN_REQUIRED.
- La mejora incremental debe evitar que el usuario tenga que esperar otros días para comenzar el uso básico.

**FASTLANE: DISPONIBLE LA UI + BACKEND DE CONVERSACIÓN; NO CERTIFICADA VOZ/OWNER CHAT E2E EN ESTA INSPECCIÓN; NO AUTORIZADA AUTONOMÍA PRODUCCIÓN.**
