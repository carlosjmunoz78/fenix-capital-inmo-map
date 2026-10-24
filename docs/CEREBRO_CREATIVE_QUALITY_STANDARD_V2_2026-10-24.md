# CEREBRO Creative Quality Standard V2

**Fecha:** 2026-10-24  
**Estado:** PREPROD CANDIDATE hasta revisión visual humana, tribunal completo y promoción gobernada  
**Owner:** FACT-001  
**Publicación:** siempre `false` en la capacidad creativa  
**Coste incremental por defecto:** 0 €

## Objetivo

Evitar que una pieza sea aprobada por ser técnicamente válida pero creativamente pobre. `MP4 + AAC + resolución correcta` no equivale a un reel, story o vídeo profesional.

## Regla central

`TECH QA + CREATIVE QA + BRAND QA + CHANNEL QA + PHYSICAL MOTION QA + LIVE_ACTION QA + HUMAN VISUAL REVIEW`.

Una pieza puede ser técnicamente correcta y aun así ser **RECHAZADA**.

## Separación OLD vs NEW

### OLD · `creative-job-runner-v2.mjs`

Se conserva por compatibilidad y rollback. Su vídeo basado en fotografía animada se clasifica exclusivamente como:

`PHOTO_MOTION_COMPATIBILITY_ONLY`

Puede usar fotografía, pan, zoom, Ken Burns, parallax, voz, música y subtítulos, pero **no puede declararse `LIVE_ACTION_MIXED` ni superar el gate de vídeo completo sin B-roll gobernado**.

### NEW · `creative-job-runner-v2-live.mjs`

Es el candidato V2 para story, reel y vídeo completo. Combina:

- metraje live-action real;
- fotografía Fénix;
- múltiples layouts editoriales;
- overlays/motion graphics;
- transiciones;
- logo oficial PNG integrado en transparencia;
- voz neural local Piper;
- música procedural FFmpeg;
- ducking de música bajo voz;
- subtítulos;
- análisis físico de movimiento, audio y proporción de live-action;
- procedencia/licencia de cada fuente de vídeo.

## Rechazos duros

- vídeo basado solo en diapositivas/texto cuando el brief exige vídeo completo;
- `PHOTO_MOTION` presentado como `LIVE_ACTION_MIXED`;
- frames distintos producidos solo por Ken Burns usados como prueba suficiente de vídeo profesional;
- metraje remoto fuera del registro de fuentes gobernadas;
- proporción de live-action inferior al mínimo físico;
- vídeo con movimiento físico insuficiente;
- menos de dos perfiles de movimiento o menos de dos transiciones;
- ausencia de voz, música, ducking o subtítulos cuando el formato audiovisual lo requiere;
- story solicitada como audiovisual pero resuelta como imagen fija;
- carrusel de texto sin diversidad visual/layout;
- logo oficial no integrado en transparencia;
- publicación o gasto adicional desde la capacidad creativa.

## Estándar de live-action

### Reel / vídeo corto / story vídeo

- mínimo 3 escenas;
- mínimo 2 fuentes live-action gobernadas;
- mínimo 2 escenas con vídeo real;
- ratio físico live-action `>= 0.35`;
- fotografía complementaria permitida;
- mínimo 2 transiciones;
- logo oficial transparente sin pastilla/fondo artificial;
- voz + música + ducking + subtítulos;
- `scene_text_only_ratio <= 0.34`;
- análisis físico posterior: audio, frames, cambios de escena y fuentes live-action usadas.

### Vídeo largo

- mínimo 6 escenas;
- mínimo 3 fuentes live-action gobernadas;
- mínimo 3 escenas con vídeo real;
- ratio físico live-action `>= 0.30`;
- narrativa estructurada y mezcla real de B-roll/fotografía/motion graphics;
- voz + música + ducking + subtítulos;
- duración máxima gobernada de 180 s en V2;
- análisis físico posterior obligatorio.

## Fuentes live-action gobernadas

Registry:

`cerebro/runtime/creative-media-sources-v2.mjs`

Reglas:

- no se aceptan URLs arbitrarias en los jobs;
- cada fuente se referencia por ID gobernado;
- se conserva proveedor, asset ID, licencia, fecha de comprobación, permiso comercial/modificación y prohibición de sugerir endorsement;
- Pexels se usa únicamente bajo su licencia vigente comprobada y con coste incremental 0 €;
- el vídeo corporativo propio de Fénix permanece registrado, pero se marca como material con texto incrustado y no se considera por sí solo suficiente para el showcase profesional.

## Estándar de carrusel

- mínimo 4 páginas;
- mínimo 2 fuentes visuales;
- mínimo 3 variantes de layout;
- `text_only_page_ratio <= 0.40`;
- logo oficial y jerarquía visual consistente;
- no se acepta un deck de texto plano.

## Branding Fénix

Asset canónico:

`https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png`

En V2 Live el logo debe integrarse directamente sobre la composición con transparencia y sombra de legibilidad cuando proceda. **No se acepta una pastilla blanca añadida por el renderer.**

## Gates físicos

Workflow full-video:

`CEREBRO Creative Quality V2 Live`

Debe probar:

1. tests contractuales;
2. integración transparente del logo;
3. 7 piezas físicas;
4. audio/voz/música/ducking/subtítulos;
5. proporción y diversidad live-action;
6. procedencia/licencia;
7. extracción de frames para revisión visual humana;
8. paquete de evidencia.

Workflow compatibility:

`CEREBRO Creative Quality V2`

Conserva el OLD como `PHOTO_MOTION_COMPATIBILITY_ONLY` y prueba expresamente que no puede hacerse pasar por live-action.

## Criterio de promoción

No promover a PROD hasta que:

1. OLD compatibility gate GREEN;
2. NEW live-action gate GREEN;
3. showcase físico de 7 piezas GREEN;
4. revisión visual humana confirme que story/reel/vídeo largo contienen vídeo real y no aspecto de diapositivas;
5. revisión visual confirme logo transparente sin pastilla blanca;
6. tribunal de promoción global GREEN;
7. rama reconciliada con el `main` vivo;
8. rollback V1 permanezca disponible;
9. no exista autoridad de publicación;
10. coste adicional medido = 0 €.

## Estado de autonomía

La infraestructura puede automatizar la producción y QA técnico. **La promoción inicial de este estándar V2 exige evidencia visual humana explícita** por el fallo de calidad detectado en el showcase anterior. Una vez certificado el estándar, el tribunal puede rechazar automáticamente regresiones conocidas.
