# VOICE-001 · JARVIS AUTHORIZED LAB · 2026-10-11

## Estado
- `HECHO`: fuente correcta identificada y segmentada por hablante.
- `HECHO`: corte JARVIS aislado por timestamps.
- `HECHO`: MP3 y WAV temporales generados por vidIQ.
- `PARCIAL`: el asset de audio vive actualmente en URL firmada temporal de vidIQ; debe poder regenerarse desde la fuente y timestamps documentados.
- `PLANIFICADO`: clonación/voice conversion en LAB.
- `PROD`: `false`.

## Objetivo
Construir una voz CEREBRO a partir de una referencia autorizada de la voz castellana de J.A.R.V.I.S. usada como objetivo por el propietario. Todo el trabajo queda restringido a LAB y no sustituye ninguna voz existente hasta evaluación física.

## Fuente canónica de extracción
- YouTube: `https://www.youtube.com/watch?v=hRtc0N4TxCA`
- Título: `Iron Man - "A veces hay que correr antes que gatear"`
- Duración observada: ~12 s.

## Mapeo de hablantes verificado
- `00:00.00–00:03.95` → Tony Stark.
- `00:04.05–00:07.75` → J.A.R.V.I.S.
- `00:07.80–00:11.80` → Tony Stark.

Corte JARVIS recomendado: `00:04.00–00:07.75`.

## Evidencia de extracción
vidIQ confirmó el tramo JARVIS como segmento limpio sin solape de Tony Stark.

Jobs relevantes:
- análisis audiovisual: `job_e8cc2662-f793-4143-aac9-0ffd4ba498c3`
- extracción MP3 JARVIS final: `job_dce92c7d-99a0-44a7-99fd-8fc6efbd510d`
- extracción WAV JARVIS final: `job_f5123074-3e0c-4bd8-b6df-8cadadc18d87`

Características del corte final:
- duración: ~3.785 s
- MP3: 192 kbps, 44.1 kHz, mono
- WAV: 44.1 kHz, mono

## Regeneración determinista
Si las URLs firmadas expiran, NO buscar otra escena ni rehacer investigación. Regenerar desde la misma URL de YouTube con:

```text
op=extract_audio
sourceUrl=https://www.youtube.com/watch?v=hRtc0N4TxCA
startSeconds=4.00
endSeconds=7.75
outputFormat=mp3 / wav
bitrateKbps=192 (MP3)
sampleRateHz=44100
channels=1
```

## Referencias existentes a preservar
No borrar ni sustituir:
- `VOICE001_ESM05_CEREBRO_Executive_Cinematic_V1.mp3`
- `VOICE001_ESM06_Suave_Ejecutiva_es_ES.mp3`
- `VOICE001_ESM07_Asistente_Tecnico_Cinematico_es_ES.mp3`
- `CEREBRO_VOICE_A_TECHNICAL_DRY.mp3`
- `CEREBRO_VOICE_B_EXECUTIVE_DRY.mp3`
- `CEREBRO_VOICE_C_BALANCED_DRY.mp3`

## Pipeline de clonación ya definido
Existe un pipeline LAB basado en Seed-VC V2:
- `CEREBRO_VOICE_AUTHORIZED_CLONE_PIPELINE_V1_1.zip`
- source preparada: `input/source_es.wav`

No promocionar nada a PROD automáticamente.

## Nueva vía adicional encontrada
vidIQ dispone de clonación desde YouTube (`vidiq_voiceover_clone_start`). Para evitar contaminación de hablantes, no usar el clip de 12 s directamente porque contiene Tony + JARVIS. Se ha localizado además una muestra pública de un solo hablante:
- `https://www.youtube.com/watch?v=2DXe0h8TnYA`
- título: `Doblaje: muestra de voz de Víctor Iturrioz.`
- duración: ~25 s

Esta muestra debe tratarse como referencia auxiliar para capturar timbre del actor; la prosodia JARVIS debe seguir validándose contra el corte canónico de la película.

## Criterio de aceptación
La candidata no se acepta por parecido subjetivo superficial. Debe cumplir:
- español de España inequívoco;
- timbre claramente más cercano a la referencia canónica que ESM05/06/07;
- dicción limpia;
- sin reverb artificial añadida;
- sin artefacto metálico dominante;
- revisión física del propietario;
- `automatic_promotion=false`.

## Reglas de continuidad
- no volver a buscar otra escena salvo que la fuente canónica desaparezca;
- no usar ESM07 procesada como falso sustituto de JARVIS;
- no declarar clonación conseguida sin una generación nueva reproducible;
- documentar cada candidato, motor, parámetros y resultado;
- mantener `company_id`, `engine_id`, `environment`, `version` en cualquier integración futura;
- conservar rollback y voces KEEP.
