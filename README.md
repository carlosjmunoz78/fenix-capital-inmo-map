# CEREBRO SEO001 H1 Native Form Dependency Wrapper · v0.1.0

Scope: **Fénix STAGING / PREPROD only** (`staging.fenixcapital.es`).

Purpose: preserve CEREBRO Universal Operator while removing only the accidental `elementor-frontend` dependency from `cerebro-universal-landing-native-form` on requests that are not Elementor documents.

Safety contract:
- exact host guard; other hosts are NO-OP;
- no data/content mutation;
- no Elementor version/config mutation;
- no fake `elementorFrontendConfig`;
- Elementor documents are NO-OP;
- all non-target dependencies are preserved;
- rollback is plugin deactivation/removal;
- source-level marker reports `APPLIED_REMOVE_ELEMENTOR_FRONTEND_DEP` or a NO-OP status.

Acceptance before any production consideration:
1. CEREBRO Universal Operator remains active.
2. Previously failing non-Elementor pages no longer load `elementor-frontend` solely through the native form dependency.
3. Real Elementor pages retain normal Elementor behavior/config.
4. Native form renders and works.
5. Console is clean for the former `elementorFrontendConfig` failure.
6. Targeted V5 matrix reaches 0 JS failures; Complianz remains handled independently.
7. Rollback by deactivation is verified.

This branch/package is not authorization for PROD.
