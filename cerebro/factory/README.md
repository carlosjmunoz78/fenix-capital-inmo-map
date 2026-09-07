# FACT-001 · Fábrica de Motores CEREBRO V0

Estado: **CONFIRMED_OPERATIONAL en PREPROD aislado**. No despliega ni modifica PROD.

Objetivo: generar y validar esqueletos de motores sin duplicar runtime ni acoplarlos a una IA concreta.

## Principios obligatorios
- FACTORY FIRST.
- ZERO ADDITIONAL COST.
- PRESERVE EVERYTHING.
- `company_id + engine_id + environment + version`.
- lógica determinista antes de IA.
- ningún motor nuevo implica servidor propio.
- Training/LAB nunca promueve directamente a PROD.
- todo cambio debe declarar backup, rollback y rebuild.
- un `engine_id` existente nunca se sobrescribe silenciosamente.

## Contenido V0
- `schemas/engine-manifest.schema.json`: contrato canónico.
- `templates/engine.manifest.yaml`: plantilla humana de referencia.
- `registry/engine-registry.json`: Registry inicial versionado en Git.
- `examples/FACT-001.engine.json`: contrato/evidencia de la propia fábrica.
- `examples/APP-001.engine.json`: specimen basado en APP Fénix auditada.
- `scripts/factory.py`: generador determinista, idempotente y zero-dependency.
- `scripts/validate_manifest.py`: validador de manifests y Registry.
- `tests/test_factory.py`: plan/read-only, generación, idempotencia, anti-overwrite y scope.
- `tests/test_manifests.py`: validación de todos los manifests registrados.

## Uso V0
Plan sin escribir:

```bash
python cerebro/factory/scripts/factory.py create \
  --engine-id SEO-001 \
  --name "SEO Engine" \
  --layer L3 \
  --objective "SEO operativo CEREBRO" \
  --company-scope COMPANY_SCOPED \
  --company-id fenix-capital \
  --environment PREPROD \
  --plan
```

Crear scaffold local/inserto en Registry:

```bash
python cerebro/factory/scripts/factory.py create \
  --engine-id SEO-001 \
  --name "SEO Engine" \
  --layer L3 \
  --objective "SEO operativo CEREBRO" \
  --company-scope COMPANY_SCOPED \
  --company-id fenix-capital \
  --environment PREPROD
```

Comprobar unicidad del Registry:

```bash
python cerebro/factory/scripts/factory.py status
```

La creación idéntica devuelve `NO_CHANGE`. Si el mismo `engine_id` ya existe con definición distinta, devuelve `CONFLICT` y no sobrescribe: la evolución debe pasar por un flujo versionado posterior.

Esta rama es deliberadamente aislada y no altera los contratos actuales de App, CRM, Supabase, Notion, WordPress, SEO, Training ni Trading LAB.
