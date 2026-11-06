# JARVIS CUT48 · Verificación física dirigida y restauración simulada de Gateway

**Fecha:** 2026-11-06. **Entorno:** LAB. **Estado:** NO-GO PROD.
**Predecesores conservados:** PR #27 (omni), #28 (DeepSeek persona), #29 (CUT44), #30 (CUT45), #31 (CUT46), #32 (CUT47). CUT48 es aditivo a CUT47 y no sustituye ninguno.

## Objetivo exacto
Eliminar dos incertidumbres antes del uso real: ¿reproduce audio el dispositivo del propietario y entiende su dictado? ¿puede restaurarse un snapshot fuente sin borrar el código actual? No confundir estos ensayos con un sistema en producción.

## Inventario de fuente y OLD vs NEW
- App/CRM reales siguen protegidos; los sistemas y sesiones de `app.fenixcapital.es`, `fenix-capital-prod`, ANA y CUT30 no cambian.
- Edge Function `cerebro-console-gateway-v0` desplegada en Supabase: versión **33 ACTIVE**; código **OLD** encontrado idéntico byte a byte a la rama GitHub preservada `cerebro/jarvis-omnichannel-interlocutor-lab-20261106`.
- SHA Git blob OLD `index.ts`: `44241c6abc3cb89560500336e332f0628219d0fc`.
- SHA Git blob OLD `knowledge.ts`: `e00bb09ba9a024772f26fbd81159a9e9a584cd42`.
- Código NEW en rama CUT48 incluye saludo formal y comprobación de voz, sin desplegarlo.

## Ensayo aislado de restauración
`scripts/jarvis-cut48-offline-rollback.mjs` (CI Node):
1. Hace `git fetch --depth=1` en **solo lectura** de la rama OLD existente.
2. Extrae los dos archivos OLD con `git show` y comprueba su identificador Git SHA-1 de blob, contra los valores verificados.
3. En dos carpetas temporales del runner, copia NEW, sobrescribe OLD y verifica contenido y SHA.
4. Reaplica NEW desde copia temporal y verifica SHA de ambas versiones.
5. Destruye las carpetas temporales; **no** escribe en el árbol de fuentes, no llama a Supabase ni accede a PROD.
6. Test de `knowledge.ts`: se mantiene idéntico en NEW y OLD. `index.ts` OLD conserva el defecto de saludo; NEW carece del mismo.

**Límite:** este ensayo **NO** verifica restaurar un Edge Function desplegado ni la configuración del proyecto, ni autenticar usuario real, ni desplegar App. Es una prueba más fuerte que disponer únicamente del hash, pero no sustituye el rollback real ensayado en ambiente aislado antes de PROD.

## Comprobación física voluntaria
Nuevo `src/JarvisPhysicalVoiceCheck.tsx`, enlazado desde Operativa/Jarvis y Dock de Neuronal/Navegador:
- Botón **Probar altavoces**: al pulsar, sintetiza localmente una frase breve «A su disposición, señor. Le escucho.» con voz española disponible y `speechSynthesis` del navegador, con velocidad 1,10×. El sonido depende del dispositivo. La ejecución `onend` no implica audibilidad. Solo el propietario puede marcar «Sí, la he oído» o «No, no la he oído».
- Botón **Probar dictado**: al pulsar, inicia `SpeechRecognition`/ `webkitSpeechRecognition`, pide «Jarvis, prueba de voz» y muestra la transcripción. **No la envía al Gateway**, CRM ni DeepSeek.
- La implementación de SpeechRecognition **puede enviar audio al proveedor del navegador**. Se informa antes de pedir dictado, no se afirma privacidad local absoluta. No se crea archivo de audio ni token.
- Se permite cancelar y se cancelan reproducciones/reconocimientos al desmontar o entrar en conversación activa. Los botones quedan deshabilitados durante el envío o la voz de JARVIS.
- **No se reproduce ni se clona la voz dinámica vidIQ**. Se conserva `voice_id` de JARVIS 1 y el preset aprobado «Más clara», 1,10×, +0,6 semitonos, pero este diagnóstico de navegador usa `speechSynthesis` nativo con pitch 0,98, que no es equivalente a la muestra aprobada.
- La única confirmación de salida es un acuse del propietario; no se registra en base de datos.

## Gates
- Estado personalización JARVIS en LAB: CHECKED. Runtime DeepSeek CUT43 sigue aislado y no sirve al Gateway.
- Micrófono físico y altavoz real: **sin ejecutar**; el test Playwright usa voces y reconocedores **simulados**.
- JWT E2E propietario de GitHub Actions: vencido/cerca de vencimiento; prueba real bloqueada.
- Auditoría legal de voz del intérprete, contrato del proveedor, autorización de generación de créditos y límites de coste: pendientes antes de uso de la voz remota.
- Gateway v33 y App/CRM producción: **NO MODIFICADOS**.
- Coste de estos cambios: 0 € en nuevos servicios, 0 llamadas TTS pagadas; consumo Actions no conciliado.

## Runbook y rollback
- Comprobación: CI `JARVIS Always Present Interface LAB CI` en rama `cerebro/jarvis-cut48-physical-voice-rollback-lab-20261106`.
- Restauración de este corte: cerrar PR CUT48 y descartar rama; no existe despliegue de estos cambios.
- Ante autorización futura de PROD: inventario completo de integraciones, snapshot de configuración y fuente de Edge Function, evidencia de comportamiento OLD vs NEW, autenticación de propietario y denegación de anónimos, ensayo real aislado de restauración + validación de App, tribunal, coste, observabilidad y promoción gradual. No realizar sin gates.

## Evidencia
**CI [#42301345097](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42301345097): SUCCESS.** `npm run build` PASS, **61 pruebas Node PASS / 0 FAIL**, **30 pruebas Playwright Chromium PASS / 0 FAIL** (escritorio y móvil), **restauración OLD y re-aplicación NEW de 2 archivos en directorio temporal PASS**. La batería incluyó un ensayo de sintetizador/reconocedor **simulados**, no hardware físico.
El mismo job reportó `JARVIS_OWNER_JWT_FRESHNESS=EXPIRED_OR_NEAR_EXPIRY`; por tanto, la comprobación real de Gateway sigue BLOQUEADA y omitida.
La rama del código probado fue `7fa9e35a181125cc4ce8f31606beec10fbf265ec`; los cambios posteriores son metadatos y documentación. No interpretar «success» de Playwright como prueba de altavoces/micrófono físicos.
