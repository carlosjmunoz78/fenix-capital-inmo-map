# WAUD-001 · Website Audit Engine V0.2

PREPROD-only deterministic audit over normalized public page snapshots. `WEB-001` and `SCAN-001` remain the web acquisition boundary; WAUD does not fetch or mutate remote systems.

Checks include HTTP status, title/meta/canonical, H1, html lang, viewport, forms, tracking markers and image alt. Inputs are scoped by `company_id`; cross-company data, sensitive material and PROD are rejected. Cost target: 0 €.
