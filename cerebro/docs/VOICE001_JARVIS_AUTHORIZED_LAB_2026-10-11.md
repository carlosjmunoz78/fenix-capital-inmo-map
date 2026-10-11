# VOICE-001 · JARVIS AUTHORIZED LAB · 2026-10-11

## Estado
- `HECHO`: fuente canónica JARVIS identificada y segmentada por hablante.
- `HECHO`: corte JARVIS aislado por timestamps.
- `HECHO`: MP3 y WAV temporales generados por vidIQ.
- `PARCIAL`: los assets de audio de vidIQ usan URL firmada temporal; pueden regenerarse determinísticamente.
- `PARCIAL`: clonación iniciada en LAB; primer intento bloqueado por requisito mínimo de 60 s y reembolsado.
- `EN CURSO`: nuevo intento con referencia larga del mismo actor.
- `PROD`: `false`.

## Objetivo
Construir y evaluar una candidata de voz CEREBRO a partir de una referencia autorizada de la voz castellana de J.A.R.V.I.S. usada como objetivo por el propietario. Todo el trabajo queda restringido a LAB y no sustituye ninguna voz existente hasta evaluación física.

## Fuente canónica de extracción JARVIS
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

## Pipeline Seed-VC existente
Existe pipeline LAB basado en Seed-VC V2:
- `CEREBRO_VOICE_AUTHORIZED_CLONE_PIPELINE_V1_1.zip`
- source preparada: `input/source_es.wav`

No promocionar nada a PROD automáticamente.

## Ruta vidIQ de clonación
vidIQ dispone de clonación desde YouTube (`vidiq_voiceover_clone_start`) y generación posterior (`vidiq_voiceover_generate`).

### Intento V0 · muestra corta
Fuente:
- `https://www.youtube.com/watch?v=2DXe0h8TnYA`
- `Doblaje: muestra de voz de Víctor Iturrioz.`
- duración efectiva recibida por clonador: `24.1 s`

Job:
- `job_a6295434-7e06-4b99-9004-79ae0a143a9e`

Resultado:
- `REFUNDED_FAILED_MIN_DURATION`
- requisito físico descubierto: el clonador necesita al menos `60 s` de audio.
- créditos: reembolsados.

### Referencia larga V1 · actor único/dominante
Fuente encontrada:
- `https://www.youtube.com/watch?v=Ij4opmtUr8k`
- título: `Operaciones especiales de la Segunda Guerra Mundial (Audiolibro)`
- narrador declarado en la fuente: Víctor Iturrioz
- duración vídeo: ~`5m25s`
- idioma: castellano

La transcripción confirma una breve introducción promocional seguida de un fragmento largo de narración del audiolibro. La voz del narrador domina ampliamente el vídeo; se usa para capturar timbre. La prosodia JARVIS se valida SIEMPRE contra el corte canónico de película de 3.785 s.

Intento de clonación V1 iniciado:
- nombre: `CEREBRO_JARVIS_ES_AUTHORIZED_V1`
- job: `job_572f8c56-3598-46ce-98ef-8588a26f2c02`
- estado al registrar: `IN_PROGRESS`

## Dataset de prosodia JARVIS adicional
Se inició análisis de un clip castellano más largo para localizar intervalos limpios JARVIS-only:
- URL: `https://www.youtube.com/watch?v=MzSKfXG6MXE`
- título: `Tony Stark creando cosas | Parte 1 | escenas en CASTELLANO HD`
- job análisis: `job_9b1adac5-506a-45f5-84e2-a6be4db117cb`
- objetivo: ampliar el banco de prosodia/timbre de JARVIS con segmentos limpios y evitar depender de una única frase.

## Criterio de aceptación
La candidata no se acepta por parecido superficial. Debe cumplir:
- español de España inequívoco;
- timbre claramente más cercano a la referencia canónica que ESM05/06/07;
- dicción limpia;
- sin reverb artificial añadida;
- sin artefacto metálico dominante;
- prosodia compatible con el JARVIS castellano canónico;
- revisión física del propietario;
- `automatic_promotion=false`.

## Reglas de continuidad
- conservar la fuente canónica y sus timestamps;
- no usar ESM07 procesada como falso sustituto de JARVIS;
- no declarar clonación conseguida sin una generación nueva reproducible;
- documentar cada candidato, motor, parámetros, job y resultado;
- mantener `company_id`, `engine_id`, `environment`, `version`;
- conservar rollback y voces KEEP;
- si el chat se satura, retomar desde esta rama y este STATE, nunca desde memoria informal.
