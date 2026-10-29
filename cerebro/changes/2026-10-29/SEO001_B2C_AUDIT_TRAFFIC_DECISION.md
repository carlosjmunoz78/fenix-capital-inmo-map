# SEO-001 · B2C audit traffic decision · 2026-10-29

Scope: PREPROD only.

## HECHO

`fenix-seo-b2c-perfect-audit-preprod` was observed at roughly 712 invocations in the previous 24 hours and commonly returns HTTP 422.

The 422 is a functional gate result, not an idle/no-work response.

Current persisted audit summary:
- total B2C audited pages: 68
- PASS: 0
- FAIL: 68

Frequent live failure reasons include:
- `FORMS_LT_2`
- `TOP_CTA_DISTINCT_LT_2`
- `TOP_CTA_TARGET_BROKEN`
- one observed page also had `CONTENT_LT_1400`

The dispatcher already has a 90-second cooldown. It is called by `seo001_seo_autonomy_superloop_preprod()` only while the B2C strict gate is not green.

## DECISION

DO NOT suppress or lengthen this audit in the Supabase-cost optimization wave.

Reason: this traffic is evidence-producing work against a currently red gate. Reducing it without coordinating the remediation loop would trade correctness/feedback latency for a small load reduction and could hide the moment when STAGING becomes compliant.

The correct way to remove this load is to repair the B2C contract failures; once the gate becomes green, the autonomy superloop stops dispatching the B2C perfect audit automatically.

## Status

- HECHO: audited trigger chain.
- HECHO: confirmed 68/68 red pages.
- HECHO: preserved current behavior.
- PROD: untouched.
- Cost added: 0.
