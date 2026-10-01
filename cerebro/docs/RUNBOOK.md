# CEREBRO OS · RUNBOOK V0

## Standard safe loop

1. CONSERVAR: inventory current behavior/contracts and identify exact HEAD/version.
2. ENTENDER: map dependencies, company scope, permissions, policies and risk boundaries.
3. ENVOLVER: add wrappers/reference code without replacing existing App/CRM/Supabase/Notion/WordPress/SEO/Training/Trading.
4. PROBAR: run deterministic tests and PREPROD gates.
5. MEJORAR: fix every red/P1/P2 with a regression test; rerun on the exact new HEAD.
6. MIGRAR: only after clean tribunal/review, merge with expected HEAD SHA; verify exact-SHA post-merge PROD deploy/smoke where applicable.

## Required PREPROD gate

For CEREBRO repository changes require:
- `CEREBRO Factory PREPROD` completed success.
- `PRE-PROD App Build` completed success.
- Clean review/tribunal on the exact HEAD, with no unresolved P1/P2.
- PR open, non-draft, mergeable and exact expected head.

## Post-merge safety gate

After merge to `main`:
- capture the merge SHA;
- require `PROD Live Deploy` success on that exact SHA;
- require `PROD Runtime Smoke` success on that exact SHA;
- if either is red, **do not claim green and execute rollback immediately when a failed deploy/smoke may have exposed a bad production snapshot**.

Canonical rollback procedure: repository-level `docs/PROD_ROLLBACK_RUNBOOK.md`.

Emergency sequence:
1. Identify the last known-good `main` SHA and the offending merge/commit.
2. Run `PROD Rollback Rehearsal` against the known-good SHA and require green.
3. Create a rollback branch from current `main`.
4. Revert only the offending commit(s); never reset or rewrite `main` history and never hand-edit/force-push `gh-pages`.
5. Open a rollback PR and require PREPROD build, Browser QA and smoke green.
6. Merge the rollback PR.
7. Require `PROD Live Deploy` success on the new revert SHA.
8. Require `PROD Runtime Smoke` success and exact deployed SHA on that same revert SHA.
9. Verify the reported user-visible production failure is gone.
10. Diagnose/fix forward on a separate branch through the normal PREPROD → review → merge → PROD → smoke sequence.

## Runtime boundaries

- V0 CEREBRO runtime/multi-company/console code is PREPROD-only unless a later promotion contract explicitly changes that boundary.
- No direct Supabase writes from these reference V0 paths.
- No direct model access from Console; use the Gateway boundary.
- No Trading credentials or execution resources may cross into App/CRM/CEREBRO PROD.
- Cross-company access defaults to deny.

## HUMAN_REQUIRED

HUMAN_REQUIRED_SET: `["LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK","POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"]`.

## Failure handling

- Preserve original error where possible.
- Audit attempted command/chat failures separately from successes.
- Do not mutate engine/session state before validating/cloning the evidence/result required for the transition.
- Do not mark an engine GREEN from missing, stale or historical-only evidence.

## Rebuild smoke

```bash
cd cerebro
npm test
npm run validate
npm run generate -- --out ./.cerebro-generated
```

Generated Factory output is disposable; canonical sources are registry seed + factory/runtime/multicompany/console code and their tests.

## Explicit Learning V1 · safe preference changes

- Una corrección conversacional de estilo puede aplicarse solo a la sesión sin escritura durable.
- Persistencia durable solo con orden explícita del usuario; nunca inferir silenciosamente una preferencia permanente.
- Toda preferencia durable debe conservar `actor_code`, `company_id`, categoría, key, versión, fuente explícita y lineage `supersedes`.
- No almacenar audio, transcripciones completas, secretos, credenciales ni datos pesados en `cerebro_user_preferences`.
- Una preferencia nunca amplía permisos ni sustituye HUMAN_REQUIRED, política, seguridad, firma, obligación legal o límite económico.
- Rollback ordinario: revertir código/Gateway; no borrar la tabla ni el historial de preferencias. Borrado destructivo requiere snapshot/export, evaluación separada y autorización explícita.
- Tras DDL de preferencias ejecutar advisors de seguridad y rendimiento; corregir avisos nuevos atribuibles al cambio antes de cerrar promoción.
