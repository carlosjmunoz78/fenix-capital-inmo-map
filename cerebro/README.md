# CEREBRO OS · FACT-001 Engine Factory V0

Estado de evidencia: **DOCUMENTED_PARTIAL** hasta que CI/PREPROD confirme este branch. Este árbol está aislado de la App Fénix y no modifica runtime, Supabase ni PROD.

## Objetivo

Factory-first, coste adicional 0 €. La fábrica valida el registro canónico y genera de forma determinista el scaffold estructural de los 177 motores definidos en el Master V2, sin afirmar que estén operativos.

## Uso

```bash
cd cerebro
npm test
npm run validate
npm run generate -- --out ./.cerebro-generated
```

Cada scaffold contiene `company_id`, `engine_id`, `environment` y `version`, además de manifest, config, contratos, permisos, políticas, eventos, jobs, handlers, tests, evaluación, tribunal, observabilidad, FinOps, backup, rollback, rebuild, training hooks y documentación.

## Seguridad de migración

- No escribe en Supabase.
- No toca App/CRM/WordPress/Notion/SEO/Training/Trading.
- No habilita motores en PROD.
- Permisos `deny` por defecto.
- `enabled=false` y `autonomous_prod=false` por defecto.
- El estado histórico del Master se conserva como `source_status`; la evidencia viva queda en `UNKNOWN_REQUIRES_AUDIT` hasta auditoría específica.

## Rebuild

El conjunto completo se reconstruye exclusivamente desde `registry/engine-registry.seed.json` + `factory.mjs`. La salida generada es desechable y reproducible.
