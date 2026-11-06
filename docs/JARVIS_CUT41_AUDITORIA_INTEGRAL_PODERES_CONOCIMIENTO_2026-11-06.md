# CUT41 · Auditoría de verificación integral JARVIS · 2026-11-06

**Estado general: PARCIAL. NO-GO PROD. No se acredita funcionamiento integral en todas las interfaces, acceso a toda la información, ni poderes universales.**

## Perímetro y metodología

Solo lectura de la App publicada (árbol de accesibilidad Opera), código y CI GitHub, conectores Supabase y Notion, y metadatos de tablas PROD consultados mediante `SELECT`. No se pulsaron controles en la App publicada, no se invocaron acciones ni micrófono real, no se alteraron credenciales, datos, funciones, DNS, permisos o main.

## Interfaz · OLD vs NEW

| Superficie | Publicación real | Candidato CUT38/CUT39 | Verificación | Estado |
|---|---|---|---|---|
| JARVIS | Botones «Mensaje para Jarvis», «Dictar» y «Conversación por voz» visibles y habilitados en UI | Envío por puente autenticado, reconexión, memoria efímera | Código y Playwright sintético 20/20; sin interacción propietaria real | PARCIAL |
| Operativa | Existencia en código del frontend, controles independientes | Comparte una sola instancia del núcleo JARVIS; eliminado segundo CerebroConsoleShell del candidato | Compilación/regresión LAB; sin prueba física de PROD | PARCIAL |
| Neuronal | Vista existente en el host | Dock JARVIS, misma conversación en memoria | Playwright simulado escritorio/móvil, no sesión propietario real | PARCIAL |
| Navegador | Vista Navegador existente, worker separado | Dock JARVIS, voz/teclado comunes; Browser conserva su control de sesión | Playwright simulado; no ejecución real del navegador en PROD desde chat | PARCIAL |
| Voz real | Botones visibles | SpeechRecognition/SpeechSynthesis según navegador/permisos | No se probó micrófono/salida física en equipo del propietario | POR AUDITAR |
| Entre dispositivos | Ninguna prueba de sincronización completa | Proyección de últimos 24 turnos en memoria de la misma pestaña, no durable | No cumple por sí sola historial entre PC/tablet/móvil | NO DEMOSTRADO |

**CI verificable:** [run 42279112598](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42279112598) SUCCESS con compilación, tests de seguridad y **20/20** tests Playwright Chromium sintéticos. El paso HTTP E2E propietario fue **SKIPPED/BLOQUEADO**, no exitoso. PR [#26](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/26) y [#27](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/27) siguen OPEN DRAFT sin merge.

## Gateway e identidad

- Supabase proyecto `cluhljgonannaafpmblx`: `cerebro-console-gateway-v0` **ACTIVE versión 33**; el handler contiene controles de usuario y propietario. La bandera `verify_jwt=false` obliga a inspeccionar las validaciones a nivel de handler, no permite asumir acceso público.
- Las funciones `jarvis-work-gateway-v1`, `jarvis-orchestrator-v0`, `cerebro-browser-interactive-v3` y `cerebro-voice-preview-v0` están marcadas **ACTIVE** en el inventario de despliegue. ACTIVE no prueba operación de extremo a extremo ni que la consola tenga todas sus capacidades conectadas.
- El Gateway de chat declara **cinco** motores básicos (`CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001`). El catálogo maestro GitHub `cerebro/registry/engine-registry.v1.json` enumera **179** IDs lógicos; el catálogo tiene estado por defecto `SCAFFOLD` y `UNKNOWN_REQUIRES_AUDIT`. No equivale a 179 motores productivos ni a 179 acciones disponibles en la UI.
- [run 42278561640](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42278561640): HTTP 401 al usar JWT de prueba del propietario en salud del Gateway.
- [run 42279112598](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42279112598): comprobación previa `JARVIS_OWNER_JWT_FRESHNESS=EXPIRED_OR_NEAR_EXPIRY`, con prueba propietaria omitida. Credencial existente pero no utilizable. Requiere renovación legítima; NO usar service_role ni debilitar políticas.

## Conocimiento · fuentes y cobertura física

Metadatos de lectura de Supabase del 2026-11-06 (no se han leído contenidos privados):

| Fuente | Conteo confirmado | Limitación |
|---|---:|---|
| `fenix_prod.cerebro_conversation_memory` | 31 memorias activas, último `last_seen_at` 2026-10-06 | No son toda la conversación ni todo el historial de chats / CRM |
| `fenix_prod.ana_knowledge_cards` | 7 tarjetas con estado `approved` | Aprobadas no implica indexación/lectura efectiva por JARVIS |
| `zeus_jarvis.b4_memory_event` | 0 eventos | Una tabla vacía no demuestra que otras memorias estén vacías |
| `public.jarvis_work_job_v1` | 4 trabajos: 3 `SUCCEEDED`, 1 `DEAD_LETTER` (2026-11-03) | Prueba ejecuciones específicas, no poder universal |

El conector de Notion pudo recuperar las páginas de **JARVIS Fénix Capital**, **Base Estratégica CEREBRO** y **Base de conocimiento/FAQ Fénix**. Estas lecturas proceden de la conexión Notion de ChatGPT, **no** del Gateway desplegado de la App. El `knowledge.ts` publicado contiene recuperación documental/Notion y memoria por RPC, pero el estado de su token Notion y su resultado real con JWT de propietario no están verificados.

DeepSeek CUT37 acumula candidatos LAB, separados del JARVIS publicado y sin evidencia de actualización de pesos ni ingestión gobernada en la memoria productiva.

## Facultades de ejecución verificadas y no verificadas

- **EXISTENTE en código/deployment**: operaciones del Gateway de consulta, memoria, propuesta/confirmación de email y activación SEO bajo contrato; orquestador con intents concretos de inspección GitHub y trabajos; navegador con rutas de sesión/entrada/handback; servicios de voz.
- **EVIDENCIA física parcial**: 3 trabajos `SUCCEEDED`, 1 `DEAD_LETTER` registrados en PROD. No se accedió a payloads ni resultados privados.
- **NO DEMOSTRADO**: que los comandos de cada superficie se dirijan al mismo agente en PROD; acceso real a cada motor, navegador/PC, publicación, ERP/CRM, Notion, todos los chats o todos los repositorios; disponibilidad real 24/7; autonomía multiempresa y persistencia entre dispositivos.
- **LÍMITES vigentes**: identidad, empresa, acciones permitidas, auditoría, costes, backup/rollback, excepciones humanas de riesgo/legal/firma/seguridad; Trading separado. No son 'poderes ilimitados'.

## Cierre / promoción

1. Mantener ambas PR DRAFT y conservar main/PROD/CUT30.
2. Renovar el JWT E2E por canal seguro de sesión del propietario (sin revelar valores en logs o chat) y repetir HTTP positivo + negativo en el mismo Gateway, con evidencias.
3. Probar realmente escribir/dictar/hablar en móvil, tablet y PC con micrófono y salida de voz, además del cambio de las cuatro superficies y logout/multicuenta.
4. Validar los motores accionables individualmente usando el Gateway (intención -> autorización -> ejecución -> recibo -> auditoría) con pruebas reversibles, sin operación destructiva.
5. Prueba transversal de conocimientos: preguntas sobre cada fuente canónica con referencias, frescura, aislamiento y autorización; mapear fuentes ausentes antes de afirmar historia completa.
6. Snapshot de App/CRM, contrato OLD, tests, aislamiento, rollback rehecho, comparación OLD vs NEW y promoción gradual solo tras gate de producción.

**Resultado final del audit CUT41: PARCIAL; NO SE PUEDE CERTIFICAR «FUNCIONA EN TODOS LADOS Y TIENE TODA LA INFORMACIÓN Y PODERES». COSTE ADICIONAL: 0 €.**
