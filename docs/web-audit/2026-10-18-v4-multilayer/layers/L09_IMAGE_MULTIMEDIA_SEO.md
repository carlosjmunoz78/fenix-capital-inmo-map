# L09 · Image & Multimedia SEO

**Owner:** SEO-001 + WEB-001 + Multimedia · **Auditoría:** HECHO · **Resultado:** ACCIONES

## Hallazgos
- 680 imágenes: 487 usadas, 193 sin uso; 165 unattached en WP; 680/680 binarios OK.
- 8 media records con alt vacío no están usados; en 1.387 usos renderizados con `src` no hay alt vacío.
- 516/1.387 usos carecen de width o height; 38 imágenes >500 KB, 27 usadas; 4 >1 MB, 3 usadas.
- `source_origin` vacío en 662 y `rights_license` en 603: gap de trazabilidad, no prueba de infracción.
- 28 grupos SHA exactos, 41 pHash exactos y 139 pares pHash cercanos.

## Acciones
- Dimensiones/aspect-ratio, srcset/sizes y optimización de assets pesados usados.
- Revisar duplicados antes de borrar y completar procedencia/licencia cuando aplique.