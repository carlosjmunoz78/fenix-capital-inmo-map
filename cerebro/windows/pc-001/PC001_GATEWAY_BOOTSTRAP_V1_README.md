# PC-001 · PREPROD Gateway bootstrap V1 — two-click physical onboarding

Status: **CANDIDATE_PREPROD_STATIC_GREEN / WINDOWS_E2E_PENDING**. No PROD changes. Additional cost 0 EUR.

## Evidence and baseline
- Physical S3 sleep/wake button, four health services 8765/8766/8767/8768 HTTP 200 before/after: **PASS**, user-provided report 2026-11-04 13:21–13:22Z.
- Gateway: existing Edge Function `cerebro-device-gateway-preprod`, PREPROD project `hnqlnvakzaywtafeiybt`, version 9 active; no new function or table.
- Three PREPROD enrolled agents currently represent Android clients; **do not hijack them**. Existing Windows browser transport is LAB-only and unverified as reusable.
- Existing local durable identity: `%LOCALAPPDATA%\CEREBRO\UniversalControlV0\device.id`; the one-click client reads this value and refuses to mint a competing device identity.

## Candidate artifact
- `CEREBRO_PC001_GATEWAY_VINCULACION_PREPROD.zip`
- ZIP SHA-256: `5dfd4e1605911baa52196caf73bedabb006fcc74be327c661f137aec013608c1`.
- PowerShell source SHA-256: `822f7241d7497b178767f456c5fcb30083370b8003307c264982dfb87902cf38`.
- Source and launcher are inside the downloadable ZIP; this documentation **does not assert the source is separately committed to GitHub**.
- Static invariants: 12/12 PASS; **Windows execution, DPAPI behavior, authenticated transport and remote command E2E NOT YET TESTED**.

## Phase 1: first click and private ephemeral secret generation
- `VINCULAR_PC001_PREPROD.cmd` runs `PC001-Gateway-PREPROD.ps1` as current user.
- Verify 4 local health endpoints and PREPROD Gateway `GET /health`; fail closed otherwise.
- Generate 32 random bytes each for one-time pairing code and bearer token on the Windows host.
- Store both **only in local DPAPI CurrentUser encrypted vault** `%LOCALAPPDATA%\CEREBRO\PC001GatewayTransportV1\transport.vault.dpapi`, no raw secrets in reports, chat or GitHub.
- Output `CEREBRO_PC001_VINCULACION_SOLICITUD.json`: existing device ID, `company_id=fenix`, `environment=PREPROD`, `version=pc001-windows-v1`, agent version, and SHA-256 of pairing code only.
- User forwards the sanitized JSON; creation of a one-time server-side pairing is **NOT performed before validation of this physical request**.

## Phase 2: scoped pairing and synthetic E2E (pending)
- Validate request identifier/hash schema and detect existing device scope conflicts. Authorize only exact `fenix/PREPROD/pc001-windows-v1` in the **existing** tables.
- Pairing expiry short (recommended 20 minutes after server activation). Preserve Android and LAB agents; no credential update to any unrelated device.
- For the second click, the same PowerShell script first attempts authenticated reconnect with a new nonce; if not yet enrolled, calls `POST /v1/agents/enroll` using local private pairing code and SHA-256 token, then reconnects.
- Verifies nonce replay rejected, polls the exact-scoped queue and executes **only** `PC-001/SERVICE_HEALTH/READ_HEALTH`, requiring envelope v2 fields, exact policy allowlists, time window, and `prod_allowed=false`; sends sanitized semantic result. All other actions fail closed.
- One-shot client; **no background polling worker, new server, service, scheduled task or auto-start**.

## Gates
| Gate | Status |
|---|---|
| Four Windows localhost services after S3 resume | PASS physical |
| PREPROD Gateway existing Edge Function active | PASS API source read |
| Local PowerShell candidate static safety | PASS 12/12 |
| Local DPAPI actual execution and pairing request | **PENDING Windows** |
| PREPROD pairing creation and readback | **PENDING** |
| Authenticated reconnect + nonce replay negative test | **PENDING** |
| Synthetic remote command poll and sanitized result | **PENDING** |
| Integration into existing AccessBoot shared runtime | **PENDING after E2E** |
| Windows reboot and physical rollback | **PENDING** |
| Internet Wake-on-LAN without always-on relay | **HOLD**, not claimed |
| PROD / Trading permissions | DENIED |

## Rollback / constraints
No changes to App PROD, CRM PROD, Supabase PROD, Trading, existing six startup keys, two Startup-folder scripts, supervisor, ports 8765–8768, or Gateway function. The only new local artifact outside extraction is a DPAPI-protected scoped vault; do not delete or rotate it without explicit authorization after server revocation. Stop before changes that touch unrelated identities.
