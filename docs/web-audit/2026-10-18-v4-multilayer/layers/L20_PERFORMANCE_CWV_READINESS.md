# L20 · Performance & Core Web Vitals Readiness

**Owner:** WEB-001 + WAUD-001 · **Auditoría:** HECHO · **Resultado:** POR AUDITAR CWV

## Hallazgos
- HTML medio ~218 KB; CSS inline mediano ~104 KB; JS inline mediano ~31,7 KB.
- 1.200 scripts externos en 204 páginas (~5,9/página); mediana 3 stylesheets, máximo 15.
- 27 imágenes usadas >500 KB; 3 usadas >1 MB; 516 usos renderizados sin dimensiones.
- No hay LCP/INP/CLS medidos en este snapshot; no se inventa un PASS.

## Acciones
- Ejecutar Lighthouse/PageSpeed móvil y desktop con evidencia.
- Priorizar imágenes hero, dimensiones, CSS no usado y third-party JS.
- No optimizar a ciegas si rompe formularios o tracking.