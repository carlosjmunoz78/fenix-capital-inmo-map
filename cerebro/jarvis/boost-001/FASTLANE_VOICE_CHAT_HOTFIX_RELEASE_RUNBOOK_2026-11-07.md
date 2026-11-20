# JARVIS · HOTFIX de voz y chat · Publicación controlada

Fecha: 2026-11-07. `company_id=fenix`, `engine_id=JARVIS`, `environment=LAB_CANDIDATE`, `version=VOICE-HOTFIX-v1`.

## Problema reportado
- Hablar a JARVIS tarda en escribir/transcribir.
- JARVIS no responde por voz y puede no responder al enviar.
- Dos controles diferentes: `Dictar` solo transcribe; `Conversación por voz` debe enviar automáticamente la transcripción FINAL y leer la respuesta si el dispositivo tiene TTS.

## Corrección concreta
- `src/JarvisOperativaComposerPortal.tsx`: quita transferencia indirecta `setReactTextareaValue` + `requestSubmit()`, que podía no actualizar el estado React antes de enviarse; usa evento síncrono de aceptación de chat (rechazo visible y no borrar el texto).
- Distinta disponibilidad real del chat: ahora comprobada mediante textarea original habilitado, no a partir de un título.
- Dictado muestra resultados intermedios sin duplicar fragmentos. `Dictar` requiere `Enviar`; el control voz se etiqueta por separado como envío y respuesta.
- `src/CerebroConsoleShell.tsx`: escucha el evento solo mientras existe el componente y conserva comprobaciones owner + `chatReady` + `sendingRef`. Envía solo transcripción final y una vez por reconocimiento. La salida TTS inicia sin esperar la preparación opcional del micrófono de interrupción.
- `src/cerebroConsoleApi.ts`: AbortController 20 segundos; mensaje de resultado no confirmado que impide reintentos de operaciones a ciegas.

## Auditoría de cambios
- Base `main` antes de hotfix: `05450ead313e5f8d2e6a521ce8187afbf46a3c9e`.
- Rama quirúrgica derivada de `main`: `hotfix/jarvis-voice-chat-direct-send-20261107`.
- PR [#36](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/36), **DRAFT** hasta aceptación física.
- Solo 3 ficheros funcionales de frontend + tests + workflow + este runbook. Sin migraciones, cambios de backend, DNS, WordPress, CRM, Supabase o permisos.
- CI LAB [#42401228499](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42401228499): 6/6 + TypeScript/Vite PASS.
- CI hotfix [#42401452061](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42401452061) y último [#42401785529](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42401785529): 6/6 + build PASS. Esta ejecución no publica.
- `production_ready_e2e=false` hasta reproducir en la sesión de propietario y voz del dispositivo; la compilación no acredita TTS Android.

## Gate de publicación mínima
1. Conservar `main` SHA, identidad Owner y contrato del Gateway actual. Validar sin tocar App/CRM ajenos.
2. Comprobar diff exacto PR #36; rechazar dependencias, auth bypass, credenciales o ajustes extra.
3. Prueba sobre vista HTML con API mock del flujo "Dictar → Enviar" y "Conversación por voz → reconocimiento final → texto y TTS", incluyendo error/timeouts; el device E2E requiere interacción humana con micrófono.
4. Verificar rollback de code-only: revert del merge/commit hotfix, reconstrucción y vuelta al hash de `main` en caso de error. Registrar release SHA y observabilidad.
5. Solo entonces cambiar PR DRAFT→READY, merge controlado y observar en `https://app.fenixcapital.es/cerebro` la respuesta humana del propietario.
6. Si chat/voz no responden en dispositivo tras despliegue, rollback inmediato y diagnóstico de permisos micrófono, sintentizador TTS Android y respuesta real del gateway.

## Evidencia disponible antes de despliegue
- En la ventana observada del 2026-11-07, Supabase registraba POST `cerebro-console-gateway-v0/chat` HTTP 200. No se inspeccionaron cuerpos de mensajes, y HTTP 200 no prueba salida visible.
- No se ha probado que el móvil del propietario tenga TTS o permisos concretos; no afirmar arreglo publicado ni éxito de voz real.
- Mientras tanto, workaround: botón `Dictar` → hablar → esperar texto → pulsar `Enviar`. El botón `Conversación por voz` es el de conversación continua.
- Sin nuevo proyecto ni suscripciones ni llamadas DeepSeek. El Gateway ya desplegado conserva autenticación Owner.

**ESTADO: parche probado en rama aislada; App PROD sin despliegue; PR DRAFT; falta promoción segura y E2E de móvil.**
