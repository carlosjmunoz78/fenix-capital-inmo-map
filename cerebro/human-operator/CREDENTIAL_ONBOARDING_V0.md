# Credential Onboarding & Access Discovery V0

Status: `DEFINED / NO_CREDENTIAL_CAPTURE_STARTED`

## Objective

Build CEREBRO's authorized access inventory progressively so the owner does not have to remember or repeatedly re-enter credentials.

## Principle

One-time assisted discovery where needed, then persistent autonomous reuse:

`discover account -> classify login method -> register identity/ref -> secure secret/session -> verify -> reuse -> renew/recover automatically`

## Discovery order

For each approved service:

1. detect whether `Chrome CEREBRO FENIX` already has a valid authenticated session;
2. identify service, account alias, company, environment and intended role;
3. classify login mode:
   - existing session only;
   - email/password;
   - Google/Microsoft/Apple/social OAuth;
   - SSO;
   - passkey;
   - API key/token;
   - TOTP MFA;
   - hardware/security key;
   - recovery method;
4. create secret-free identity/account metadata;
5. create credential/session references;
6. persist required secret material in approved encrypted backend where needed;
7. verify login/session reuse;
8. record rotation/expiry/recovery policy;
9. mark scope and allowed consumers;
10. continue to next service.

## Preferred behavior

If an existing session is valid, register and reuse it rather than forcing password discovery.

If a password/refresh token/TOTP seed is required for future unattended reauthentication, persist it through the Local Secret Resolver after explicit authorized onboarding.

## Service inventory target

The actual list must be discovered from the user's approved working environment. Likely categories, not claims of completed access:

- App Fénix / CEREBRO Console;
- GitHub;
- Supabase;
- WordPress/Hostinger;
- Google services;
- Notion;
- email;
- CRM/business tools;
- analytics/SEO tools;
- social/admin tools;
- approved AI/model providers;
- other SaaS encountered during authorized workflows.

No service is marked `VERIFIED_ACCESS` until a real login/session test succeeds.

## Account state model

- `DISCOVERED`
- `LOGIN_METHOD_CLASSIFIED`
- `SECRET_OR_SESSION_REGISTERED`
- `ACCESS_VERIFIED`
- `SESSION_REUSE_VERIFIED`
- `REAUTH_VERIFIED`
- `RECOVERY_VERIFIED`
- `ROTATION_VERIFIED`
- `SUSPENDED`
- `REVOKED`

## Human interaction minimization

Owner interaction is acceptable during initial onboarding only when technically required. After verification, recurring owner interaction should not be the normal path.

The runtime should try, in order:

1. current valid browser session;
2. refresh/OAuth renewal;
3. vault credential;
4. authorized TOTP;
5. recovery flow;
6. canonical HUMAN_REQUIRED only if still unavoidable.

## Special cases

### Social/OAuth login
Prefer persistent authenticated Chrome session + refresh flow. Do not attempt to extract a provider password when it is unnecessary.

### Passkey
Use OS/browser-supported passkey flow only when automation/OS policy permits. Do not export private passkey material through application logs or metadata.

### TOTP
TOTP seed may be persisted in encrypted vault if authorized and provider terms/technical flow permit ordinary TOTP use. Generated codes are transient and never logged/persisted.

### Hardware key / device confirmation
If provider requires a physical security key/device approval that cannot be automated safely, retain session as long as possible and escalate only when reauthentication truly requires it.

### CAPTCHA / anti-abuse
Never bypass. Preserve session, retry normal provider-supported routes or HOLD.

## Evidence per account

Record only:
- account alias;
- provider/service;
- company/environment;
- login mode;
- credential/session ref IDs;
- last verified access timestamp;
- last verified session reuse timestamp;
- expiry/rotation state;
- recovery method status;
- allowed consumers/scopes;
- evidence refs.

Never record secret values in this inventory.

## Acceptance per service

A service reaches `AUTONOMOUS_ACCESS_READY` only after:

- login verified;
- session reuse verified;
- reauthentication path verified or documented provider limitation;
- kill switch verified;
- secret leakage test passed;
- recovery path known;
- correct account/company/role verified.

## Current boundary

No credential/session discovery is executed by this design branch. Physical onboarding starts only after dedicated Chrome/Windows identity and secret resolver pass LAB gates.
