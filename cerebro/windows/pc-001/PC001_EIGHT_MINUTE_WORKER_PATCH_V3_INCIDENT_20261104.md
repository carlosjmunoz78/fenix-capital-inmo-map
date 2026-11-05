# CEREBRO PC001 · 480s timing patch V2 failure and V3 correction · 2026-11-04

## Physical Windows evidence (uploaded result)

- Uploaded `CEREBRO_PC001_ESPERA_8_MIN_RESULTADO.json` time 2026-11-04T18:19:06.0193166Z.
- Report `status=HOLD_FAIL_CLOSED`, `phase=ATOMIC_UPDATE`, new SHA expected `ee93ce1ddf1a0e802747a64af61db9690c5834665420ae3421155c79bc39044c`, installed actual SHA **still old** `e1bbfac1dbe4d5592ed5083b1e604698597a6d24cfc16e387d65af4e51531165`.
- V2 restarted its OWN worker (report status `FAILURE_RESTART_ATTEMPT_WAIT_BOOT_WARMUP_180S`) and retained backup. Original Run and three previously removed Run entries were untouched, PROD unchanged. **Do not claim the 8-minute policy is active on Windows.**
- V2 used `[IO.File]::Replace($temporary,$Target,$null)` and recorded **no Windows error code**; source of the atomic replacement failure is not yet confirmed.

## Corrective V3 candidate

- ZIP `CEREBRO_PC001_ESPERA_8_MIN_CORRECCION_V3_PREPROD.zip`.
- SHA256 `1411c6aba7d306ccd971e4a566dc50ce838a84987de45a4bd9cae49d8c640425`.
- Library copy: `/CEREBRO_OS/WINDOWS_UNIVERSAL_V0_2026_11_04/CEREBRO_PC001_ESPERA_8_MIN_CORRECCION_V3_PREPROD.zip`.
- All source scripts, README, sanitized reporting, cmd wrappers, SHA-256 manifest, tests inside ZIP.
- **51/51** static contract tests pass; ZIP CRC and per-file SHA readback pass. No Windows PowerShell physical execution yet.
- `ACTIVAR_ESPERA_8_MIN_PC001_V3.cmd` reuses existing old backup only when SHA matches pinned old worker, verifies exact device/Run/Recovery executable, asks only the owned worker to exit and waits for its mutex, stages 480-second pinned worker, then calls Windows `MoveFileExW(REPLACE_EXISTING|WRITE_THROUGH)` and verifies destination SHA. Bounded retries for Win32 sharing errors 5, 32, 33. No Run/service/task/port/firewall edits, no process kills, no PRODUCTION.
- If swap fails, JSON now includes `failure_class` and `atomic_swap_win32_error` (numeric; no paths/secrets), attempts to restart original worker and retains backup.
- If already updated, idempotently reports `ALREADY_UPDATED_8_MIN`. Rollback `REVERTIR_ESPERA_8_MIN_PC001_V3.cmd` affects only owned worker script, not Run migration.
- **Acceptance:** actual Windows JSON `status=UPDATED_TO_8_MIN_RESTARTED_OWN_WORKER` (or `ALREADY_UPDATED_8_MIN`), installed SHA `ee93...`, then next physical Windows reboot with 480s warmup and Gateway fresh heartbeat, 4/4, and rollback. A STATIC PASS IS NOT E2E.

## User's actual longer-term objective

A distinct requirements contract `PC001_CONTROL_TOTAL_WINDOWS_OBJETIVO_Y_GATES_V1_20261104.md` records the full computer-use scope: screen/mouse/keyboard/browser/files/programs/peripherals, cross-PC and policies. Wake/sleep/autostart are prerequisites, not the definition of full PC control. Voice/mobile calls are later work.
