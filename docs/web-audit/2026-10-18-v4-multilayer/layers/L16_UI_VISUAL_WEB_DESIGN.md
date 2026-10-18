# L16 · UI & Visual Web Design

**Owner:** WEB-001 + Brand capability · **Auditoría:** HECHO · **Resultado:** PARCIAL VISUAL

## Hallazgos
- 204/204 documentos tienen viewport, header, nav y footer; el CSS refleja múltiples sistemas/plantillas acumulados.
- El snapshot permite auditoría HTML/CSS, pero no sustituye QA visual real en breakpoints/navegadores.

## Acciones
- Inventariar componentes, spacing, tipografía, estados, botones, cards, forms y grids.
- Ejecutar visual regression desktop/tablet/mobile antes de PROD.
- Converger gradualmente a tokens/componentes, sin rediseño destructivo.

## V5 · `FENIX_VISUAL_POLICY_GATE`

Regla explícita Fénix para la interfaz web:

- evitar **estética morada o rosa**;
- priorizar blanco, negro/antracita, grises limpios y acentos naranja/amarillo corporativos;
- no usar morado/rosa como fondo de sección, botón principal, card, gradiente o acento repetido;
- `#870064` puede seguir existiendo en el manual y en activos oficiales, pero no será lenguaje visual protagonista de la UI salvo excepción documentada o activo inseparable;
- no alterar el logo oficial para cumplir esta preferencia.

### Auditoría visual obligatoria

Cada template/arquetipo debe revisar:

- jerarquía visual;
- spacing y ritmo vertical;
- contraste;
- consistencia de botones/cards/forms;
- densidad de información;
- uso de color y gradientes;
- coherencia desktop/tablet/mobile;
- OLD vs NEW visual.

Una página que visualmente deriva hacia morado/rosa dominante queda `FAIL` en este gate aunque pase SEO técnico.