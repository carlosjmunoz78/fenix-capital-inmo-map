# CEREBRO OS · PC-001 · 8766 root cause & side-by-side recovery V0.7

**Date:** 2026-11-04. **Environment:** PREPROD only. **State:** local build/tests PASS, physical Windows acceptance PENDING. **Additional cost:** 0 EUR. No App/CRM/Supabase/Trading PROD modifications.

## Grounded incident
- User delivered `CEREBRO_PC_UNIVERSAL023_RESULTADO.txt`: universal 0.2.3 path contains binary SHA-256 `0b8159b8211b2417a0cb8e8d9a3f94c2cf43fcecbd4b70f2328afdbeb7165b07`, **identical** to uploaded legacy v0.4.1 executable. Prior assumption of a different Universal executable is invalid.
- Physical VBS hash `c8639a86307790adfbddf416d81bc4f7e8d11b6b8c6891520c8039f7678f3279`. Script sets `CEREBRO_AGENT_PORT=8766`, `CEREBRO_AGENT_STATE_DIR`, but invokes the EXE in `DeviceAgentUniversal/0.2.3` **without `--agent`**.
- The PyInstaller package contains actual `cerebro_local_agent_server.py`, `cerebro_unified_device_runtime.py` and Python 3.13 bootstrap bytecode. Static disassembly proves the `--agent` branch enters `run_embedded_agent`; without `--agent`, `install_files` invokes `shutil.copy2` on installed files and updates autostart. The title `Error al instalar CEREBRO` is a generic `safe_main` handler and does not by itself prove installation was attempted.
- The local HTTP agent uses `PORT=int(os.environ.get('CEREBRO_AGENT_PORT','8765'))`. Recovery V0.6 used `--agent` but did **not** configure `CEREBRO_AGENT_PORT=8766`. Browser 8765 was alive: default-port collision is plausible. Exact WinError32 locked-file handle/owner remains **unconfirmed**.

## V0.7 repair design (inspectable inside ZIP)
ZIP: `CEREBRO_PC_8766_CORRECCION_V0_7_PREPROD.zip`
SHA256 ZIP: `3ac2d0ad62d502c6d8a0aa0d61712284d6926e55d27b6beadf47cb403c202ece`
Source: `src/*.go`, plus `LEER_PRIMERO.txt`, `ANALISIS_CAUSA.md`, `SHA256SUMS.txt`.
Repository source individual files **not yet synchronized**; canonical source copy preserved in Library.

- `CEREBRO_PC_8766_CORRECCION_V07.exe`: SHA256 `74d9c61249d6cd526c77b2950aaec793d14309c7989df769c4b6485797b51bbd`.
- `CEREBRO_PC_8766_ROLLBACK_V07.exe`: SHA256 `730e6971c41bd43a882ae1974485b0f0f4d20bce18aa4e6675825261afeda8e2`.
- Verify existing monitor `V0.2.0 PREPROD`, 8765/8767 health, **original VBS exact hash**, existing EXE exact hash and paths within `%LOCALAPPDATA%/CEREBRO`, legacy Run path/hash and no existing duplicate process.
- Snapshot **both** existing HKCU Run values encrypted with Windows DPAPI; round-trip restore in-memory prechecked; never print secrets or registry values.
- Single attempt: existing executable `--agent` with `CEREBRO_AGENT_PORT=8766` and canonical existing state directory. Use Win32 mutex and one-shot guard. 8766 accepted only for HTTP 200 containing `status=OK`, `port=8766`, `prod_allowed=false`, `durable_queue=true`, `host=127.0.0.1`, `version=0.2.0`; repeat health before changing Run. If 8766 was healthy before launch, no Run mutation without process ownership evidence.
- **Only after live health evidence:** stage copy of the new launcher under user LocalAppData/CEREBRO/PC001/LauncherV07 without overwrite, point both known Run entries at it and verify exact readback. Old binaries/VBS remain intact. Run launcher uses `--startup`; on future boots it re-validates original source VBS from encrypted backup and avoids duplicate processes.
- Rollback EXE accepts only currently V0.7-owned Run entries and restores both original values from DPAPI. It **does not** terminate processes or guarantee an immediate service rollback.
- Any unknown hash/argument/process, locked file, port mismatch, failed backup, failed smoke or changed Run state **fails closed** without deliberately launching or modifying an unapproved component.
- Physical limitations: the Startup-folder `CEREBRO-Device-Agent.cmd` has **not** been audited; its effect on reboot is unresolved. 8768, Gateway/auth E2E, desktop capabilities, camera/mic, Windows reboot persistence and physical rollback are still pending.

## Validation and acceptance
Local `go test -count=1 ./...` PASS; `go vet` Linux and Windows target PASS; Windows x64 GUI PE32+ build PASS; cross-compiled tests PASS; deterministic rebuild of repair EXE identical SHA PASS; ZIP integrity PASS.

**Not proven:** successful Windows execution or repair. The physical output will be `CEREBRO_PC_8766_CORRECCION_V07.txt` from the Desktop. User need not run any prior V0.5/V0.6 package. Do not conflate restoring one 8766 local listener with full PC connection.

**Policy:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. PC-001 separate from MOB-001, TAB-001 and BRX-001; Gateway central later.
