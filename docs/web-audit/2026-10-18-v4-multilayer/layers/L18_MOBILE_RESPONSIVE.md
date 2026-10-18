# L18 · Mobile & Responsive

**Owner:** WEB-001 + WAUD-001 · **Auditoría:** HECHO · **Resultado:** PARCIAL

## Hallazgos
- 204/204 documentos incluyen viewport y CSS responsive/media queries.
- 516 usos de imagen renderizada carecen de width/height explícitos.
- No existe visual regression multi-dispositivo dentro del baseline.

## Acciones
- QA 320/360/390/768/1024/1440 px y navegación touch.
- Corregir dimensiones/aspect-ratio y revisar formularios/CTAs en móvil.
- Medir CWV móvil por separado.

## V5 · `MOBILE_SECTION_ORDER_GATE`

Regla explícita Fénix: cuando una sección tenga un heading y una imagen que ilustra ese bloque, el orden móvil objetivo es:

`H2/H3 → IMAGEN ASOCIADA → TEXTO/CONTENIDO → CTA (si aplica)`

### Criterios de aceptación

- la imagen asociada no aparece antes del heading al que pertenece;
- layouts desktop de dos columnas se reordenan expresamente al apilarse en móvil;
- preferir DOM semántico correcto; usar `order` CSS solo si no degrada el orden de lectura, teclado o lector de pantalla;
- mantener proximidad visual y espaciado coherente entre heading e imagen;
- alt/contexto de la imagen coherentes con el bloque;
- aspect-ratio/dimensiones definidas para evitar CLS;
- CTA queda después del contenido salvo hero o patrón justificado.

### Excepciones

Hero, logos, iconos, avatares, imágenes de fondo o decoración no se consideran automáticamente “imagen principal de sección”. Toda excepción debe ser intencional y verificable.

Este gate se prueba por template/arquetipo y con visual regression en 320/360/390/768 px antes de PROD.