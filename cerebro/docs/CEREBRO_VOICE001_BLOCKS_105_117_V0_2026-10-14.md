# CEREBRO OS · VOICE-001 · Bloques 105–117 V0

**Fecha:** 2026-10-14  
**Motor canónico:** `VOICE-001`  
**Ámbito:** `PREPROD`  
**Estado:** implementación aditiva de simulación; telefonía real desactivada.

## HECHO en este cambio

Se añade una capa de comportamiento para los bloques 105–117 sin sustituir la voz ya existente en App/CEREBRO. El registro canónico ya contiene `VOICE-001`; por tanto, este bloque añade capacidades al mismo motor y no crea trece motores nuevos.

La implementación vive en `cerebro/voice/voice001-outreach-runtime-v0.mjs` y conserva cuatro invariantes: multiempresa (`company_id`, `engine_id`, `environment`, `version`), PREPROD exacto, coste adicional 0 € y ausencia de side effects externos.

## Mapeo 105–117

| Bloque | Capacidad | Estado V0 |
|---|---|---|
| 105 | LiveKit Agents | seam opcional de simulación; no live-bound |
| 106 | Pipecat | seam opcional de simulación; no live-bound |
| 107 | faster-whisper | referencia STT local |
| 108 | Piper TTS | referencia TTS local |
| 109 | Retell | `HOLD_COMMERCIAL` |
| 110 | Dapta | `HOLD_COMMERCIAL` |
| 111 | Lead Rescue | plan de simulación |
| 112 | Inbound Qualification Calling | plan de simulación |
| 113 | Outbound Qualification Calling | plan de simulación |
| 114 | Voice Follow-Up | plan de simulación |
| 115 | Voice Objection Handling | plan de simulación |
| 116 | Property Voice Closer | plan de simulación |
| 117 | Financial Voice Closer | plan de simulación |

## Dependencias

VOICE-001 reutiliza `SALE-001` y `COM-001`; no duplica lógica comercial ni crea un transporte paralelo. Según el escenario también referencia `LEAD-001`, `NBA-001`, `C360-001`, `PROP-001` o `BNK-001`. La futura ejecución durable debe pasar por `JOB-001` antes de cualquier side effect real.

## Guardrails

- Telefonía real: OFF.
- Grabación: OFF.
- Escritura CRM: OFF.
- Dispatch de COM-001: OFF desde este runtime.
- Retell/Dapta: HOLD comercial.
- Consentimiento/opt-out: fail-closed.
- Cross-company: deny.
- PII, credenciales, audio bruto y transcripción bruta: prohibidos en estado/telemetría.
- HUMAN_REQUIRED: únicamente razones canónicas.
- PROD: rechazado por el runtime.
- Trading: sin acceso.

El runtime genera planes deterministas, no llama a LiveKit/Pipecat/faster-whisper/Piper ni ejecuta procesos del sistema. De este modo se prueba contrato y routing sin introducir dependencias, credenciales o gasto.

## Runbook PREPROD

1. Construir una solicitud con `context.company_id`, `engine_id=VOICE-001`, `environment=PREPROD`, `version`, `request_id`, escenario, dirección y consentimiento.
2. Ejecutar `evaluateVoiceGate()`; cualquier conflicto termina fail-closed.
3. Ejecutar `routeVoiceScenario()` para obtener un plan sin side effects.
4. Para simulación local, `buildLocalAudioPipeline()` devuelve la configuración de referencia faster-whisper/Piper sin ejecutarlos.
5. Usar `createVoiceExecutionLedger()` para idempotencia del proceso de simulación; una futura ejecución durable debe delegarse a `JOB-001`.
6. Emitir únicamente telemetría metadata/hash mediante `buildVoiceTelemetry()`.

## Backup, rollback y rebuild

No existe migración de datos ni efecto externo en V0. Backup = historial Git de la rama/commit. Rollback = revertir el commit/PR del bloque. Rebuild = recuperar el registro canónico, `voice001-outreach-profile.v0.json` y `voice001-outreach-runtime-v0.mjs`, y ejecutar el workflow dedicado.

## Autonomía

`VOICE-001` para calling/outreach queda como `PREPROD_CODE_TESTED_NOT_LIVE_CONNECTED` únicamente cuando CI focalizado + regresión completa estén verdes. Incluso entonces no autoriza telefonía, CRM, grabación ni PROD. La promoción futura exige evaluación, tribunal, compliance/consentimiento, adaptador de telefonía validado, observabilidad y rollback probado.
