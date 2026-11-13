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

## Ampliación de pruebas y realidad del proveedor de voz · cierre 2026-11-07

### Nueva evidencia

- [GitHub Actions #42412391753](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42412391753): **SUCCESS · 5/5 pruebas de navegador**; compilación TypeScript+Vite completa. El quinto test muestra envío y respuesta de texto en una pantalla de 390×844 px.
- [Actions #42412217632](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42412217632): 4/4, incluye un segundo permiso de micrófono que queda eternamente pendiente **sin silenciar la síntesis**. Se detectó y corrigió además una excepción de asignación de voz nativa; los fallos TTS ahora se identifican como errores de audio, no como falsa caída del Gateway.
- Los tests E2E de voz usan sustitutos coherentes de SpeechRecognition y SpeechSynthesisUtterance; **no** prueban el micrófono real, voces nativas de Android, altavoz ni el modelo VOICE-001 clonado.
- El selector provisional está aislado en `src/jarvisMaleBrowserVoice.ts`, no en `src/cerebroVoice.ts`; **se preserva la voz actual de ANA**. Rechaza voces claramente femeninas o sin etiqueta reconocible de voz masculina y ofrece diagnóstico si no puede hablar, sin suplantar al clon.

### Perfil canónico y conexión real

- La búsqueda de inventario mediante vidIQ con coste **0 créditos** localizó la voz propia `cfkJwJs7cjrVgVLm3yvM`, registrada como JARVIS 1 (Victor Iturrioz), en las 23 voces disponibles, junto a otro clon custom `QGH6KSAXelJsYC43E5xG`.
- El endpoint de generación `vidiq_voiceover_generate` **cuesta 28 créditos por cada 1.000 caracteres, redondeados al alza**. No es sostenible como síntesis ilimitada a coste por conversación 0. No se ha invocado y **no se han gastado créditos**.
- La conexión vidIQ disponible en ChatGPT **no está expuesta como un motor TTS de la App Fénix**, ni se ha verificado un contrato de API usable por CEREBRO. No confundir disponibilidad del clon con Gateway conectado.
- El perfil aprobado JARVIS V2 «Más clara», **1,10× y +0,6 semitonos**, se conserva; no sustituir por voz de navegador. La política preexistente VOICE-001 requiere diferenciar superficies: **JARVIS para consolas CEREBRO, ANA exclusivamente para App Fénix**.
- Fuente de contrato en Drive: `VOICE001_JARVIS1_VOICE_SURFACE_POLICY_2026-11-04.md`; `VOICE001_JARVIS1_BACKUP_ROLLBACK_RUNBOOK_2026-11-04.md`; `ZEUS_JARVIS_B5_VOZ_CUT02_ESTADO_2026-11-05.md`.
- Existe el piloto open-source Chatterbox Multilingual V3 (PR #24 LAB), **no desplegado**. El primer arranque descarga varios GB, requiere ensayos locales y recomienda **12 GiB RAM**; en evidencias previas el PC tenía unos 7,88 GiB. No afirmar factibilidad o baja latencia sin medición física.
- ZIP existente para diagnosticar el PC, **sin crear proyecto**: `JARVIS_V2_MOTOR_GRATIS_WINDOWS_LAB_2026-11-05.zip`, Drive ID `1vpGjl0fJFNNIqxehk-so0-shokRDiCbz`, 483.689 bytes, incluye `JARVIS_DIAGNOSTICO_1_CLIC.cmd`. Descargar y ejecutar desde PC es `HUMAN_REQUIRED` por control físico; no introducir contraseñas ni audios sensibles.
- La referencia de voz es privada y los derechos/licencia del intérprete no se han acreditado documentalmente para explotación pública; mantener `LEGAL_REQUIRED` antes de producción del clon.

### Criterio honesto de cierre

**HECHO:** reparar código del chat y dictado, política de saludo de Gateway (solo Git LAB), selector provisional de voz masculino aislado, watchdog de 20 s, reacción correcta al fallo de síntesis, pruebas E2E mocks 5/5.

**BLOQUEADO:** voz propia JARVIS V2 dinámica, 0 créditos por frase, motor disponible para móvil/PC/tablet, propietario real y micrófono físico en Android, autorización de derechos, backup/modelo y despliegue progresivo.

**NO-GO PROD:** aunque la QA sea verde, NO fusionar ni desplegar a `app.fenixcapital.es` ni a Supabase PROD sin pruebas humanas reales y gate de rollback. La App actual sigue `dpl_7H3FJvWR1u3pmL29UUwa69ZrgDeH`.

## ONLINE VOICE · Cloudflare gratuito · Corte seguro 2026-11-07

**Objetivo corregido por el propietario:** JARVIS debe sintetizar respuestas online, directamente para las interfaces CEREBRO (móvil/tablet/PC), incluso con el ordenador de oficina apagado. No utilizar su PC como servidor, no instalar software local como condición de uso, no crear otra App ni contratar servicios.

### Descubrimiento verificable

- Cloudflare Workers AI dispone de TTS español `@cf/deepgram/aura-2-es`, speakers `javier`, `alvaro`, etc. **NO permite seleccionar el voice ID de clon vidIQ** `cfkJwJs7cjrVgVLm3yvM`. Una respuesta de Aura-2-es es **voz genérica**, no JARVIS V2.
- Según [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) (2026-10-01), el Free cuenta con **10.000 neuronas/día** compartidas, y este modelo se calcula en **2.727,27 neuronas por 1.000 caracteres**. Es un cupo limitado; superarlo provoca errores. La asignación disponible real de la cuenta existente NO se ha leído y puede consumirse por otros motores.
- Se verificó en el dashboard autenticado de Cloudflare que **ya existe** `cerebro-jarvis-cut32-lab-eu` con **«No hay rutas activas»**. También existe `cerebro-jarvis-lab-eu` con URL `workers.dev`. **No modificar** el Worker original ni poner en público el nuevo; Cloudflare Access B2/B3 autenticado y aprobación real de propietario siguen pendientes.
- [Hugging Face Spaces](https://huggingface.co/docs/hub/spaces-overview) CPU Basic dispone de 16 GiB pero **duerme si está inactivo**, por lo que tampoco demuestra el objetivo de voz siempre disponible. [Google Cloud Run](https://cloud.google.com/run/pricing) tiene free tier por consumo, **no coste garantizado de 0 €**, y no se ha acreditado hardware/latencia para Chatterbox; no activar recursos nuevos.
- La voz canónica vidIQ V2 disponible por conector es de pago por generación (**28 créditos/1.000 caracteres**) y no está enlazada al runtime de CEREBRO. No se han consumido créditos. No tiene sentido cambiar una voz genérica por otra y llamarla «la voz exacta de JARVIS».

### Código listo, sin infraestructura nueva

**Se ha fabricado** el puerto de audio de servidor `zeus/jarvis/voice/online-cloudflare-lab/jarvis-online-free-tts-port-v0.mjs`:
- `company_id=fenix`, `engine_id=VOICE-001`, `environment=LAB`, versión explícita.
- Motor `@cf/deepgram/aura-2-es`, speaker `javier`, audio MP3; etiquetado inequívoco `GENERIC_SPANISH_MALE_NOT_JARVIS_V2`, `canonicalJarvisV2:false`.
- Reserva atómica y **verificada para toda la cuenta** de máximo 3 neuronas por carácter, con tope 10.000 neuronas/día compartido; **solo plan Free comprobado**, sin recarga, sin acceso a métodos de pago. El proveedor no se invoca si faltan evidencias de cuota/plan.
- Requiere B2 Owner JWT válido, B3 `ALLOW`, consentimiento, privacidad `PUBLIC`, auditoría y kill switch explícitamente OFF. Si falla cualquier comprobación devuelve `DENY`; no expone datos de otros motores ni escribe el CRM.
- No realiza llamadas reales a Workers AI al cargar el módulo: instancia de `env.AI` solo en runtime futuro autorizado.

**Se ha fabricado** el adaptador HTTP `zeus/jarvis/voice/online-cloudflare-lab/jarvis-online-free-voice-http-v0.mjs`:
- Solo `POST /voice/lab/generic-synthesize`; origen permitido explícito, **Cloudflare Access verificado** antes de invocar la IA, JWT necesario, sin claims de privilegio cliente.
- MP3 solo en respuesta privada al autorizado, nunca como URL abierta y nunca etiquetado como clon canónico. Sin CORS comodín. No toca App/ANA/Gateway/Worker original.
- No se ha conectado todavía a un Worker desplegado ni a una consola publicada.

**CI física del código:** [GitHub Actions #42419296678](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42419296678) **28/28 PASS**, 15 pruebas del núcleo, 13 de HTTP y guardas estáticas. **No hay inferencia online real ni tráfico MP3 de usuario**.

### Estado de promoción real

`ONLINE_GENERIC_LAB_ADAPTER_TESTED__ROUTE_OFF__QUOTA_AND_ACCESS_UNVERIFIED__CANONICAL_VOICE_NOT_CONNECTED`.

**NO-GO PROD por tres elementos:** (1) Access B2/B3 Owner en la URL del Worker y en el Gateway; (2) cuota Workers AI **Free** y disponibilidad real de la cuenta confirmadas, con reserva atómica account-wide; (3) aceptación de que el fallback genérico NO sustituye la voz aprobada, y la voz aprobada sigue pendiente de un backend cloud viable/licitud de uso.

La App real sigue en su deployment previo. No se han creado Cloudflare Workers, proyectos, buckets, rutas, DNS, suscripciones, ni hecho llamadas de síntesis o gastos nuevos. La publicación y evaluación con la sesión real de dos dispositivos requieren autorización y pruebas de seguridad adicionales.
