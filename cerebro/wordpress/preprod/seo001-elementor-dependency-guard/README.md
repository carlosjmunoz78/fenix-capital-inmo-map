# CEREBRO SEO001 Elementor Dependency Guard

PREPROD-only, reversible H1 remediation for `elementorFrontendConfig is not defined`.

Evidence contract:
- The error disappears when CEREBRO Universal Operator RC8 is deactivated and returns when RC8 is active.
- Failing non-Elementor pages render `elementor-frontend-js` without `elementor-frontend-js-before` / `window.elementorFrontendConfig`.
- The CEREBRO Universal native-form handle's inline `-js-after` payload is emitted directly after `elementor-frontend-js` in WordPress' dependency output.
- True Elementor pages include the config payload before `elementor-frontend-js`; this guard does nothing on those pages.

Scope:
- host: `staging.fenixcapital.es` only
- company_id: `fenix`
- engine_id: `SEO-001`
- environment: `PREPROD`
- cost: `0 EUR`

Safety:
- no schema/data migration
- no PROD write
- fail closed when another enqueued handle explicitly depends on `elementor-frontend`
- rollback: deactivate/remove this plugin

Acceptance after deployment:
1. Flush cache.
2. Run three fresh browser/PageSpeed loads of the Jaén target and require no relevant uncaught exception.
3. Re-run STAGING V5 Playwright acceptance.
4. Verify true Elementor pages still emit `elementor-frontend-js-before` and work normally.
5. Continue H2/H3 only after H1 is green.
