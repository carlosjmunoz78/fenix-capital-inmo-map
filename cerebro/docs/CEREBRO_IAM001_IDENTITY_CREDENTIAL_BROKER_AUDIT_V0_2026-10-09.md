# CEREBRO · IAM-001 · Identity & Credential Broker Audit/Foundation V0

Date: 2026-10-09
Company: `fenix`
Engine: `IAM-001`
Mode: metadata/reference foundation only
Incremental cost: `0 EUR`

## Purpose

Create the minimum safe foundation for identity, account, session, credential-reference and connector authentication governance **without copying any credential value into CEREBRO** and without introducing a new paid vault.

This block follows:

`CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`

Existing secret stores and provider-managed credentials are preserved. CEREBRO only registers symbolic references and the evidence-backed consumers/environments around them.

## Evidence-backed inventory at audit cutoff

Audit cutoff main SHA: `944cca8fe862b165e414129e065c4197367a53c0`.

### GitHub Actions workload identity

**EXISTING / EVIDENCED**

- GitHub's ephemeral `github.token` is already consumed by workflows.
- Effective permission is defined per workflow through the GitHub Actions `permissions` block.
- Job lifetime/expiry is provider-managed.
- This is registered as `credref:github-actions-token`; no token value is stored.

Evidence: `.github/workflows/prod-live-deploy.yml`, `.github/workflows/cerebro-skill-github-preprod-integration.yml`.

### Supabase PROD publishable browser key

**EXISTING / PARTIAL LIFECYCLE**

- Symbolic repository secret: `PROD_SUPABASE_PUBLISHABLE_KEY`.
- Current secret-reference audit explicitly checks presence and `sb_publishable_*` class without exposing the value.
- Used by PROD build/runtime/read-only gates.
- Rotation, expiry and provider-side revocation lifecycle are **POR AUDITAR**; they are not inferred.

Evidence: `.github/workflows/cerebro-secret-ref-audit.yml`, `.github/workflows/prod-live-deploy.yml`, `.github/workflows/prod-runtime-smoke.yml`.

### Supabase legacy anonymous JWT

**EXISTING / LEGACY**

- Symbolic repository secret: `PROD_SUPABASE_LEGACY_ANON_JWT`.
- Current observed use is runtime smoke / negative-auth validation.
- Rotation/expiry/revocation are **POR AUDITAR**.

Evidence: `.github/workflows/cerebro-secret-ref-audit.yml`, `.github/workflows/prod-runtime-smoke.yml`.

### Authenticated E2E user session

**PARCIAL / HIGH-PRIORITY LIFECYCLE GAP**

- Symbolic repository secret: `CEREBRO_E2E_USER_JWT`.
- The gate uses it only for authenticated read-only OLD vs NEW parity.
- When absent, the existing workflow classifies the check as `POR_AUDITAR_MISSING_SECURE_TOKEN` rather than fabricating an identity.
- No automated refresh/renewal lifecycle is evidenced in the canonical repo. Expiry, rotation and revocation therefore remain **POR AUDITAR**.

Evidence: `.github/workflows/cerebro-session-context-auth-e2e.yml`, `scripts/cerebro-secdef-canary-auth-e2e.sh`.

### Notion private-document integration

**EXISTING / PARTIAL SCOPE**

- Symbolic repository secret: `NOTION_TOKEN`.
- It is used by the private physical-document gate to download allowlisted private PDFs read-only and fixtures are deleted afterwards.
- Provider-side effective permission scope, rotation and revocation are **POR AUDITAR**.

Evidence: `.github/workflows/private-physical-document-gate.yml`.

### Gemini free-tier LAB provider

**EXISTING / LAB ONLY**

- Symbolic repository secret: `CEREBRO_GEMINI_API_KEY`.
- Existing behavioral gates restrict use to synthetic LAB data, hard call quotas and no paid fallback.
- PROD data, customer data, PROD write and Trading are explicitly false in those gates.
- Credential lifecycle remains **POR AUDITAR**.

Evidence: `.github/workflows/cerebro-skill-agent-browser-behavioral-lab.yml`, `.github/workflows/cerebro-skill-supabase-behavioral-lab.yml`.

### Owner private mail transport

**EXISTING / PARTIAL LIFECYCLE**

- Symbolic repository secrets: `CEREBRO_MAIL_USERNAME`, `CEREBRO_MAIL_PASSWORD`, `CEREBRO_OWNER_EMAIL`.
- Existing Human Communication V1 uses Gmail IMAP/SMTP and fails closed if the transport is not configured when a delivery is due.
- The new IAM foundation does not replace this transport.
- Rotation/revocation/change-control metadata remain **POR AUDITAR**.

Evidence: `.github/workflows/cerebro-human-communication-v1.yml`.

### Browser / computer-use identity

**POR AUDITAR REAL SESSION BINDING**

- There is a certified synthetic `agent-browser` behavioral LAB candidate.
- That evidence explicitly forbids PROD/customer data, PROD writes, Trading and external skill code execution.
- The canonical repository does **not** provide evidence of a real browser identity/profile/session binding for IAM purposes.
- Therefore real browser execution remains HOLD and browser/computer use stays a fallback route.
- CAPTCHA/MFA bypass is forbidden.

Evidence: `.github/workflows/cerebro-skill-agent-browser-behavioral-lab.yml`.

## New foundation

Three metadata-only registries are added:

1. `cerebro/registry/identity-access-registry.v0.json`
2. `cerebro/registry/credential-reference-registry.v0.json`
3. `cerebro/registry/connector-auth-registry.v0.json`

And one deterministic broker:

`cerebro/governance/identity-credential-broker.mjs`

The broker **never resolves or returns a secret value**. It only answers whether a symbolic credential reference is registered for a particular consumer/environment and states that the actual value must be injected at runtime by the already-existing secret store.

Unknown identity, unknown credential reference, wrong consumer or wrong environment is denied fail-closed.

## Connector preference

The registered policy order is:

`OFFICIAL_INTEGRATION -> AUTHORIZED_MCP -> API_OR_WEBHOOK -> SCRIPT_CLI_OSS -> BROWSER_COMPUTER_USE -> FACT001_BUILD_CONNECTOR`

Browser/computer use is fallback-only, auditable, and cannot bypass CAPTCHA or MFA.

## What this does NOT claim

This V0 does **not** claim:

- a centralized vault is operational;
- provider-side permission scopes have been fully audited;
- all account sessions have automatic refresh/rotation/revocation;
- a real browser session/profile has been safely bound;
- PROD execution authority has been granted;
- Trading credentials are available;
- MULTIEMPRESA identity isolation has been activated in this mission.

No new subscription or paid vault is introduced because the current evidence does not justify one.

## Acceptance

GREEN requires:

- `IAM-001` exists in the canonical Engine Registry;
- all three registries have deny-by-default behavior;
- no raw secret-value fields/material are accepted;
- every identity/connector credential reference resolves to the credential registry;
- wrong consumer/environment is denied;
- the E2E JWT lifecycle gap remains explicit;
- real browser session binding remains HOLD;
- existing secret-reference/workflow evidence strings remain present;
- PROD authority/write, Trading and MULTIEMPRESA remain false;
- incremental cost remains 0 EUR;
- post-merge runtime smoke stays GREEN and PROD deploy is not activated by this change.

## Next gate

`IAM001_LIFECYCLE_AND_REAL_SESSION_BINDING_V0`

Next work must close lifecycle gaps using existing/free mechanisms first: expiry detection, refresh/rotation/revocation metadata, kill switches, session health and real browser-profile binding in LAB/PREPROD. Provider login, MFA, CAPTCHA or account enrollment must never be bypassed and may become a legitimate human exception when provider policy requires it.
