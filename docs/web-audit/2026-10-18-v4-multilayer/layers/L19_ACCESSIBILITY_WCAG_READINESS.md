# L19 · Accessibility / WCAG Readiness

**Owner:** WEB-001 + WAUD-001 · **Auditoría:** HECHO · **Resultado:** PARCIAL

## Hallazgos
- `lang=es`, viewport y charset en 204/204.
- 0 imágenes renderizadas con `src` carecen de alt; el alt vacío recurrente corresponde al tracking/decorativa observada.
- Los honeypots están correctamente `aria-hidden=true` y `tabindex=-1`; excluidos ellos, la heurística estática no detecta inputs sin nombre.
- 29 páginas no tienen `<main>` y 13 presentan saltos de headings.
- El snapshot no prueba teclado, foco visible, contraste, lector de pantalla ni target sizes.

## Acciones
- Corregir landmarks/headings.
- Ejecutar axe/Lighthouse + teclado/foco/contraste/lector de pantalla.
- Mantener alt vacío solo para decorativas reales.