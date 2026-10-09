# CEREBRO · IAM001_LIFECYCLE_AND_REAL_SESSION_BINDING_V0

Date: 2026-10-09
Company: `fenix`
Engine: `IAM-001`
Incremental cost target: `0 EUR`

## Objective

Operationalize credential/session health on top of the already-certified metadata/reference broker without ever copying secret values into CEREBRO.

This block deliberately separates two states:

- credential-reference lifecycle monitoring: automatable now from existing secret stores;
- real browser profile/session binding: remains fail-closed until a fresh LAB/PREPROD attestation exists.

## Credential lifecycle monitoring

The scheduled workflow `CEREBRO IAM001 Lifecycle Health V0` runs every six hours and can also run after controlled changes or manually.

It observes only:

- whether a registered symbolic secret reference is configured;
- expiry metadata (`exp`) for `CEREBRO_E2E_USER_JWT`, decoded in-memory without printing or persisting the JWT;
- provider-managed status for the ephemeral GitHub Actions job token.

It persists only metadata to branch:

`cerebro-iam001-lifecycle-state-v0`

Path:

`cerebro/runtime/iam001-lifecycle-state.v0.json`

No secret value is persisted, logged, returned by the broker, or added to registries.

## Decisions

Per credential reference:

- `HEALTHY_PROVIDER_MANAGED`
- `PRESENT_LIFECYCLE_PARTIAL`
- `HEALTHY_VALID_UNTIL`
- `DEGRADED_NEAR_EXPIRY`
- `HOLD_MISSING_REFERENCE`
- `HOLD_INVALID_EXPIRY_METADATA`
- `HOLD_EXPIRED`

A missing/expired reference blocks only its registered consumer. It does **not** silently become HUMAN_REQUIRED and does not authorize an alternative paid route.

The state also supports explicit kill-switch arrays for credential references, connectors and identities. A disabled credential reference returns `DENY_KILL_SWITCH_DISABLED` independently of current health.

## Browser / computer-use binding

Current canonical repository evidence does not establish a fresh real browser profile/session identity binding. Therefore this block does not claim one.

A valid future attestation must be:

- `LAB` or `PREPROD` only;
- fresh within 15 minutes;
- paired;
- online;
- kill switch enabled;
- cloud transport `ONLINE`;
- Chrome running.

The evaluator stores only SHA-256 hashes of `device_id` and `profile_id`, never the raw identifiers.

Until such an attestation is delivered by an authorized connector, state remains:

`HOLD_BROWSER_REAL_IDENTITY_BINDING_AUDIT`

or the initial equivalent `HOLD_NO_REAL_ATTESTATION`.

No CAPTCHA bypass and no MFA bypass are permitted.

## What remains POR AUDITAR

- automated provider-side rotation/revocation for long-lived references;
- an authorized transport from the real Browser Bridge to submit fresh sanitized attestations;
- provider login/enrollment flows where the provider itself requires human action;
- real browser profile binding in canonical evidence.

These gaps do not justify inventing identities, storing refresh tokens in the repo, or buying a new vault.

## Safety

- raw secret values: FALSE
- PROD authority: FALSE
- PROD write authority: FALSE
- Trading access: FALSE
- MULTIEMPRESA continuation: FALSE
- automatic paid fallback: FALSE
- incremental cost: 0 EUR
- browser is fallback-only
- HUMAN_REQUIRED inference from credential failure: FALSE

## Acceptance

The automated portion of this gate is GREEN when:

1. deterministic lifecycle tests pass;
2. exact-head PR checkout passes;
3. persistent lifecycle state branch validates;
4. every scheduled observation persists metadata only;
5. JWT expiry is represented only as timestamp/TTL metadata;
6. missing/expired references HOLD their consumer;
7. kill switches override health;
8. browser real binding remains HOLD without a fresh attestation;
9. post-merge lifecycle workflow is GREEN;
10. PROD Runtime Smoke remains GREEN and PROD Live Deploy is not activated by this change.

The real-browser subpart remains **PARCIAL / POR AUDITAR** until fresh live attestation evidence exists.

## Next independent block

`EXECUTION_MODEL_ROUTER_ZERO_COST_V0`

That block may proceed independently because browser binding is a fallback capability, not a prerequisite for deterministic/API execution. It must preserve existing connectors, select deterministic/free/self-hosted routes first, enforce hard cost guards and fail closed before any paid fallback.
