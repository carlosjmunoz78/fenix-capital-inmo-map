# Human Operator Credential & Session Policy V0

Status: `DEFINED / NO_SECRET_MIGRATION / NO_RUNTIME_BINDING`
Date: 2026-10-15

## Owner requirement

CEREBRO must be able to keep authorized accounts available without repeatedly asking the owner to log in. Passwords, refresh tokens, TOTP seeds and other required secrets may therefore be persisted **inside an encrypted credential vault**, while metadata registries, logs, prompts, evidence and Git stay secret-free.

The goal is autonomous authorized access, not repeated human login.

## Existing IAM foundation to preserve

Current `IAM-001` already provides:

- Identity & Access Registry;
- Credential Reference Registry;
- connector-auth registry;
- consumer/environment scoping;
- credential lifecycle health;
- browser attestation;
- kill-switch state;
- provider/GitHub secret-store references.

It is intentionally a metadata/reference broker and currently rejects raw secret values. That behavior remains correct for its public metadata APIs and registries.

## Gap

Human Operator needs a **secret resolver behind IAM-001**, not secret values inside IAM registries.

Target flow:

```text
Human Operator Job
   |
   v
credential_ref_id
   |
   v
IAM-001 authorization decision
   |
   v
Local Secret Resolver
   |
   +--> Windows Credential Manager
   +--> DPAPI user-scope encrypted blob
   +--> existing provider/GitHub secret store
   |
   v
short-lived in-memory lease
   |
   v
login/session refresh
   |
   v
release / zeroize best-effort
```

## Zero-cost Windows V0 backend

### Windows Credential Manager

Use for conventional username/password or opaque service credentials tied to the controlled Windows logon identity.

### DPAPI user scope

Use for structured encrypted local blobs where Credential Manager alone is inconvenient, such as refresh-token bundles, TOTP seed metadata or recovery metadata.

Default: bind to the dedicated Windows user context, **not machine-wide scope**.

DPAPI normally requires the same Windows user/logon context and same computer to decrypt. This is desirable for the first single-PC CEREBRO operator, but backup/recovery must be explicitly tested before relying on it as the only copy of an irreplaceable credential.

### Existing cloud/provider stores

Keep GitHub Actions/provider secret stores for workflows that already use them. Do not migrate them merely for uniformity.

## CredentialSecretRefV0

Metadata only:

- `credential_ref_id`
- `company_id`
- `identity_id`
- `account_id`
- `service`
- `environment`
- `secret_backend`
- `secret_type`
- `target_name`
- `allowed_consumers[]`
- `created_at`
- `verified_at`
- `rotation_policy`
- `recovery_method_ref`
- `kill_switch`

Never include the secret value in this object.

## Supported secret classes target

- PASSWORD
- API_TOKEN
- ACCESS_TOKEN
- REFRESH_TOKEN
- TOTP_SEED
- RECOVERY_SECRET
- CLIENT_SECRET
- COOKIE_SESSION_BUNDLE only when the chosen browser/runtime requires an explicit portable state artifact

Prefer a persistent Chrome profile for browser cookies/sessions instead of exporting cookie bundles unnecessarily.

## Login strategy

Order:

1. valid existing Chrome session;
2. renewable OAuth/refresh flow;
3. stored credentials through secret resolver;
4. stored TOTP when authorized and provider allows normal TOTP use;
5. recovery method;
6. HUMAN_REQUIRED only when a canonical exception really applies or a provider requires non-automatable interaction.

No CAPTCHA/anti-abuse bypass.

## Logging/evidence rules

Allowed:
- credential_ref_id
- provider/service
- account alias
- success/failure class
- expiry metadata
- rotation due
- secret backend class
- authentication method

Forbidden:
- password
- token/JWT value
- refresh token value
- TOTP seed
- generated OTP value unless transient in-process and never persisted/logged
- cookie values
- recovery codes

## Backup and recovery

Before storing unique credentials only in local DPAPI/Windows vault:

- prove backup/recovery path;
- prove what happens after Windows password change/reset;
- document machine-loss recovery;
- keep recovery method separate from the encrypted blob when appropriate;
- test revoke/rotate/delete.

## Acceptance ladder

1. `SYNTHETIC_SECRET_WRITE_READ_DELETE_GREEN`
2. `SAME_USER_RESTART_GREEN`
3. `UNAUTHORIZED_USER_DENY_GREEN`
4. `LOG_REDACTION_GREEN`
5. `KILL_SWITCH_GREEN`
6. `ROTATION_GREEN`
7. `RECOVERY_GREEN`
8. `REAL_AUTHORIZED_ACCOUNT_LOGIN_GREEN`
9. `SESSION_REUSE_GREEN`
10. `REAUTH_AFTER_EXPIRY_GREEN`

## Isolation

This file does not modify IAM-001 or any secret store. Physical implementation waits until current Skills/shared-runtime work is closed and a dedicated LAB Windows user/profile is selected.

## Cost

Additional subscription target: `0 EUR`.
