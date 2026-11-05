# ZEUS / JARVIS · B5 VOICE-001 · CORTE 02 · 2026-11-05

**Estado: PARCIAL · LAB CONTRACT GREEN · PROD NO_GO.** PR #24 [borrador] sobre PR #20 [borrador]. No fusionar ni activar por disponer de pruebas unitarias.

## Qué se ha creado
1. `jarvis-b5-v2-tts-output-port.mjs`: puerto server-only de voz clonada aprobada con B2, B3, consentimiento, privacidad, auditoría, rate limit, créditos prepagados verificables y almacén privado de bytes. Bloqueado por defecto; rechaza PROD.
2. `jarvis-b5-v2-voice-http-lab.mjs`: rutas candidatas `POST /voice/v2/synthesize` y `POST /voice/v2/audio` bajo el **Gateway existente**; token sólo por cabecera de autorización; CORS exacto; sin URLs públicas ni secretos. **NO MONTADAS/NO DESPLEGADAS**.
3. `src/jarvisV2AudioDeliveryLab.ts`: reproducción privada en navegador, pausa, reanudación, STOP y revocación de ObjectURL. Sin modificar el loop de voz existente ni la identidad de ANA.
4. Suites adversarias nuevas `*.test.mjs`: rechazo cruzado empresa/sesión, tokens, roles falsos, permisos, privacidad, presupuesto, voz/pitch/velocidad erróneos, fuga a URL pública, error de entrega, CORS y reproducción.
5. Se corrigió un fallo detectado por CI que permitía representar una referencia de audio con formato de URL externa. Los identificadores privados ahora lo rechazan.

## Qué NO se ha hecho
- No se ha llamado al proveedor de voz vidIQ ni gastado nuevos créditos de voz.
- No se ha exportado el modelo de clonación (sigue alojado en vidIQ).
- No hay API real de síntesis del proveedor integrada en CEREBRO.
- No se han creado endpoints en Supabase ni conectado la interfaz a un backend real de audio.
- No se ha probado micrófono/reproducción con JARVIS V2 en dos dispositivos reales.
- No se ha modificado `src/cerebroVoice.ts`, ANA, App, CRM, Supabase, main, DNS, WordPress, Trading o motores ajenos.
- Las funciones de voz encontradas en Supabase son previas; su estado ACTIVE no acredita síntesis JARVIS V2.

## QA y evidencias
Código probado SHA `73129b3426b2d8373b2ae8fa0ed90b022aaecfd2`:
- JARVIS Universal Core LAB: **588 PASS, 0 FAIL**, https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42085148181
- ZEUS JARVIS B7 Logical Multiagent LAB: **SUCCESS**, https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42085147919
- CEREBRO Governed Main Integration V0: **SUCCESS (PROD DEPLOY SKIPPED)**, https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42085147860

## Decisión de producto y preservación
- JARVIS V2 · «Más clara» · **1,10×** · **+0,6 semitonos** en las superficies CEREBRO.
- La V1 original tiene respaldo de audio en Drive y Biblioteca, y el identificador del clon sigue disponible en el proveedor.
- ANA permanece exclusivamente en las pantallas de App Fénix Capital externas a /cerebro.
- El B5 heredado exige `LOCAL` en su speech port. NO falsificar `provider='LOCAL'` para usar un clon remoto: el puerto V2 conserva su verdad de proveedor bajo control y auditoría.

## Bloqueos y continuación sin rediseño
1. Dar de alta acceso al MCP de vidIQ desde el runtime central de CEREBRO con identidad y secreto en Vault. **No colocar clave en código, chat o logs**. El conector ChatGPT NO equivale a un proveedor disponible en la App.
2. Desarrollar adaptador seguro de generación asíncrona y captura del MP3, sin usar enlace temporal como respuesta al cliente.
3. Aplicar efectivamente el preset V2 al audio generado, comprobar duración, calidad, timbre y límites de coste por llamada.
4. Conectar la ruta del Gateway existente con B2/B3 y almacenamiento temporal privado; **flag OFF hasta éxito E2E**.
5. Integrar este cliente con el loop de voz en `CerebroConsoleShell.tsx` y `CerebroOperativeConsole.tsx`; pasar interrupciones y UX en Chrome/Android/PC, regresión ANA y OLD vs NEW.
6. Solo después: tribunal, recovery y gate B10 de promoción.

## Rollback
Cerrar PR #24 sin fusionar. No cambiar `main`, PR #20 y predecesoras, Supabase PROD, ANA ni App Fénix. El nuevo código no tiene proceso ni endpoint activo que necesite apagarse.

`next_block=B5_CUT03_PROVIDER_AND_GATEWAY_ACTUAL_LAB_E2E`
