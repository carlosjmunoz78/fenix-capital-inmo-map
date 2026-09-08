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
- if either is red, do not claim green: create a narrow hotfix and repeat the loop.

## Runtime boundaries

- V0 CEREBRO runtime/multi-company/console code is PREPROD-only unless a later promotion contract explicitly changes that boundary.
- No direct Supabase writes from these reference V0 paths.
- No direct model access from Console; use the Gateway boundary.
- No Trading credentials or execution resources may cross into App/CRM/CEREBRO PROD.
- Cross-company access defaults to deny.

## HUMAN_REQUIRED

Only: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

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