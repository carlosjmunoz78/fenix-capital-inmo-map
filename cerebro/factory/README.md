# FACT-001 · Fábrica de Motores CEREBRO V0

Estado: PREPROD/aislado. No despliega ni modifica PROD.

Objetivo: generar y validar esqueletos de motores sin duplicar runtime ni acoplarlos a una IA concreta.

Principios obligatorios:
- FACTORY FIRST.
- ZERO ADDITIONAL COST.
- PRESERVE EVERYTHING.
- company_id + engine_id + environment + version.
- lógica determinista antes de IA.
- ningún motor nuevo implica servidor propio.
- Training/LAB nunca promueve directamente a PROD.
- todo cambio debe declarar backup, rollback y rebuild.

Contenido V0:
- `schemas/engine-manifest.schema.json`: contrato canónico.
- `templates/engine.manifest.yaml`: plantilla mínima utilizable.
- `registry/engine-registry.yaml`: Registry inicial versionado en Git.
- `examples/APP-001.engine.yaml`: specimen basado en APP Fénix auditada.
- `scripts/validate_manifest.py`: validador determinista.
- `tests/test_manifests.py`: validación de todos los manifests registrados.

Esta rama es deliberadamente aislada y no altera los contratos actuales de App, CRM, Supabase, Notion, WordPress, SEO, Training ni Trading LAB.