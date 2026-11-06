# CEREBRO OS · CUT44 · Voz, dictado y entrada de texto JARVIS (LAB)

Fecha: 2026-11-06 · Estado: CANDIDATO LAB · NO-GO PROD.

## Incidencia del propietario
En la App real algunos controles muestran «Dictar» o «Hablar», pero no entregan una conversación fiable; también se han observado respuestas incompatibles con la personalidad ejecutiva de JARVIS. Esta incidencia real del propietario prevalece frente a tests de navegador simulados.

## Inventario/OLD conservado
- PR #26 (CUT38) y PR #27 (CUT39–CUT42) siguen DRAFT; la superficie de producción no incorpora estas mejoras hasta un gate de promoción.
- Gateway autenticado y límites de escritura B2/B3, App/CRM, ANA, Supabase, Notion, Browser 1, CUT30, DNS, main y los contratos existentes quedan intactos.
- `src/cerebroVoice.ts` (selector genérico usado potencialmente por ANA) NO se modifica. La función genérica `preferredSpanishVoice` favorece por nombre algunas voces femeninas, por lo que JARVIS requiere su propia política.
- El backend no admite por este cambio instrucciones de sistema; no se envían prompts secretos ni se modifica el texto procedente del Gateway como si fuera una respuesta distinta.

## NEW aislado
1. `src/jarvisVoicePolicy.ts`: selector de voz específico de JARVIS. Ordena voces españolas por región y nombres masculinos conocidos, pero el catálogo depende del SO/navegador y la heurística NO garantiza género o timbre. Si no hay voces españolas no se declara éxito.
2. Fallback navegador: `tone=executive_formal`, velocidad 1,10×, pitch 0,98; conserva velocidad explícita válida y fuerza un timbre menos agudo que el antiguo `warm_close_caring`. La muestra aprobada «Más clara» 1,10× de Drive **NO** está desplegada ni clonada por este cambio.
3. `CerebroConsoleShell` (solo consola JARVIS): trato «señor», errores STT formales y precisos; texto editable aun con Gateway offline, botón Enviar permanece bloqueado hasta `chatReady`. Respuestas 401 y 403 se identifican sin exponer JWT.
4. `JarvisOmniDock`: dictado con hints es-ES, errores comprensibles y alternativa del teclado cuando Web Speech no existe.
5. `JarvisOperativaComposerPortal`: reemplaza mensajes que suponen Chrome por diagnósticos independientes del navegador y acuses formales.
   - Gate corregido: ahora usa `getJarvisOmniState().ready` (Gateway real), NO `textarea.disabled`; un borrador editable offline no puede encender falsamente el indicador de conexión ni habilitar envíos. Actualización por evento de estado autenticado.
6. Tests Node de política, voz, separación de ANA, permiso de micrófono, autenticación y borrador; CI TypeScript/Vite + Playwright desktop/mobile con fixtures.
7. Lógica SOLO en LAB, sin API de pago, sin merge ni deploy.

## Dependencias y bloqueos reales
- Para que la respuesta de contenido sea JARVIS, el protocolo CUT43 (PR #28) debe integrarse en el Gateway de forma gobernada. Este CUT44 no reentrena DeepSeek ni cambia las respuestas reales de PROD.
- Dictado usa `SpeechRecognition`/`webkitSpeechRecognition` ofrecido por el navegador. No se puede afirmar STT si la API falta o si el micrófono está denegado.
- TTS usa `speechSynthesis` del dispositivo. El timbre de la muestra «Más clara» de Drive no está conectado.
- E2E real de chat/voz del propietario: BLOQUEADO por JWT de pruebas caducado y falta de prueba física con micrófono y salida en los dispositivos.
- El resultado de Playwright con STT/TTS simulados NO equivale a una llamada de voz real.
- La autenticación, roles, datos y acciones siguen bajo controles server-side; el contexto UI no concede permisos.

## Gates de aceptación para futura promoción
1. CI compilación, unitarias, Playwright PC/móvil, regresión de voz ANA y actor scope.
2. Contrato CUT43 de personalidad y pruebas A/B OLD/NEW independientes, sin «hola guapo».
3. JWT propietario fresco obtenido mediante sesión legítima, pruebas positivas y negativas GET/POST donde proceda y no escritura no autorizada.
4. Permiso de micro, dictado, recuperación tras error, TTS y conversación con interrupciones desde las 4 interfaces en PC y móvil.
5. Snapshot de App/CRM, rollback físico ensayado, evaluación/tribunal, observabilidad/coste y promoción gradual autorizada.

## Rollback
Cerrar PR CUT44 / descartar la rama. No requiere reversión de PROD ni migraciones porque no se ha tocado producción.

## Resultado
**HECHO en LAB:** cambios de UI y voz JARVIS implementados como candidato.
**PENDIENTE:** CI sobre el HEAD final, Gateway real, TTS/STT físico, personalidad server-side, OLD vs NEW y promoción.
