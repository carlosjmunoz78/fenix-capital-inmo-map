# CEREBRO Creative Quality Standard V2

**Fecha:** 2026-10-24  
**Estado:** PREPROD CANDIDATE hasta prueba física y promoción gobernada  
**Owner:** FACT-001  
**Publicación:** siempre `false` en la capacidad creativa  
**Coste incremental por defecto:** 0 €

## Objetivo

Evitar que una pieza sea aprobada por ser técnicamente válida pero creativamente pobre. `MP4 + AAC + resolución correcta` no equivale a un reel, story o vídeo profesional.

## Regla central

`TECH QA + CREATIVE QA + BRAND QA + CHANNEL QA + PHYSICAL MOTION QA`.

Una pieza puede ser técnicamente correcta y aun así ser **RECHAZADA**.

## Rechazos duros

- vídeo basado en diapositivas/texto sin B-roll;
- vídeo con movimiento físico insuficiente;
- una sola fuente visual en un reel o menos de cuatro en vídeo largo;
- menos de dos perfiles de movimiento;
- menos de dos transiciones;
- ausencia de voz, música, ducking o subtítulos cuando el formato audiovisual lo requiere;
- story solicitada como audiovisual pero resuelta como imagen fija;
- carrusel de texto sin diversidad visual;
- ausencia del logo oficial transparente;
- assets externos fuera de dominios Fénix autorizados;
- publicación o gasto adicional desde la capacidad creativa.

## Estándar de vídeo

### Reel / vídeo corto / story vídeo

- mínimo 3 escenas;
- mínimo 2 fuentes visuales reales;
- movimiento real por escena: Ken Burns, pan, push, pull o parallax;
- mínimo 2 transiciones;
- logo oficial transparente integrado;
- voz + música + ducking + subtítulos;
- `scene_text_only_ratio <= 0.34`;
- análisis físico posterior: audio presente, cambios de escena y ratio de frames únicos.

### Vídeo largo

- mínimo 6 escenas;
- mínimo 4 fuentes visuales;
- narrativa estructurada;
- B-roll/fotografía en todas o casi todas las escenas;
- motion design y transiciones;
- voz + música + ducking + subtítulos;
- duración máxima gobernada de 180 s en V2;
- análisis físico posterior obligatorio.

## Estándar de carrusel

- mínimo 4 páginas;
- mínimo 2 fuentes visuales;
- mínimo 3 variantes de layout;
- `text_only_page_ratio <= 0.40`;
- logo oficial y jerarquía visual consistente;
- no se acepta un deck de texto plano.

## Branding Fénix

Asset canónico transparente detectado en la biblioteca oficial:

`https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png`

La V2 solo permite assets visuales servidos desde dominios Fénix autorizados y conserva trazabilidad de las fuentes.

## Renderer V2

`cerebro/runtime/creative-job-runner-v2.mjs`

Capacidades:

- composición fotográfica multi-asset;
- logo PNG transparente;
- layouts con capas y gradientes;
- movimiento real FFmpeg;
- transiciones xfade;
- voz neural local Piper;
- música procedural local;
- ducking automático bajo voz;
- subtítulos ASS;
- análisis físico de audio y movimiento;
- fallo cerrado por `CREATIVE_QUALITY_TRIBUNAL_V2`;
- rollback al runtime V1.

## Criterio de promoción

No promover a PROD hasta que:

1. tests contractuales GREEN;
2. showcase físico de 7 piezas GREEN;
3. los vídeos superen análisis físico de movimiento y audio;
4. tribunal de promoción global GREEN;
5. rollback V1 permanezca disponible;
6. no exista autoridad de publicación;
7. coste adicional medido = 0 €.

## HUMAN_REQUIRED

Solo si aparece una excepción real de las políticas del proyecto. La preferencia creativa subjetiva de Carlos se incorpora como feedback al estándar, pero no bloquea automáticamente la infraestructura si los gates físicos y de seguridad siguen verdes.
