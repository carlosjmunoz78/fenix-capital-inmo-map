# CEREBRO PC-001 · Visible local acceptance fixture V0.1.0 · PREPROD

## Verified on 2026-11-04 (development runner)

- `go test -count=1 -v ./...` → 3 PASS, 0 FAIL (Linux sandbox logic).
- `go vet ./...` and `GOOS=windows GOARCH=amd64 go vet ./...` → PASS.
- `GOOS=windows GOARCH=amd64 go test -c` → Windows test binary compiled.
- Windows amd64 GUI executable build with Go 1.23.2 → PASS.
- Second deterministic Windows build → identical SHA-256 `d150f09b0580311d005b40b74c2dabab3f0b7e2b4e34402444add65afb557758`.
- Physical Windows UI / Win32 SendInput / PrintWindow tests → **PENDING**; this module has **not** remotely operated PC-001.

## Role and security

**This is a LOCAL, visible, manually-authorized acceptance fixture**, not a remote access daemon, AccessBoot replacement, Gateway integration, credential broker or universal production release. It does not open a socket or start at boot, cannot parse arbitrary orders and does not install/remove applications. Never claim FULL_PC_CONTROL from its unit tests.

Run it only on the owner's authorized Windows session by double-clicking `CEREBRO_PC001_CONTROL_LOCAL_V0_1.exe` and accepting the visible Windows dialog. Press **Esc** to interrupt if the test window is active; moving focus away aborts the following synthetic input. It does not request UAC, bypass antivirus, access the internet or consume a paid service.

On acceptance, it:
1. Creates a fresh, isolated folder under `%LOCALAPPDATA%\CEREBRO\PC001\PREPROD\Proofs\<UTC-run-id>`. Never overwrites an earlier run.
2. Writes, reads, copies, moves and renames **synthetic** content; tests a recoverable delete by moving only the synthetic copy into `recovery/deleted.txt` and verifies its hash. Leaves the recovery file available.
3. Opens **its own** visible Win32 test window and edit field, moves/clicks the pointer within this field, types a synthetic phrase using `SendInput`, and reads back the text from that field. If Windows denies focus, integrity or automation, fails closed.
4. Captures **its own foreground test window**, not all displays, into a local PNG; decodes it to verify integrity; **no upload**.
5. Produces `CEREBRO_PC001_CONTROL_RESULT.json` with the observed results and any error. It explicitly sets `gateway_connected=false` and `browser_remote_controlled=false`.

The executable remains separate from all four existing listeners (8765/8766/8767/8768), the recovery supervisor and stored DPAPI backups. **Do not reinstall or replace the existing startup chain.** Uninstall/rollback of this fixture consists of deleting only this fixture's EXE and *optionally* its own test-run directory after examining the recovery file; no registry entries or services are changed.

## Physical acceptance gate

A Windows physical run must provide the actual sanitized `CEREBRO_PC001_CONTROL_RESULT.json`, plus screenshot existence and visible test, with `LOCAL_UI_AND_FILES_PASS_REMOTE_PENDING`, `mouse_input_verified=true`, `keyboard_readback_verified=true`, `screenshot_local_verified=true`, `sandbox.status=PASS`. Failure/partial evidence must not be rewritten as success. No user desktop pixels or credential data should be sent to the chat; the JSON contains only booleans and a local path.

## Integration still missing

The existing `cerebro/runtime/universal-device-command-envelope-v2.mjs` remains the authority for scope, expiry, idempotency and policy. The executable has *no gateway authentication* and therefore cannot be connected to remote orders yet. The next implementation must wrap approved capabilities behind authenticated Gateway/AccessBoot transport with signed/attested device binding, durable ledger, per-command readback, cancel/pause, and physical E2E, before enabling remote UI input. Prefer existing Browser Bridge for browser-level work. Then expand isolated Windows file and app adapters, and only after proving on PC-001 package AccessBoot for a second PC.

Never write into App/CRM/Supabase PROD, WordPress, Trading or arbitrary user folders as part of this fixture. No new subscription is required.