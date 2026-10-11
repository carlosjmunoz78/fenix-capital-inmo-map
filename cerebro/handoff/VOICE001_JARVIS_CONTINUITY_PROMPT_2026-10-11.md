# PROMPT EXACTO · CONTINUIDAD VOICE-001 · JARVIS · 2026-10-11

Lee primero:
1. `cerebro/docs/VOICE001_JARVIS_AUTHORIZED_LAB_2026-10-11.md`
2. `cerebro/state/VOICE001_JARVIS_AUTHORIZED_LAB_STATE_2026-10-11.json`

No reconstruyas el trabajo por memoria. Continúa desde `next_actions` del STATE.

## Objetivo
Crear y validar la voz CEREBRO basada en la referencia autorizada del JARVIS castellano objetivo, manteniendo todo en LAB y conservando todas las voces KEEP.

## Estado cerrado
- fuente canónica JARVIS: `https://www.youtube.com/watch?v=hRtc0N4TxCA`
- JARVIS limpio: `00:04.00–00:07.75`
- extracción MP3 job: `job_dce92c7d-99a0-44a7-99fd-8fc6efbd510d`
- extracción WAV job: `job_f5123074-3e0c-4bd8-b6df-8cadadc18d87`
- clon LAB persistente: `CEREBRO_JARVIS_ES_AUTHORIZED_V1`
- voiceId persistente vidIQ: `QGH6KSAXelJsYC43E5xG`
- clone job exitoso: `job_572f8c56-3598-46ce-98ef-8588a26f2c02`
- primera generación TEST01: `job_47e21c2a-010d-4fae-9346-40132470b285`
- voiceoverId TEST01: `2b2fbd2e-5ac4-4acf-8aa6-1812f35a6e29`
- TEST01 todavía requiere escucha física del propietario.

## Dataset adicional
Existe un mapa de 17 cortes JARVIS-only (~73 s) en:
`https://www.youtube.com/watch?v=MzSKfXG6MXE`
Análisis job: `job_9b1adac5-506a-45f5-84e2-a6be4db117cb`.
Los timestamps están en la documentación y STATE.

## Regla de decisión inmediata
Primero presenta/recupera TEST01 para que el propietario lo escuche. Si el propietario dice que el timbre ya está cerca, afina prosodia/ritmo sin destruir la identidad clonada. Si dice que sigue lejos, usa el dataset JARVIS-only de 73 s para construir una referencia más específica antes de generar la siguiente candidata.

## Prohibiciones
- NO volver a usar ESM07 con filtros como sustituto de JARVIS.
- NO borrar ESM05/06/07 ni A/B/C.
- NO afirmar que una candidata está aceptada antes de escucha física.
- NO tocar PROD.
- NO mezclar con la rama o PR #572.
- NO volver a buscar desde cero la escena canónica.

## Gate de cierre
Solo cerrar V1 cuando exista:
- candidata reproducible;
- evaluación física del propietario;
- evidencia y parámetros documentados;
- rollback a todas las voces KEEP;
- `automatic_promotion=false` hasta promoción explícita.
