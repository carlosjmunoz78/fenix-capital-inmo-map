# SOC-001 · Facebook Human Browser V1

Status: `BROWSER_ENTRY_GREEN_AUTHENTICATED_CANARY_PENDING`

## Scope

This runbook covers only `company_id=fenix`, `engine_id=SOC-001`, `department_id=social-facebook`, `environment=PROD`.

The stable enqueue surface is:

`public.cerebro_social_facebook_browser_enqueue_v1(p_request jsonb)`

Execution is restricted to `service_role` and routes through `ACTGW-001 -> BROWSER-001`.

## Allowed web surfaces

- facebook.com / www.facebook.com
- business.facebook.com
- canva.com / www.canva.com
- accounts.google.com

Any other target or `goto/open_tab` URL must fail with `FACEBOOK_BROWSER_ORIGIN_DENIED` or `FACEBOOK_BROWSER_COMMAND_ORIGIN_DENIED`.

## Human-like browser capabilities

The binding can navigate, open/switch/close tabs, click/double-click/hover, type/fill, press keys, select/check, scroll, upload, drag, wait for UI settling, read page text/HTML, download and capture screenshots.

Browser 1 applies human operator pacing between relevant actions. Stealth evasion, CAPTCHA bypass and MFA bypass are forbidden.

## Credentials

- Never put raw credentials in queue payloads or logs.
- Use `credential_ref_id` only.
- Worker-side Vault materialization remains origin/company/identity/account/capability scoped.
- Authenticated Facebook/Canva autonomy is not certified until a valid credential/session canary passes.

## Publication and external side effects

Browser access is not publication authority. Publishing, messaging, paid actions or other provider side effects still require the existing Social/Facebook policy, QA and authorization gates. Existing Buffer/Make/provider paths remain available until parity and rollback are proven.

## Human-required reasons

Only canonical reasons are valid:

`LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

CAPTCHA/MFA/provider verification is a blocker mapped to the appropriate canonical reason; it is not a new human-reason code.

## Physical evidence

- Synthetic SOC-001 mutation canary: `8b24ee63-4bc0-42e6-9e2d-bebfe159fcf1` -> `SUCCEEDED / AUTHORIZED`.
- Real Facebook observe canary: `921c5698-d863-4582-8fee-f3555c2ad5cf` -> `SUCCEEDED / AUTHORIZED`, final URL `https://www.facebook.com/`.
- Stable entrypoint canary: `04b38085-a232-417b-a066-c0e4252734fb` -> `SUCCEEDED / AUTHORIZED`, final URL `https://www.facebook.com/`.
- Negative origin test: `https://example.com/` -> `FACEBOOK_BROWSER_ORIGIN_DENIED`.
- CI: `CEREBRO Facebook Human Browser V1` must be green before promotion of adapter changes.

## Rollback

1. Stop/cancel active Browser jobs for the affected Facebook profile.
2. Stop using `cerebro_social_facebook_browser_enqueue_v1` from SOC-001.
3. Preserve and use the previous provider path; do not remove Buffer/Make/native adapters.
4. If necessary, revoke execute on the function from `service_role`.
5. Revert the migration/adapter commit only after confirming no active job depends on it.

## Rebuild

- Migration: `supabase/migrations/20261024000900_cerebro_social_facebook_human_browser_v1.sql`
- Core adapter: `cerebro/runtime/social-facebook-human-browser-v1.mjs`
- Tests: `cerebro/runtime/social-facebook-human-browser-v1.test.mjs`
- Contract: `cerebro/contracts/social-facebook-human-browser-v1.contract.json`

## Current limitation

Browser mechanics and the stable SOC-001 entrypoint are GREEN. Authenticated provider autonomy is still `PENDING_VALID_PROVIDER_CREDENTIAL`; do not claim Facebook login is operational until that canary is green.
