# CEREBRO OS · PC-001 · PREPROD Gateway Continuidad V1 · 2026-11-04

**STATUS:** `CANDIDATE_STATIC_GREEN / WINDOWS_PHYSICAL_INSTALL_REBOOT_ROLLBACK_PENDING`; production DENIED, Trading DENIED. No additional subscription. The existing PREPROD client, Gateway, four local services and AccessBoot candidate are preserved.

## Baseline already physically GREEN
- 8765/8766/8767/8768 all `HTTP 200 OK` before and after real S3 sleep and physical power-button resume.
- Existing `cerebro-device-gateway-preprod` Edge Function v9 in Supabase PREPROD project `hnqlnvakzaywtafeiybt`, already enrolled device `fenix/PREPROD/pc001-windows-v1`.
- One physical authenticated `SERVICE_HEALTH/READ_HEALTH` command reached the Windows PC and returned a sanitized receipt; Supabase confirmed `COMPLETED`, `delivery_attempt=1`, `semantic_verified=true` on 2026-11-04T16:02:09Z.
- One-shot PowerShell client SHA-256 `822f7241d7497b178767f456c5fcb30083370b8003307c264982dfb87902cf38` remained **byte-identical**.

## Incremental continuous transport candidate
- Package: `CEREBRO_PC001_CONTINUIDAD_AUTOARRANQUE_PREPROD_V1.zip`
- Verified artifact SHA-256: `30768678759137ccc2a58b815ebb158d9b9c5d60c7e1c589fd7e015c4738e5f2`; verified ZIP CRC, source hash manifest, static checks 30/30.
- Source scripts, tests and full contract **inside the ZIP** in durable personal Library: `/CEREBRO_OS/WINDOWS_UNIVERSAL_V0_2026_11_04/CEREBRO_PC001_CONTINUIDAD_AUTOARRANQUE_PREPROD_V1.zip`. Not represented as individual GitHub source files; this Markdown is the repository record.
- User-scoped, same-Windows-user installation, **side-by-side** under `%LOCALAPPDATA%\CEREBRO\PC001GatewayTransportV1\worker-v1`. It reuses existing `transport.vault.dpapi` and existing `UniversalControlV0/device.id`; no new identity or credential.
- Adds **one separate HKCU Run entry** `CEREBROPC001GatewayPREPRODV1`. Does not modify/replace any pre-existing Run/Startup/Supervisor entries, task, service, app, DNS, PROD or Trading. It does NOT connect before Windows user login.
- Single-worker mutex, pinned original client SHA-256, read-only command envelope policy, nonce replay guard reused, 180-second periodic outbound poll, 300-second backoff after repeated failures, sanitized local JSON status and secure DPAPI backup of the new registry entry's previous state.
- Strict rollback: `ROLLBACK_SOLO_TRANSPORTE_PC001.cmd` removes/restores **only this new key** after scope/readback checks, signals only this worker to exit, preserves DPAPI transport vault and the four core services. This is **not** a feature for pausing CEREBRO.
- `INSTALAR_CONTINUIDAD_PC001.cmd` installs side by side, `COMPROBAR_CONTINUIDAD_PC001.cmd` records health/worker/autostart/Windows boot readback.

## Acceptance gates
| Gate | State |
|---|---|
| Prior one-shot authenticated PC ↔ Gateway E2E | **HECHO, PHYSICAL VERIFIED** |
| Physical S3 sleep/button wake and 4 service recovery | **HECHO, PHYSICAL VERIFIED** |
| Reusable one-shot client bit-identical | **HECHO** |
| Candidate continuous worker static checks | **30/30 PASS, not Windows executed** |
| Real Windows install and automatic background poll | **PENDING** |
| Same-user login following real Windows reboot | **PENDING** |
| New component's physical rollback/readback | **PENDING** |
| AccessBoot 0.5.0 capture of physical 8765–8768 runtime | **PENDING, do not substitute** |
| Second authorized Windows PC installation | **PENDING** |
| Remote Wake-on-LAN without a verified always-on relay | **HOLD** |
| Generic remote Windows mutations and PROD | **DENIED** |

## Caution
This is **not** the final universal single-EXE installer, nor a general remote-control executor. It is the smallest reversible bridge from the physically proven one-shot transport to user-session continuity while keeping AccessBoot as the eventual packaging target. Gateway usage must be monitored against current provider quotas before claiming measured additional cost EUR 0. Never claim `FULLY_OPERATIONAL` from static tests.
