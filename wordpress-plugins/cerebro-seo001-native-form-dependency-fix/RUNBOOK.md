# Runbook

## Preflight
- Confirm target is `staging.fenixcapital.es`.
- Confirm CEREBRO Universal Operator is active.
- Confirm Core Guard has a recent backup of the Universal plugin.

## Verify
- Load `/asesor-hipotecario-jaen/` uncached.
- Confirm no `elementorFrontendConfig is not defined` browser-console error.
- Confirm the native form still initializes and submits to the existing lead path.
- Run Core Guard page verification and CEREBRO Universal QA smoke.

## Rollback
- Deactivate/remove this wrapper plugin.
- Purge supported cache layers.
- Re-run page verification.
