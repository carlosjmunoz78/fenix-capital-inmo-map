# SEO001 · STAGING VISUAL CANON · MONTORO V1

Estado: DEFINIDO / PREPROD ONLY
Fecha: 2026-10-05
Referencia física: `https://staging.fenixcapital.es/asesor-hipotecario-montoro/` · WP page `49115`.

## Decisión

Montoro se adopta como referencia visual canónica para las landings SEO/locales de Fénix Capital. No se exige que todas las páginas tengan el mismo contenido ni la misma secuencia exacta, pero sí una familia visual reconocible y coherente.

STAGING permanece `noindex` por diseño. `noindex` no es defecto, pendiente ni criterio de fallo visual/runtime.

## Desktop

- Contenido principal contenido/compacto, nunca abierto a ancho total.
- Ancho canónico objetivo: `max-width: 1120px` con margen automático.
- Gutters mínimos: 32–40 px en escritorio/tablet.
- Hero y módulos principales contenidos dentro del ancho canónico, con esquinas redondeadas.
- Ritmo vertical amplio pero no disperso.

## Hero

- Tratamiento de referencia: imagen protagonista + overlay/gradiente oscuro + H1/CTA legibles.
- Imagen en `object-fit: cover`.
- Encuadre inicial de referencia: `object-position: center 42%`, ajustable por imagen cuando el sujeto lo requiera.
- Evitar recortes que corten cara, manos, llaves o elemento protagonista.
- Fuente preferida para hero: imagen horizontal cercana a 16:9; no forzar 4:3 si destruye el encuadre.
- Radio visual objetivo: 16–20 px en el contenedor hero.

## Cuerpo

- Alternancia coherente de superficies blanco / crema / oscuro Fénix.
- Tarjetas y splits con radios 16–20 px.
- Imágenes de bloques con `object-fit: cover`, encuadre revisado y altura controlada.
- CTA claros, consistentes y con contraste WCAG razonable.
- Mantener paleta Fénix: `#870064`, `#FFB71B`, `#FF5F00`, `#222222`, blanco/crema.
- Tipografía limpia y legible; no abrir bloques a todo el viewport.

## Responsive

- Tablet: máximo 40 px de gutter; splits pueden mantenerse a dos columnas si no comprometen lectura.
- Móvil: una columna; gutter aproximado 22 px; botones principales a ancho disponible; orden de imagen/texto lógico; sin overflow horizontal.
- `prefers-reduced-motion` debe respetarse.

## Familias actuales

### `fenix-expanded`
Montoro pertenece a esta familia. Se considera referencia visual.

### `fenix-v9`
Las nuevas landings Andalucía (`Sevilla`, `Utrera`, etc.) presentan deriva visual: hero de dos columnas, bloques más abiertos y tratamiento distinto. Deben converger al canon Montoro mediante una capa compartida/factory; no se harán retoques manuales aislados ciudad por ciudad salvo canary controlado.

## Regla de implementación

1. Inventariar familia visual por URL.
2. Conservar contenido, SEO, enlaces, forms y schema existentes.
3. Aplicar una capa visual compartida versionada en PREPROD.
4. Canary en una URL nueva antes de escalar.
5. Comparar OLD vs NEW en desktop/tablet/mobile.
6. Verificar imágenes/crops explícitamente.
7. Health + Readiness + Smoke + forms + enlaces.
8. Rollback probado.
9. Escalar por lotes.
10. PROD queda fuera hasta aprobación posterior.

## Criterio de aceptación de imagen

Una imagen queda GREEN solo si: sujeto principal completo, rostro/ojos no cortados, manos/objeto comercial importante visibles cuando proceda, no estirada, sin pixelación evidente, sin texto incrustado ilegible y coherente con el contexto local/contenido.

## Criterio de aceptación de página

- 1 H1 visible.
- Contenido desktop comprimido al canon.
- Sin overflow horizontal.
- Hero e imágenes correctamente encuadrados.
- CTA y formularios accesibles.
- Enlaces internos válidos.
- No se pierde contenido/SEO/schema.
- STAGING conserva `noindex`.
- Rollback disponible.
