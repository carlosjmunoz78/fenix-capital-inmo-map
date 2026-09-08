# CEREBRO OS · Engine Factory + Shared Runtime V0

Estado de evidencia: **PREPROD_CANDIDATE** hasta que CI confirme este branch. Este árbol se mantiene separado del runtime funcional de App Fénix: no cambia Supabase, contratos actuales ni rutas PROD.

## Factory-first

FACT-001 valida el registro canónico y genera de forma determinista el scaffold estructural de los 177 motores definidos en el Master V2, sin afirmar que estén operativos.

```bash
cd cerebro
npm test
npm run validate
npm run generate -- --out ./.cerebro-generated
```

Cada scaffold contiene `company_id`, `engine_id`, `environment` y `version`, además de manifest, config, contratos, permisos, políticas, eventos, jobs, handlers, tests, evaluación, tribunal, observabilidad, FinOps, backup, rollback, rebuild, training hooks y documentación.

## Phase 2 · Connect existing engines without replacing them

`registry/existing-engine-bindings.json` registra los nueve objetivos canónicos de conexión: `CORE-001`, `SUP-001`, `TRN-001`, `APP-001`, `CRM-001`, `DOC-001`, `SEO-001`, `WEB-001` y `LAB-TRD`.

Los bindings son deliberadamente **read-only/contract-only** y `prod_execution_enabled=false`. Un binding no convierte automáticamente evidencia histórica en evidencia operativa. Trading conserva aislamiento explícito.

## Phase 3 · Shared runtime / zero-cost platform

`runtime/runtime.mjs` implementa una referencia ejecutable para:

- `RUNTIME-001`: runtime compartido, sin procesos por motor y sin escrituras PROD.
- `EVT-001`: semántica outbox/inbox, idempotencia y aislamiento por `company_id`.
- `JOB-001`: prioridad, timeout declarado, retry, idempotencia y resultado.
- `FINOPS-001`: presupuesto adicional 0 € por defecto; exceso => `HUMAN_REQUIRED:MONEY_LIMIT`.

`registry/zero-cost-platform.json` define además los contratos V0 de `DBOFF-001`, `STOROFF-001`, `FREE-001` y `AIBUD-001`. PostgreSQL/worker persistente sigue siendo el target antes de cualquier promoción autónoma PROD; la implementación actual es referencia determinista y testeable en PREPROD.

## Seguridad de migración

- No escribe en Supabase.
- No reemplaza App/CRM/WordPress/Notion/SEO/Training/Trading.
- No habilita motores autónomos en PROD.
- Permisos y acceso cross-company se mantienen `deny` por defecto.
- `prod_writes=false` en RUNTIME-001 V0.
- `enabled=false` y `autonomous_prod=false` en scaffolds.
- El estado histórico del Master se conserva como `source_status`; la evidencia viva no auditada queda en `UNKNOWN_REQUIRES_AUDIT`.

## Rebuild

Los 177 scaffolds se reconstruyen desde `registry/engine-registry.seed.json` + `factory.mjs`. RUNTIME/EVT/JOB son código declarativo bajo `runtime/`, sin dependencia de servicios de pago. La salida generada de Factory es desechable y reproducible.
