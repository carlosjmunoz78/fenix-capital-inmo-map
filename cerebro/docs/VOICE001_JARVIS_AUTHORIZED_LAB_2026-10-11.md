# VOICE-001 · JARVIS AUTHORIZED LAB · 2026-10-11

## Estado
- `HECHO`: fuente canónica JARVIS identificada y segmentada por hablante.
- `HECHO`: corte JARVIS aislado por timestamps.
- `HECHO`: MP3 y WAV temporales generados por vidIQ.
- `HECHO`: clon LAB V1 creado y guardado en la librería de voces vidIQ.
- `HECHO`: primera frase nueva sintetizada con el clon.
- `HECHO`: 73 s adicionales de JARVIS limpio localizados por timestamps para futuras mejoras de prosodia.
- `POR AUDITAR`: escucha física del propietario de TEST01.
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
Jobs:
- análisis audiovisual: `job_e8cc2662-f793-4143-aac9-0ffd4ba498c3`
- extracción MP3 JARVIS: `job_dce92c7d-99a0-44a7-99fd-8fc6efbd510d`
- extracción WAV JARVIS: `job_f5123074-3e0c-4bd8-b6df-8cadadc18d87`

Características:
- duración: ~3.785 s
- MP3: 192 kbps, 44.1 kHz, mono
- WAV: 44.1 kHz, mono

## Regeneración determinista de referencia canónica
Si la URL firmada expira:

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

## Voces KEEP que NO se sustituyen
- `VOICE001_ESM05_CEREBRO_Executive_Cinematic_V1.mp3`
- `VOICE001_ESM06_Suave_Ejecutiva_es_ES.mp3`
- `VOICE001_ESM07_Asistente_Tecnico_Cinematico_es_ES.mp3`
- `CEREBRO_VOICE_A_TECHNICAL_DRY.mp3`
- `CEREBRO_VOICE_B_EXECUTIVE_DRY.mp3`
- `CEREBRO_VOICE_C_BALANCED_DRY.mp3`

## Pipeline Seed-VC existente
- `CEREBRO_VOICE_AUTHORIZED_CLONE_PIPELINE_V1_1.zip`
- source: `input/source_es.wav`

Sigue siendo una ruta LAB alternativa; no se ha promovido a PROD.

## Ruta vidIQ de clonación

### Intento V0 · muestra corta
- fuente: `https://www.youtube.com/watch?v=2DXe0h8TnYA`
- duración efectiva: `24.1 s`
- job: `job_a6295434-7e06-4b99-9004-79ae0a143a9e`
- resultado: `REFUNDED_FAILED_MIN_DURATION`
- requisito descubierto: mínimo `60 s`.

### V1 · referencia larga del actor
Fuente:
- `https://www.youtube.com/watch?v=Ij4opmtUr8k`
- título: `Operaciones especiales de la Segunda Guerra Mundial (Audiolibro)`
- narrador declarado: Víctor Iturrioz
- duración vídeo: ~`5m25s`
- castellano

La transcripción muestra una breve introducción promocional seguida de un fragmento largo del audiolibro. La voz del narrador domina ampliamente el vídeo; se utiliza como base de timbre. La prosodia JARVIS se valida contra las escenas canónicas de película.

Clonación:
- job: `job_572f8c56-3598-46ce-98ef-8588a26f2c02`
- resultado: `COMPLETED`
- nombre persistente en librería: `CEREBRO_JARVIS_ES_AUTHORIZED_V1`
- `voiceId`: `QGH6KSAXelJsYC43E5xG`
- librería verificada con `vidiq_voiceover_list_voices`: `isCustom=true`.

## TEST01 · primera generación nueva
Script:

> Señor, CEREBRO está operativo. He revisado los sistemas y no he detectado ninguna incidencia crítica. Todas las funciones están preparadas. Puedo continuar cuando lo indique.

Evidencia:
- generation job: `job_47e21c2a-010d-4fae-9346-40132470b285`
- voiceoverId: `2b2fbd2e-5ac4-4acf-8aa6-1812f35a6e29`
- duración: ~`9.718 s`
- caracteres: `174`
- estado: `HECHO_POR_AUDITAR_OWNER`

El URL MP3 de esta generación es firmado/temporal. Puede regenerarse con el mismo `voiceId` y script si expira.

## Dataset adicional de prosodia JARVIS
Fuente:
- `https://www.youtube.com/watch?v=MzSKfXG6MXE`
- título: `Tony Stark creando cosas | Parte 1 | escenas en CASTELLANO HD`
- análisis job: `job_9b1adac5-506a-45f5-84e2-a6be4db117cb`

vidIQ localizó `17` intervalos JARVIS-only, aproximadamente `73 s` limpios en total:

```text
00:05-00:07
00:12-00:15
00:21-00:24
01:43-01:50
02:00-02:03
02:18-02:20
02:35-02:37
02:40-02:42
02:47-02:50
02:53-02:54
02:57-03:02
03:10-03:22
03:35-03:39
03:44-03:54
04:01-04:08
04:09-04:12
04:18-04:22
```

Este dataset se reserva para mejorar prosodia/timbre si TEST01 no alcanza el parecido requerido.

## Criterio de aceptación
- español de España inequívoco;
- timbre claramente cercano a referencia canónica;
- dicción limpia;
- sin reverb artificial añadida;
- sin artefacto metálico dominante;
- prosodia compatible con JARVIS castellano;
- revisión física del propietario;
- `automatic_promotion=false`.

## Continuidad
La fuente de verdad para retomar es:
1. esta documentación;
2. `cerebro/state/VOICE001_JARVIS_AUTHORIZED_LAB_STATE_2026-10-11.json`;
3. rama `cerebro/voice001-jarvis-authorized-lab-20261011`.

No reconstruir por memoria informal. No mezclar con PR #572 ni con su rama anterior. No tocar `main` ni PROD sin gates.
