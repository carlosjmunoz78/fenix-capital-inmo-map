# FACT-001 · Estado V0

- Estado funcional: **CONFIRMED_OPERATIONAL en PREPROD aislado**.
- Entorno: `cerebro/fact-001-factory-v0`.
- PROD: **no modificado**.
- Coste adicional introducido: **0 €**.
- CLI funcional: `scripts/factory.py`.
- Create: genera scaffold inerte + registro local.
- Plan: solo lectura, no escribe.
- Idempotencia: creación idéntica devuelve `NO_CHANGE`.
- Anti-duplicación: cambio sobre `engine_id` existente devuelve `CONFLICT` y no sobrescribe.
- Registry: creado y validado.
- Schema: creado.
- Specimens: FACT-001 y APP-001.
- Dependency map: inicial; inventario de callers continúa como trabajo separado de integración.
- Validator: creado.
- Tests: validator + Registry + plan + create + idempotencia + collision guard + scope guard.
- CI: **VERDE** en HEAD funcional. Workflow `FACT-001 Factory V0`, run `34127939813`; job `validate` y todos sus pasos terminaron `success`.
- Backup: Git history.
- Rollback: revertir commits/eliminar rama aislada antes de cualquier merge; no existe impacto PROD.
- Rebuild: schema + Registry + Factory CLI.
- Merge: PR #106 permanece DRAFT; no se promueve automáticamente.

## Definición V0 alcanzada
FACT-001 puede recibir una definición mínima de motor y generar determinísticamente un scaffold estandarizado con manifest, config, contratos, permisos, políticas, eventos, jobs, tests, evaluación, observabilidad, operaciones de backup/rollback/rebuild, hooks de Training y alta en Registry, sin desplegar ni crear infraestructura.

## Siguiente gate estructural
1. Ampliar GOV-001/Registry con motores existentes auditados, sin recrearlos.
2. Completar DEP-001/caller inventory de Edge Functions, RPC, tablas, webhooks y repositorios.
3. Registrar riesgos vivos, especialmente las tablas PROD sin RLS, sin modificar PROD.
4. Después construir Policy/Human Exception y shared contracts alrededor de lo existente.
