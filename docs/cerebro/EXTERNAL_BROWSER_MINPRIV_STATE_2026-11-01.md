# CEREBRO · External Browser Worker MinPriv · STATE

Date: 2026-11-01
Status: PARCIAL / PREPROD_CANDIDATE

## Baseline protected
- repository: `carlosjmunoz78/fenix-capital-inmo-map`
- baseline main: `4c0a3b20ce9c71cfe78edb01756d45f63d16a478`
- main modified by this block: NO
- PROD modified by this block: NO
- Supabase schema/data modified by this block: NO
- Trading modified by this block: NO
- existing GitHub browser worker replaced: NO

## Candidate branch
- branch: `cerebro/preprod-external-browser-minpriv-20261101`
- execution model: parallel candidate; preserve existing GitHub Actions worker
- additional cost target: 0 EUR

## Minimum privilege contract
Allowed only:
- `CLAIM_BROWSER_JOB`
- `RENEW_BROWSER_JOB_LEASE`
- `ACK_BROWSER_JOB`
- `FAIL_BROWSER_JOB`

Explicitly not authorized:
- enqueue
- queue administration
- profile registration/mutation
- policy mutation
- PROD execution/write
- Trading access
- permission elevation
- raw secrets

Mandatory context:
- `company_id`
- `engine_id`
- `environment=PREPROD`
- `version`

Mandatory binding references:
- identity reference
- account reference
- session reference
- browser profile reference
- fresh browser attestation
- binding evidence reference

## Evidence
- Existing authorized-execution profile remains PREPROD-only and fail-closed.
- Browser session lifecycle requires a fresh LAB/PREPROD attestation.
- First candidate CI run: `41312790982` = SUCCESS.
- Baseline authorized-execution tests = SUCCESS.
- External minimum-privilege tests = SUCCESS.
- Static fail-closed assertions = SUCCESS.

## Important limit
CI GREEN does NOT prove physical browser operation. The candidate deliberately returns `execution_authorized=false` even when its policy checks are eligible. No synthetic or caller-supplied evidence can promote itself to physical authority.

## Current physical state
`POR_AUDITAR_REAL_PROFILE_SESSION_BINDING`

## next_block
`REAL_PROFILE_SESSION_BINDING_VERIFIER`

Goal: verify a real authorized browser profile/session binding in PREPROD and produce non-secret evidence that a minimum-privilege executor can consume. Only after real remote execution + semantic result + audit + rollback may the external route be considered operational.

## Rollback
Delete/disable this candidate branch and its workflow. Existing main/GitHub worker remains the baseline and requires no rollback because this block did not alter it.
