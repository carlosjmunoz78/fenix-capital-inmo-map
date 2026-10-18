# L14 · Web Engineering / Web Creator / WordPress

**Owner:** WEB-001 + WAUD-001 · **Auditoría:** HECHO · **Resultado:** ACCIONES

## Hallazgos
- Snapshot reproducible de 204 URLs; header/nav/footer presentes en todas.
- 29 URLs no exponen landmark `<main>`.
- HTML medio ~218 KB; CSS inline mediano ~104 KB; JS inline mediano ~31,7 KB.
- Persiste el crédito nativo Astra además del footer corporativo/legal.

## Acciones
- Converger a componentes/design system reutilizable sin reescritura destructiva.
- Normalizar landmarks y dependencias.
- Todo refactor con OLD vs NEW y rollback.

## V5 · Contrato Web Creator por arquetipo

Referencia: `docs/governance/CEREBRO_WEB_GOLD_STANDARD_V1_2026-10-18.md`.

WEB-001 debe clasificar cada URL antes de corregirla: `HOME`, `SERVICE_PILLAR`, `PRODUCT_TYPE`, `AUDIENCE_PROFILE`, `LOCAL_B2C`, `LOCAL_B2B`, `B2B_SERVICE`, `PROCESS_GUIDE`, `IMPROVEMENT_SERVICE`, `RESOURCE_TOOL`, `ARTICLE_INFORMATIONAL`, `CASE_STUDY`, `ABOUT_TRUST`, `LEGAL`, `CONTACT_CONVERSION`, `CATEGORY_ARCHIVE` o `SYSTEM_TEST`.

No se acepta una plantilla universal para todos los tipos. Cada arquetipo tendrá estructura, CTA, schema, densidad de información y componentes apropiados a su propósito.

### Regla de causa raíz

Antes de editar una URL individual, comprobar si el defecto procede de:

1. theme;
2. template Elementor/Astra;
3. CSS global;
4. componente/bloque reutilizable;
5. shortcode/form;
6. snippet/plugin;
7. contenido específico de la URL.

Si la causa es 1–6, corregir en PREPROD la fuente común y ejecutar regresión sobre todas las URLs afectadas. Evitar 204 parches manuales que dejen deuda técnica o divergencias.

### Contrato de cambio

Todo cambio estructural debe registrar: componente origen, URLs afectadas, snapshot previo, diff OLD vs NEW, test responsive/accesibilidad/SEO, rollback y evidencia final.