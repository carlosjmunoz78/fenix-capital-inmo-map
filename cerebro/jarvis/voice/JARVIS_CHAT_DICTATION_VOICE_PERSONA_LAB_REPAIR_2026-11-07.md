# JARVIS · Reparación integral del chat, dictado y personalidad · LAB

**company_id:** fenix · **engine_id:** JARVIS · **environment:** LAB · **version:** repair-v0.1 · **fecha:** 2026-11-07

**DECISIÓN:** preparar y validar sin publicar. Autorización del propietario: reparación completa, **cero costes adicionales**, sin alterar App/CRM/Supabase/WordPress/Cloudflare PROD ni desplegar antes de pruebas físicas reales.

## Diagnóstico físico, no hipótesis

- La PR #37 de un arreglo anterior **fracasó en aceptación física** (escritura, dictado, voz y personalidad). Se revirtió a Vercel `dpl_7H3FJvWR1u3pmL29UUwa69ZrgDeH`, SHA `0ed8c3edd8a92c2c991bb64ab770a7c9f00a853b`; PROD se mantiene aquí.
- El formulario visual de `JarvisOperativaComposerPortal.tsx` escribía indirectamente en otro textarea React e intentaba `requestSubmit` en el DOM. Esa interacción no es una integración estable con el chat canónico.
- `SpeechRecognition` en Dictar tenía `interimResults=false`: transcripción tardía, sin avances visibles. No es una garantía de que el motor del navegador transcriba en todos los móviles.
- El Gateway desplegado `cerebro-console-gateway-v0` versión 33 **coincide byte a byte** con `supabase/functions/cerebro-console-gateway-v0/index.ts` del SHA de origen. Su `closeOwnerGreeting` incluía **saludos literales inapropiados** como «Hola guapo», y `DEFAULT_PREFERENCES.tone=warm_close_caring`.
- `src/cerebroVoice.ts` favorecía deliberadamente voces femeninas del navegador. No usa la voz propia de JARVIS ni síntesis canónica VOICE-001; el TTS real sigue siendo `speechSynthesis` local.
- El Gateway expone `direct_model_access=false`; respuestas de chat deterministas no equivalen a una inteligencia autónoma ni a síntesis de voz avanzada.

## Reparación de laboratorio físicamente ejecutada sobre código

1. **Chat:** `src/jarvisConversationBridge.ts` crea un enlace React privado. `JarvisEmbeddedConsole` lo comparte entre el chat canónico y el cuadro visual. `CerebroConsoleShell` registra funciones reales `sendText` y `toggleVoiceSession`, con autorización Owner y validación del Gateway intactas.
2. **Envío:** `JarvisOperativaComposerPortal` elimina `form.requestSubmit` y la manipulación de valores del textarea de React, llama al método real y conserva el borrador si no se confirma la respuesta. Bloqueo de duplicados simultáneos.
3. **Dictado:** muestra texto provisional `interimResults=true`, recompone resultados completos sin repetir frases, avisa sobre fallos de permisos/micrófono; Dictar solo transcribe, no envía automáticamente.
4. **Gateway de chat:** `src/cerebroConsoleApi.ts` usa `AbortController` con plazo máximo de 20 segundos, sin reintentos automáticos de llamadas potencialmente duplicadas.
5. **Personalidad:** código de la Edge Function modificada **solo en Git LAB**: saludo profesional, contenido breve, preciso y respetuoso, sin trato excesivamente personal; tono predeterminado `professional_direct`. NO se ha publicado la nueva Edge Function.
6. **Voz provisional:** en el navegador se priorizan nombres de voces masculinas castellanas sobre las femeninas cuando estén disponibles. Este selector **NO es VOICE-001 / JARVIS V2**, no garantiza timbre ni género real en todos los dispositivos y no debe promocionarse como voz definitiva.

## Voz canónica preexistente que debe respetarse

Se definió previamente un JARVIS **masculino en castellano de España**, profundo pero claro, elegante, sereno, tecnológico, humano y preciso, con carisma e ironía sutil. La versión aprobada de **JARVIS1 V2** tiene una referencia y preset de calibración propios. La constancia histórica del último gate indicaba `canSynthesize=false` y **LAB**, no un servicio de TTS operativo en PROD. No sustituir ese diseño por una voz genérica del navegador, ni afirmar que ya existe el clon funcional.

**Vía final sin nuevas suscripciones:** integrar la salida del chat real con el motor VOICE-001 canónico cuando se acredite motor, audio resultante reproducible, identidad, latencia y conexión de la sesión; candidatos locales previstos son Qwen3-TTS y Kokoro como fallback. No desplegar TTS costoso/experimental en Supabase, ni inferir que ya está instalado. STT local futuro a verificar frente al SpeechRecognition del dispositivo.

## Evidencias CI obtenidas

- [GitHub Actions #42410277849](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42410277849): **SUCCESS**, `npm run build`, guard estático de política y **3/3 tests Playwright Chromium PASS** en 5 segundos.
- Pruebas: envío único / mensaje de usuario / respuesta de Gateway simulada, dictado con eventos parciales/finales simulados, conversación que envía y activa un adaptador de salida `speechSynthesis` simulado.
- Ninguna de estas pruebas demuestra permiso/latencia del micrófono físico, un TTS canónico JARVIS ni interacción real de la sesión Owner con el Gateway de producción. Un GREEN de navegador mock **NO** habilita promoción automática.

## Gates antes de una publicación real

- [ ] Validar con identidad Owner verdadera en entorno seguro, mismo origen y políticas de CORS sin debilitarlas; **no utilizar un preview `*.vercel.app` incompatible** como aceptación.
- [ ] Transcripción real en Android y PC con permisos de micrófono y latencia aceptable.
- [ ] Chat de texto real: POST único, respuesta semántica, estados de error, conservación de borrador, no doble envío, recuperación al interrumpir.
- [ ] Gateway persona sin frases impropias en un endpoint LAB desplegado seguro; prueba textual de saludos y preguntas ordinarias.
- [ ] VOICE-001 V2 real: audio masculino canónico generado, calidad y disponibilidad comprobadas sin coste nuevo; no confundir `speechSynthesis` con la voz definitiva.
- [ ] Tests negativos de permisos, backup/snapshot, OLD vs NEW, observabilidad, tribunal, rollback real probado; App/CRM y sistemas existentes intactos.
- [ ] Autorización expresa adicional de publicación: la actual permite **preparar y probar, no desplegar a PROD**.

**ESTADO:** CORRECCIÓN DE LAB PREPARADA · CI VERDE · E2E FÍSICO DE VOZ Y OWNER PENDIENTE · VOICE-001 CANÓNICA NO ACREDITADA COMO SINTETIZABLE · PROD INTACTO.
