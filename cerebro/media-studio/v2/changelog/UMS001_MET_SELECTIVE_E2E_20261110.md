# UMS-001 · SELECTIVE MET PRIVATE E2E · 10-11-2026

## HECHO
- Verified from Cloudflare LAB KV at 2026-11-10T18:29:47.755Z.
- Private Producer Gateway → Source Scout Worker → The Met public-domain API → JPEG selected `met:436524`.
- Stored `208766` bytes, SHA-256 `e84f82f453c52151d3a28ef22a22faeefdd5dda51f656c4b089c4b88dab8b508`, media key `media/ums001-met-selected/436524/original.jpg`.
- Verified read back SHA-256 matches selection receipt.
- All old Poly Haven assets conserved: 3 items / 4361001 bytes; one unchanged UMS-001 daily cron.
- Both Workers have no public URLs, previews or schedules. Temporary scheduled test handler and cron were removed.
- No extra subscription, new Worker or new KV namespace. Additional API cost recorded as €0 (Cloudflare account billing not independently checked).
- License CC0, rights review PENDING, production_approved=false, publish_authorized=false.
- Wikimedia Commons OFF (partial availability), Openverse OFF (errors).

## PARCIAL
- A code-level adapter from the CEREBRO orchestrator to the Producer Gateway exists and passes local tests.
- **No physical binding from the global CEREBRO Supervisor/Console or PROD Action Gateway to UMS-001 has been installed.** The existing ACTGW-001 V1 is PREPROD-only; do not bypass its scope to force a LAB binding.
- No second media download authorized. Selected Met asset is pinned and bounded at 600000 bytes per request.

## Versiones
- Source Scout: `f92feacc-c893-4161-84f6-090451feb232`.
- Producer Gateway: `452e95b1-e959-4a8b-8743-8d0f60a19fdd`.
- Prior accepted clean versions: source `b28df730-2063-4703-851f-ef032455c3fb`; Producer `ae82ab76-ffed-4ab7-9514-bb6e518c1fa9`.
- Current switches for bounded LAB: `SCOUT_ACQUIRE_ENABLED=true`, `MET_SELECT_ENABLED=true`. Disable both to close acquisition without affecting metadata search.

## Rollback
- Set `MET_SELECT_ENABLED=false` on Producer and `SCOUT_ACQUIRE_ENABLED=false` on Source Scout. Preserve source metadata flags, secrets and bindings.
- Roll back to prior clean versions if the new modules create regressions, with smoke tests and compare the original three Poly Haven assets.
- Do not delete the new media/receipt silently: isolated provenance evidence remains for audit.
- Never promote automatically to PROD or publish without rights QA, registry/tribunal acceptance and an authenticated real orchestrator caller.

## STATE OF AUTONOMY
- Single selected asset private LAB acquisition: PHYSICALLY_VERIFIED.
- General CEREBRO invocation: DEFINED_TESTED_NOT_WIRED.
- Public media delivery: DISABLED.
