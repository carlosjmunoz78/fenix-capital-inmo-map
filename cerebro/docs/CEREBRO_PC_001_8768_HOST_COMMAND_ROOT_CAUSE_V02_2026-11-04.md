# PC-001 · Controller 8768 — Root cause confirmed and guarded activation V0.2

**Date:** 2026-11-04 · **State:** STATIC_ANALYSIS_HECHO + WINDOWS_BUILD_GREEN + PHYSICAL_ACTIVATION_PENDING. PREPROD. No additional subscription (€0).

## Physical source
The owner provided `CEREBRO_PC_8768_ANALISIS.zip` created by the prior read-only probe of Windows. In the ZIP:
- `CEREBRO-Universal-Controller-V2.exe`: 6,143,488 bytes; exact SHA-256 `78733cce3f2473205f8cf7bb50ee9a73901dd58dcaf2df10ac2748eb6a0aa8ef` (matches prior physical inventory).
- `AUDITORIA_8768.txt` reports exactly one positional argument `SHA256_4740ae63`, sanitized.
- Probe code `cerebro/windows...` (the locally packaged `CEREBRO_PC_8768_INSPECCION_V0_1/src/core.go`) computes `SHA256(token)[:8]`. The token `host` hashes to `4740ae63` exactly; no credentials exposed.

## Grounded static reverse engineering
- Windows PE32+ AMD64, Go 1.23.2, Go module **`cerebro_accessboot_v040`** (`go version -m`).
- Go pclntab function table lists `main.main` at `0x6bab20`, `main.serveHost` at `0x6b8aa0`, `main.installAndPrepare` at `0x6b9a80`.
- Main disassembly at `0x6bab43..0x6bab56` checks argv[1] length 4 and 32-bit little-endian ASCII `host` (`0x74736f68`) then calls `serveHost`. Other argv values, including empty, jump to **`installAndPrepare`**, not authorized for recovery.
- Embedded binary strings include `127.0.0.1:8768`, `/health`, `0.4.0`, `PREPROD`. Historical physical registry 2026-10-19 records this exact controller v0.4.0 locally healthy/paired; not proof of current health.
- Root cause of recovery V0.4/V0.5 `UNKNOWN_FLAGS_FAIL_CLOSED`: those tools did not recognize `host`, even though it is the correct and only statically confirmed server command. The protective block itself operated as designed.

## Precise side-effect scope of V0.2 one-shot
Executable: `CEREBRO_PC_8768_ACTIVACION_V02.exe`, SHA256 `a0c209f548a4246a51a444abb55eb20dab10c4c4aeced558946e10f7d89d6bb3`.
Source/binary ZIP: `CEREBRO_PC_8768_ACTIVACION_V0_2_PREPROD.zip`, SHA256 `c40652beeb64f6c95c62d816a84dee663a235e5704eb5e4219c15052097f01a9`.

Behavior:
1. Read physical monitor V0.2.0 and check PREPROD plus prod/trading/remote-command false. Require health for 8765, 8766 (expected v0.2.0 identity, port 8766, durable queue), 8767.
2. If 8768 already healthy, return idempotently; never duplicate. Read only original HKCU Run `CEREBROUniversalDeviceControllerV2`; accept exactly one positional argument `host`, expected executable name, LocalAppData/CEREBRO boundary + symlink check, known 6,143,488 size and SHA-256.
3. Guard against existing image process even if 8768 not healthy; create DPAPI encrypted backup of original Run value with physical readback; create unique one-shot marker; RECHECK process/health before launch. No HKCU Run, Startup or Task mutation.
4. Launch `exec.Command(exe, "host")` once, no shell/no arbitrary argv, silent/no console. No installation path. Require exact local /health service identity/controller, status OK, version v0.4.0 if reported, prod_allowed=false; test 8765/8766/8767 again.
5. Write `CEREBRO_PC_8768_ACTIVACION_V02.txt` on user's Desktop without paths/credentials. On any unexpected input, fail closed. Do not auto-retry or kill/overwrite processes.
6. It **does not** connect the CEREBRO Gateway, enable remote operation in PROD, test microphone/camera, physically reboot or test rollback.

Development tests: Go unit tests, Go vet Linux/Windows, Windows x64 GUI PE32+ crossbuild, compiled Windows test binary, deterministic rebuild SHA equality, ZIP integrity **PASS**. Physical execution of this candidate **PENDING**.

## Next gate
User executes only the one-shot V0.2 (ordinary Windows user) and uploads the desktop TXT. Then verify gateway authenticated/E2E with exact Command Envelope V2 scopes, old Startup folder scripts and reboot/rollback. Preserve 8765/8766/8767 + V0.7, V0.2 Z-blue monitor, other three channels. No App/CRM/Supabase PROD, Trading REAL or main branch edits.

**POLICY:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
