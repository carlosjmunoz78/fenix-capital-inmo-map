# L06 · Content, Semantics & Topical Authority

**Owner:** SEO-001 + Content capabilities · **Auditoría:** HECHO · **Resultado:** ACCIÓN REQUERIDA

## Hallazgos
- 67 landings `asesor-hipotecario-{ciudad}` y 24 B2B locales.
- No hay titles ni metas exactamente duplicados.
- Un subgrupo de 24 landings B2C genera 276 pares con similitud 5-shingle Jaccard >0,95; máximo 0,981. Es evidencia de templating casi idéntico, no prueba automática de penalización.

## Acciones
- Aplicar `LOCAL_DIFFERENTIATION_GATE` con entidad, hechos y contexto local verificables.
- Comparar cada URL con pilar y vecinas.
- No inventar contenido para forzar diferenciación.

## V5 · Gold Standard de landing y artículo

Referencia: `docs/governance/CEREBRO_WEB_GOLD_STANDARD_V1_2026-10-18.md`.

### `PAGE_PURPOSE_GATE`
Toda URL debe declarar audiencia, intención primaria, entidad/tema, conversión primaria, cluster propietario y nivel de evidencia. Una URL no pasa por tener mucho texto: debe cumplir un propósito inequívoco.

### `LANDING_STANDARD_GATE`
Aplicar a landings de servicio, producto, perfil, B2B y local. Debe auditar:

- H1/title/intención alineados;
- propuesta de valor y CTA principal claros;
- problema/encaje/proceso/prueba/FAQ útiles y no de relleno;
- claims financieros trazables y vigentes;
- diferenciación real por audiencia/producto/localidad;
- imagen y contenido coherentes con cada bloque;
- enlazado contextual y no listas masivas sin necesidad;
- conversión primaria consistente;
- YMYL/E-E-A-T cuando proceda.

Para landings locales, `LOCAL_DIFFERENTIATION_GATE` es bloqueante: no basta sustituir el nombre de la ciudad. Si no existe información útil y verificable suficiente para justificar otra página, se debe recomendar consolidación/no creación antes que fabricar thin content.

### `ARTICLE_STANDARD_GATE`
Aplicar a artículos/posts informativos. Debe auditar:

- respuesta real a intención informativa;
- originalidad/valor añadido, completitud y precisión;
- entradilla útil y respuesta temprana cuando proceda;
- H2/H3 por subpreguntas reales;
- ejemplos/tablas/cálculos solo cuando mejoran comprensión;
- límites, excepciones y supuestos;
- fuentes/fecha/autor/revisor en YMYL cuando material;
- CTA contextual, no comercialización agresiva;
- `Article`/`BlogPosting` schema fiel al contenido visible;
- `dateModified` solo si hubo cambio real;
- ausencia de longitud arbitraria o keyword stuffing.

**Regla de corrección:** preservar el contenido bueno. La nueva auditoría debe señalar exactamente qué falta por arquetipo y solo reescribir lo necesario.