# CONTRATO DE APRENDIZAJE CEREBRO · WEB QUALITY V1

## OBJETIVO
Cada corrección en Fénix STAGING V5 debe producir conocimiento reutilizable para que CEREBRO pueda detectar y reparar el mismo patrón en futuras webs/empresas con mínima intervención humana.

## REGISTRO OBLIGATORIO POR CORRECCIÓN

Guardar:
- `learning_id`
- `company_id`
- `source_finding_id`
- `engine/capability`
- `page_type`
- `root_cause_class`
- `symptom`
- `detector`
- `old_evidence`
- `fix_strategy`
- `change_scope`
- `affected_urls`
- `tests_before`
- `tests_after`
- `new_evidence`
- `rollback`
- `confidence`
- `regression_risk`
- `reusable_rule`
- `prevention_gate`
- `automation_candidate`
- `template_or_component_candidate`
- `human_exception_if_any`
- `cost`
- `duration/effort`
- `result`

## APRENDER = CONVERTIR CAMBIO EN SISTEMA

Cuando una corrección se repita o sea estructural, convertirla en uno o varios de:
- regla determinista;
- test automático;
- gate;
- lint;
- template;
- componente;
- fixture;
- checklist;
- runbook;
- detector;
- migración reusable;
- skill FACT-001;
- política WAUD-001/SEO-001/WEB-001.

## EJEMPLOS

### Caso: imagen aparece antes del H2 en móvil
No guardar solo “se movió imagen”.
Guardar:
- detector DOM/layout;
- patrón template responsable;
- regla `MOBILE_SECTION_ORDER_GATE`;
- test responsive;
- fix en componente;
- lista de páginas impactadas;
- regresión.

### Caso: landings locales casi idénticas
Guardar:
- métrica de similitud;
- threshold;
- `LOCAL_DIFFERENTIATION_GATE`;
- señales válidas de diferenciación;
- regla “no inventar datos”;
- fallback consolidar/no crear.

### Caso: color morado domina UI
Guardar:
- token/component responsable;
- visual-policy gate;
- paleta permitida por empresa;
- exception list para logos/activos oficiales.

## BUCLE DE MEJORA

`finding → root cause → fix → regression → learning → reusable gate/test → next run`

## SALIDAS V5
Crear en CEREBRO:
- `docs/learning/web-quality/FENIX_STAGING_V5_LEARNING_LOG.jsonl`
- `docs/learning/web-quality/FENIX_STAGING_V5_RULES_EXTRACTED.md`
- `docs/learning/web-quality/FENIX_STAGING_V5_AUTOMATION_CANDIDATES.md`
- `docs/learning/web-quality/FENIX_STAGING_V5_REGRESSION_FIXTURES.md`

Actualizar cuando aplique:
- Web Quality Layer Registry
- Gold Standard
- WAUD-001 contract
- SEO-001/WEB-001 runbooks
- FACT-001 scaffold/generator hooks
- LRN/EVA/QA artefacts

## PRINCIPIO
CEREBRO no “aprende” porque un chat recuerde el cambio.
Aprende cuando el cambio queda convertido en evidencia, regla, test, gate y documentación versionada.
