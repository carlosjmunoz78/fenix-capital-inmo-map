# JARVIS CUT32 · B2 PER-DEVICE COOKIES + ONE-TIME LAB ENROLLMENT
**2026-11-06 · LAB CERTIFIED · PHYSICAL DEPLOY PENDING · PROD NO-GO.**

## Why the redesign was necessary
Cloudflare Access verifies the user's identity, but `ctx.access.getIdentity().user_uuid` is the *user ID*. Its `iat` indicates login time, not an independently validated unique device-session. Deriving a B2 session exclusively from user_uuid+iat (CUT31 candidate) cannot prove independent phone/PC revocation. **Keep CUT31 historical but do not promote it for physical devices.** <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/>

## CUT32 built in the PR, NOTHING deployed
- `zeus/jarvis/core/jarvis-b2-device-session-gate.mjs`: server-only, LAB/OFF by default. Requires direct Cloudflare Access authenticated `ctx.access`, exact audience and owner email, authenticated Access UUID, and **independently issued 256-bit random `__Host-jarvis_b2` cookie**. Computes HMAC-SHA256 over `jarvis-b2-device-v1\0` + owner + Access UUID + cookie with a Worker Secret key. Looks up the matching active, unrevoked, unexpired HMAC in the EXISTING EU D1 table. Does not auto-create sessions and does not return the cookie or hashes.
- `zeus/jarvis/core/jarvis-b2-device-enrollment.mjs`: protected candidate only, OFF by default. Requires exact Access owner, same-origin POST, explicit server enrollment switch and a closeout time no more than **10 minutes** ahead, max two active LAB device records, **30-minute** session TTL. Creates a session binding and separate audit row with `D1.batch()` transactional insert, returns a `Secure; HttpOnly; SameSite=Strict; Path=/` host-only cookie only after both writes confirm. No B3 grant, no session issuance on GET, no public credentials or admin self-enrolment outside approved window.
- `zeus/jarvis/cloudflare-lab/0006_jarvis_d1_b2_device_enrollment_audit_lab.sql`: new append-only audit table/triggers/index, **additive**. It is NOT yet in remote EU D1, which still has 0001–0005 (seven tables). Wrangler OFFLINE acceptance applied 0006 with synthetic audit and verified immutable delete rejection plus independent SQLite file restore.
- `zeus/jarvis/cloudflare-lab/worker-b2-device-probe.mjs`: new candidate for **the same LAB Worker**. Keeps `/__jarvis/owner-check`, additionally `GET /__jarvis/b2-device-status` and short-window `POST /__jarvis/b2-device-enroll`. `JARVIS_B2_DEVICE_ENABLED=false` and `JARVIS_B2_ENROLLMENT_ENABLED=false` defaults; B3/Gateway OFF. Candidate does NOT deploy or modify the Access app.
- `zeus/jarvis/cloudflare-lab/wrangler-b2-device.candidate.lab.jsonc` remains intentionally nonpublic, `workers_dev=false`, `routes=[]`. **Never deploy it verbatim against the LIVE CUT30 Worker**, because that would switch off its existing `workers.dev` endpoint. A separate, controlled rollout must explicitly retain its currently protected URL, Access policy, secrets and old Worker version, first.

## Cert evidence
SHA `976d5b0d16b209f062e03a7056da3d3cb660af25`. Node **739 PASS / 0 FAIL** Core run `42198389955`; official Wrangler local D1 migration 0006, immutable audit, backup/restore and compilation run `42198389759` SUCCESS. B4 `42198389752`, B7 `42198389881`, Governed `42198389981`: all SUCCESS. No promotion.

Two **synthetic** independent browser cookies A/B under the same Access user yield different HMACs; revoking A denies A and leaves B intact. This is not yet a physical two-device test, and no real owner has been enrolled. D1 remote still has NO 0006 and CUT30 owner-check remains the only deployed endpoint.

## Next physical cloud block (one Work mission, no repeat research)
1. Snapshot current live CUT30 Worker version, route, scoped Access app/policy, two encrypted secrets and D1 source/restore schema+metadata, noting live URL remains protected. Do not retrieve or print actual secret contents. Confirm Workers/Zero Trust Free and 0 new subscription.
2. Complete **CUT30 negative tests** with authenticated POST and an unrelated real Access identity if available (if not, mark not tested, no fabricated proof).
3. Create an independent **D1 EU remote snapshot**; apply ONLY `0006` to source EU D1 `988b11e1-21aa-4cf9-8b9d-110319df7ccc`, validate 8 tables, 6 indexes, 6 triggers (original 7/5/4 + 0006). Verify SQL export and import in isolated recovery D1 EU **without overwriting or deleting any existing backup**.
4. Only after reviewing CUT32 and passing entry controls: stage new Worker candidate, preserve existing Access and `workers.dev` URL, `JARVIS_GATEWAY_ENABLED=false`, `JARVIS_B2_B3_LIVE_ENABLED=false`; set `JARVIS_B2_HMAC_KEY_HEX`, `JARVIS_OWNER_ID` as protected secrets (never chat/repo). Confirm old `/__jarvis/owner-check` still responds.
5. OWNER_ROOT enrollment is HIGH_RISK: execute only after authenticated human owner approval and independently confirmed session origin. Enable 10-min window, owner performs the same-origin enrollment request from browser on PC and (if available) mobile. Verify two DIFFERENT active session HMAC records in EU D1, no cookie printed; then immediately turn enrollment OFF.
6. Verify GET B2 status from both physical devices and revocation of A while B continues working. Confirm recovery/rollback and true cost. Keep B3 grants and live Gateway OFF until B10 gates; NO PROD promotion.

If any stage is uncertain or requires personal authorization, **STOP that stage** and return actionable evidence. No automatic token retries, no payments, no App/CRM/main/DNS/Trading/Supabase/ANA/old Worker changes.

## Security & operations
`D1.batch()` is transactional and rolls back on statement failure according to Cloudflare documentation: https://developers.cloudflare.com/d1/worker-api/d1-database/ . No rate limiting/account-wide cap is implied by max 2 sessions. The D1 binding must remain private server-side; D1 has no PostgreSQL RLS.

**VOICE & AI continuity:** Universal owned JARVIS V2 voice on all CEREBRO surfaces, ANA only on ordinary Fénix App, no pay-per-phrase dependency; voice integration after identity/Gateway. DeepSeek 50 € remains temporary cap, with eventual removal after independent parity eval; no inference initiated here.

**Rollback:** GitHub CUT32 is PR25 DRAFT, no LIVE changes made in CUT32. Future Work must record exact previous CUT30 deployment and test restore without changing legacy Workers or passwords.
