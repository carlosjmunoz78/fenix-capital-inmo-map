# PC-001 · Post-reboot 480s incident and accurate-clock diagnostic · 2026-11-04

## Physical evidence

User upload `CEREBRO_PC001_ARRANQUE_ESTADO(5).json`:
- `checked_utc=2026-11-04T18:44:42.0047540Z`; `windows_boot_utc=2026-11-04T18:33:10.5000000Z`; `boot_age_seconds=691` (> owner configured 480s).
- Configured Run `CEREBROPC001OrderedStartupV1` valid and old three Run values suppressed.
- Local health: 8767 **OK**, 8765/8766/8768 **OFF**, therefore physical reboot acceptance **FAIL** at 691s after OS boot.
- Check report: `worker_status=WAIT_BOOT_WARMUP_480S` and `worker_status_age_seconds=0`; Gateway worker `HOLD_RETRY_BACKOFF`, reported age 0.
- The old read-only checker computes `[DateTime]::UtcNow - [datetime]$x.checked_utc`. On systems where the ISO-8601 Z parsed to local DateTime, this mixes local ticks with UTC ticks and then clamps negative values to zero. **Zero-age reading is unreliable**; this is a code defect in the checker, not evidence that worker is alive and fresh. Worker uses 480s from **worker process launch/user login**, not Windows boot; its actual start is not exposed by the old checker. Cause of continuing WAIT beyond 691s OS boot **not yet confirmed**.
- Supabase PREPROD read at `2026-11-04T18:46:36.333Z` gave same exact device new heartbeat `2026-11-04T18:46:31.153Z` age **5s**: backend transport **REJOINED after earlier stale report**. This does NOT independently prove all four local ports are green at 18:46.

## New read-only forensic check: no boot/install modification

Artifact: `CEREBRO_PC001_DIAGNOSTICO_TIEMPO_REAL_V1.zip`.
SHA256 ZIP: `8e82ad3c7d3038b840a65b721e0f4e2830e37a50f719b45b01420cfa4920f8c0`.
Library: `/CEREBRO_OS/WINDOWS_UNIVERSAL_V0_2026_11_04/CEREBRO_PC001_DIAGNOSTICO_TIEMPO_REAL_V1.zip`.
Static assertions: **20/20 PASS**. CRC and ZIP manifest SHA256: PASS. Windows PowerShell physical run **PENDING**.

Entrypoint: `COMPROBAR_PC001_ESTADO_REAL.cmd` extracted beside `PC001-Diagnostico-Tiempo-Real.ps1`.
Output distinct from old reports: `CEREBRO_PC001_ESTADO_REAL_POST_REINICIO.json`.

The diagnostic:
- Uses `DateTimeOffset.Parse` and UTC arithmetic for correct `worker.status_age_seconds`, `worker.worker_started_age_seconds`, and Gateway status age;
- Locally distinguishes actual 480s elapsed **since Windows boot** vs 480s elapsed **since supervisor launch**;
- Queries exact own PowerShell script process count and PIDs with sanitized filters (no command lines exported); checks stop marker and exact installed file hashes;
- Rechecks four loopback health endpoints without mutations; validates owned Run and DPAPI backup existence;
- Preserves four services, existing scripts, Run, tasks, credentials, PROD, Trading and workers; does not run installers or any repair.

## Decision gate on returned JSON

1. If `health_4_of_4=true`, consider local health CURRENTLY GREEN, require fresh backend heartbeat and independent post-reboot no-other-tool confirmation before marking autonomous 4/4.
2. If `worker_script_processes=0`, investigate missing/terminated worker/stop marker, not waiting period.
3. If `worker_started_age_seconds<480`, its start was after boot; inspect startup slowness and adapt delays anchored to actual login/boot only if needed. Do **not** extend 8 minutes arbitrarily.
4. If worker exists and `worker_started_age_seconds>=480` while status remains WAIT, inspect precise PowerShell runtime and status-write failures; do not kill the process blindly.
5. If state shows a failed recovery attempt, read sanitized `last-recovery.json` from Windows safely and repair the exact error.
6. Do not enable general remote Windows mutations or single-EXE multi-PC rollout until boot stability/rollback accepted.

**No changes to Windows have been made by this turn.** The existing installed worker is still V3 SHA-pin `ee93ce1ddf1a0e802747a64af61db9690c5834665420ae3421155c79bc39044c`, last verified in uploaded patch receipt.
