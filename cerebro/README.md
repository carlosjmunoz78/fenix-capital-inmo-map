# CEREBRO OS · Engine Factory, Runtime, Multiempresa, Console y Governance V0

Este árbol se mantiene separado del runtime funcional de App Fénix y no sustituye App, CRM, Supabase, Notion, WordPress, SEO, Training ni Trading. Los SHA indicados son **anchors de evidencia por alcance**, no un campo mutable de “main actual”.

## Estado por fase

- **FACT-001 / GOV-001 — HECHO · estructural/reference green.** Factory V0 y registro canónico de 177 motores validados; 177 scaffolds reproducibles, sin afirmar que los 177 motores estén operativos.
- **Phase 2 — HECHO wrapper + auditoría read-only V0 / estados live diferenciados.** Los nueve bindings siguen conservadores. El ledger `evidence/phase2-existing-bindings-audit.json` confirma `APP-001` como `CONFIRMED_OPERATIONAL` por deploy/smoke exact-SHA del App existente; `CORE-001`, `SUP-001`, `TRN-001` y `DOC-001` quedan `DOCUMENTED_PARTIAL`; `CRM-001`, `SEO-001`, `WEB-001` y `LAB-TRD` permanecen `UNKNOWN_REQUIRES_AUDIT`. Ningún estado habilita autonomía CEREBRO PROD.
- **Phase 3 — HECHO V0 reference / DEFINIDO según motor.** `RUNTIME-001`, `EVT-001`, `JOB-001` y `FINOPS-001` tienen referencia ejecutable PREPROD; `DBOFF-001`, `STOROFF-001`, `FREE-001` y `AIBUD-001` permanecen definidos como contratos V0, no operativos autónomos.
- **Phase 4 — HECHO · estructural/reference green.** Bootstrap multiempresa de 17 motores con aislamiento por tenant, PREPROD-only, HUMAN_REQUIRED canónico y promoción PROD autónoma deshabilitada.
- **Phase 5 — HECHO · estructural/reference green.** `CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001` y `ACTGW-001` implementados como Console/Gateway V0: selector de empresa/contexto, sesiones, historial, auditoría, consulta de motores, chat y órdenes mediados por Gateway, nunca acceso directo a un modelo.
- **Governance V0 — IMPLEMENTADO EN RAMA / PENDIENTE DE GATE.** `POL-001` y `HEX-001` disponen de referencia determinista PREPROD-only: reglas versionadas ALLOW/DENY/REVIEW, fail-closed, escalado exacto HUMAN_REQUIRED, aislamiento por empresa, priorización y asignación de excepciones humanas. No se considera green ni promovido hasta CI/revisión/merge exact-head.

## Evidencia vigente

La evidencia estructurada por alcance está en `docs/EVIDENCE.json`; el audit read-only de bindings existentes está en `evidence/phase2-existing-bindings-audit.json`.

- Phase 5 evidence anchor: merge `c2eb030e2e8ed0ab45ca58775a7183e359e3d2e9`; PROD Live Deploy `34292739019` y PROD Runtime Smoke `34292739031`, success sobre ese SHA.
- Documentation closure anchor: merge `6bf6af92c1106884da87fb9a659f807093d47e0a`; PROD Live Deploy `34293941974` y PROD Runtime Smoke `34293942069`, success sobre ese SHA.
- Phase 2 live-audit anchor: merge `4705f6821bde7bff47d156ae2a9ce60b09dee781`; PROD Live Deploy `34313457110` y PROD Runtime Smoke `34313457061`, success sobre ese SHA.

Esta evidencia valida los alcances expresamente citados. **No demuestra que todos los motores CEREBRO sean operativos o autónomos en PROD.**

## Factory-first

FACT-001 valida el registro canónico y genera de forma determinista el scaffold estructural de los 177 motores definidos en el Master V2.

```bash
cd cerebro
npm test
npm run validate
npm run generate -- --out ./.cerebro-generated
```

Cada scaffold contiene `company_id`, `engine_id`, `environment` y `version`, además de manifest, config, contratos, permisos, políticas, eventos, jobs, handlers, tests, evaluación, tribunal, observabilidad, FinOps, backup, rollback, rebuild, training hooks y documentación.

## Seguridad y no regresión

- No escribe en Supabase desde estos V0 de CEREBRO.
- No reemplaza App/CRM/WordPress/Notion/SEO/Training/Trading.
- Trading mantiene aislamiento explícito.
- Acceso cross-company: deny por defecto.
- PREPROD-only en Runtime/Multiempresa/Console/Governance V0.
- `prod_execution_enabled=false`, `autonomous_prod=false` y sin promoción PROD autónoma.
- Console conecta conceptualmente al CEREBRO Gateway; chat y comandos no acceden directamente a un modelo.
- HUMAN_REQUIRED limitado a las razones canónicas del proyecto.
- Coste adicional objetivo: 0 €.

## Rebuild

Los 177 scaffolds se reconstruyen desde `registry/engine-registry.seed.json` + `factory.mjs`. Runtime, Multiempresa, Console y Governance son código declarativo bajo `runtime/`, `multicompany/`, `console/` y `governance/`, sin dependencia obligatoria de servicios de pago. La salida generada de Factory es desechable y reproducible.

## Documentación operativa

Ver `docs/CURRENT_STATE.md`, `docs/EVIDENCE.json`, `docs/DEPENDENCY_MAP.md`, `docs/RUNBOOK.md`, `docs/CHANGELOG.md` y `docs/AUTONOMY_BACKUP_REBUILD.md` para estado de evidencia, dependencias, gates, rollback/rebuild y autonomía.