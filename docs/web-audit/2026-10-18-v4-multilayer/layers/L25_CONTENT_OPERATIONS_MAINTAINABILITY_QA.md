# L25 · Content Operations, Maintainability & Continuous QA

**Owner:** WAUD-001 + WEB-001 + SEO-001 + QA/EVA/LRN · **Auditoría:** HECHO · **Resultado:** DEFINIDO PARA AUTOMATIZAR

## Hallazgos
- Baseline V4 reproducible: copy exacto, árbol, dependencias, imágenes, hashes y rollback.
- `SEO-001` y `WEB-001` existen; `WAUD-001` está PLANIFICADO y su contrato ya incluye técnico, arquitectura, CWV, indexabilidad, schema, contenido, conversión, forms y seguridad básica.
- No hacen falta 25 motores: son capabilities/checklists versionadas.

## Acciones
- Registrar `WEB_QUALITY_LAYER_REGISTRY_V1` como contrato multiempresa.
- FACT-001 debe generar/actualizar skills de capa con evidencia/scoring.
- Ejecutar en PREPROD antes de promoción y en PROD en modo lectura/alerta.

## V5 · GATES adicionales que pasan a QA continuo

Referencia: `docs/governance/CEREBRO_WEB_GOLD_STANDARD_V1_2026-10-18.md`.

WAUD-001/QA/EVA deben evaluar por URL, además de L01–L25:

- `URL_STANDARD_GATE`
- `PAGE_PURPOSE_GATE`
- `LANDING_STANDARD_GATE`
- `LOCAL_DIFFERENTIATION_GATE`
- `ARTICLE_STANDARD_GATE`
- `YMYL_TRUST_GATE`
- `FENIX_VISUAL_POLICY_GATE`
- `MOBILE_SECTION_ORDER_GATE`

### Persistencia mínima por URL

Guardar `page_type`, audiencia, intención, conversión primaria, cluster propietario, gates aplicables, findings, severidad, confianza, owner, acción, evidencia OLD vs NEW y rollback.

### Reglas de automatización

1. Clasificar primero el arquetipo; no aplicar el mismo checklist a home, landing local, artículo y legal.
2. Detectar causa raíz compartida antes de crear tareas URL-a-URL.
3. Si el defecto nace de template/CSS/componente, crear una corrección común y una regresión sobre el conjunto afectado.
4. Si una URL ya cumple, no reescribirla.
5. No transformar una recomendación heurística en cambio automático cuando pueda afectar intención, claims YMYL, legal, marca o conversión sin evidencia suficiente.
6. Un `FAIL` crítico en cualquier gate aplicable bloquea promoción aunque otras capas estén verdes.
7. Notion y CEREBRO deben guardar el mismo ID de finding/gate para trazabilidad cruzada.

### Objetivo

El baseline V5 final debe poder responder de forma determinista: qué tipo de página es cada URL, qué estándar debía cumplir, qué falló, qué se cambió, dónde se corrigió la causa raíz, qué URLs heredaron la corrección y qué evidencia demuestra que NEW supera o conserva OLD sin regresiones.