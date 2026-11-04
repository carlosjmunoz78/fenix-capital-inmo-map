# PC-001 · Safe legacy startup cleanup V1 · 2026-11-04

**Status: CANDIDATE_PREPROD_STATIC_PASS_39_OF_39 · WINDOWS_EXECUTION_PENDING**. Do not treat the candidate as a physically completed cleanup.

## Evidence motivating the change

- PREPROD PC-001 S3 sleep+physical wake was passed and all four localhost health endpoints recovered in the earlier session.
- Authenticated PC ↔ existing PREPROD Gateway v9 `SERVICE_HEALTH/READ_HEALTH` E2E was passed once, with server state `COMPLETED` and semantic readback.
- Current-user continuous worker was confirmed authenticated in the prior Windows session; post-reboot user report `CEREBRO_PC001_CONTINUIDAD_ESTADO(1).json` (2026-11-04T17:00:53Z, Windows boot 16:51:26Z) shows 8765, 8767, 8768 healthy; **8766 unhealthy** and the worker in `HOLD_RETRY_BACKOFF`.
- User photo shows legacy GUI error `WinError 10013` (Winsock access denied). It is **not** direct evidence of port already in use: that is Winsock 10048. Exact process/port exclusion requires on-device inspection.
- Previous V0.7 physically recovered 8766 after correcting explicit `--agent` and port=8766, but reboot persistence did not pass. Legacy Startup `CEREBRO-Device-Agent.cmd` was never audited; keep all currently useful entries unless proven redundant.

## Single one-click repair candidate

Artifact: `CEREBRO_PC001_LIMPIEZA_SEGURA_REINICIO_PREPROD_V1.zip`, SHA-256 `7bbd2b51d0aa64659a6df370bfc017741a923fa13ddfc2f8d27770991883e73e`.

Full source, `.cmd` launchers, static tests, local backup/rollback instructions and MANIFEST are **inside the ZIP**, stored durably in Library at `/CEREBRO_OS/WINDOWS_UNIVERSAL_V0_2026_11_04/CEREBRO_PC001_LIMPIEZA_SEGURA_REINICIO_PREPROD_V1.zip`. Source is **not yet synchronized as an individual `.ps1` file to the repository**.

Entrypoint: `LIMPIAR_PC001_Y_RECUPERAR_8766.cmd`, Windows current user, no admin requested. It validates exact existing PC identity, waits out the owner-specified 180 s Windows boot warmup, probes all four ports and inventories sanitized CEREBRO Run entries, process owners and TCP excluded ports. It never displays raw startup values, paths, secrets, tokens or the vault.

### Exactly permitted reversible mutations
1. If `CEREBRODeviceAgent` and `CEREBRODeviceAgentUniversalV023` contain the identical, byte-checked `CEREBRO-PC-8766-Launcher-V07.exe --startup` and that executable matches the approved SHA-256 `74d9c61249d6cd526c77b2950aaec793d14309c7989df769c4b6485797b51bbd`, encrypt and read back a DPAPI backup of the first Run value. Remove **only** that redundant first Run value; retain the verified universal V07 Run.
2. If the current-user Startup file `CEREBRO-Device-Agent.cmd` is unambiguously unsafe (direct legacy executable with missing `--agent` or explicit installer/repair flag), the verified V07 Run still exists, and the file is not a reparse point: DPAPI-encrypt and check exact bytes, then remove **only** the unsafe CMD file. A script with an unknown role or missing explicit port but possible inherited environment is **not removed**.
3. If port 8766 is unhealthy and 8765/8767/8768 are healthy, no legacy agent process is running, no excluded range affects the ports, no V07 one-shot guard is set and the exact V07 launcher is verified, invoke **the existing V07 `--startup`** once and probe 8766. Do not launch or reinstall the original legacy executable directly, repeat failed agents, disable firewall or force-kill a process.

### Rollback and fail-closed
- `REVERTIR_SOLO_LIMPIEZA_PC001.cmd` restores exclusively this tool's DPAPI-backed Run and Startup file when destinations are still absent, without overwriting newer values.
- `INSPECCION_SOLO_LECTURA_PC001.cmd` runs the exact same inventory without mutations.
- Preserve all binaries, 8765/8767/8768 processes, DPAPI transport vault, primary device identity, User Z tray, App/CRM, Supabase PROD, Trading, scheduled tasks, services and known active startup mechanisms. No new recurring worker or installer.
- No claim of Windows physical validation or post-reboot stability until a `CEREBRO_PC001_LIMPIEZA_RESULTADO.json` plus a subsequent physical reboot prove it.

## Acceptance
- Code/static policy checks: **39/39 PASS** in isolated container.
- ZIP checksum + CRC: **PASS**.
- Native Windows PowerShell syntax/runtime, on-device cleanup, 8766 recovery, post-reboot 4/4 and physical rollback: **PENDING**.
- Additional subscriptions: **0 EUR**. No modifications to production.
- Scope is **PC-001 only**. Do not distribute this device-pinned cleanup tool as universal installer to a second PC. After physical closure, incorporate tested dedupe and recovery policy into existing AccessBoot v0.5.0 universal candidate.
