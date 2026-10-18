# GATES Y CRITERIOS DE ACEPTACIÓN · STAGING V5

## GOLD GATES TRANSVERSALES

### URL_STANDARD_GATE
PASS si:
- URL tiene intención propietaria clara;
- es estable/legible/descriptiva;
- no hay duplicidad estructural injustificada;
- canonical objetivo coherente;
- inlinks no apuntan a redirect evitable;
- cualquier cambio de slug tiene 301 + OLD/NEW + rollback.

### PAGE_PURPOSE_GATE
PASS si:
- audiencia + intención + función + conversión están definidas;
- la página no duplica otra sin valor adicional;
- el contenido y CTA sirven esa función.

### LANDING_STANDARD_GATE
PASS si:
- hero claro;
- beneficios y alcance reales;
- requisitos/encaje;
- proceso;
- confianza/evidencia;
- riesgos/límites;
- FAQ;
- CTA coherente;
- enlaces de continuidad relevantes;
- schema fiel.

### LOCAL_DIFFERENTIATION_GATE
PASS si:
- la ciudad aporta utilidad verificable propia;
- no es un reemplazo de topónimo;
- no inventa datos;
- similitud con landings vecinas no depende de un template casi idéntico.

### ARTICLE_STANDARD_GATE
PASS si:
- resuelve intención informativa;
- añade valor;
- estructura preguntas reales;
- fuentes/autoría/fecha cuando aplican;
- no relleno SEO;
- CTA contextual;
- schema Article/BlogPosting fiel.

### YMYL_TRUST_GATE
PASS si:
- claims materiales trazables;
- vigencia/fuente/autoridad adecuadas;
- sin promesas absolutas;
- casos reales/ilustrativos correctamente identificados;
- revisión experta si procede.

### FENIX_VISUAL_POLICY_GATE
PASS si:
- UI no está dominada por morado/rosa;
- base blanco/negro-antracita/grises;
- naranja/amarillo como acentos preferentes;
- morado reservado a activo oficial/excepción documentada;
- logo no alterado de forma indebida;
- diseño coherente entre templates.

### MOBILE_SECTION_ORDER_GATE
PASS si, donde aplique:
- heading antecede a imagen asociada;
- orden `H2/H3 → imagen → contenido → CTA`;
- DOM/accesibilidad no degradados;
- exceptions justificadas.

## CAPAS L01–L25
Todas deben re-evaluarse tras la corrección.
Un PASS previo V4 no se hereda automáticamente si un cambio afecta su evidencia.

## ACEPTACIÓN GLOBAL
`STAGING_V5_READY=true` solo si:
- `critical_fail_count=0`;
- `broken_internal_targets=0`;
- no quedan artefactos de test públicos;
- metadata crítica corregida;
- arquitectura coherente;
- landings locales pasan diferenciación o quedan correctamente consolidadas/no-promovibles;
- responsive/visual QA real completado;
- accessibility QA real completado;
- Lighthouse/CWV con evidencia;
- forms→CRM E2E;
- consent/tracking E2E;
- image regressions=0;
- OLD vs NEW completo;
- rollback documentado/probado;
- Notion + CEREBRO sincronizados;
- learning artifacts generados.

No usar “perfecto” como sinónimo de “sin observaciones”.  
Usar “READY” solo con evidencia y excepciones explícitas.
