# CEREBRO OS · JARVIS V2 · CUT31 · REAL ACCESS → B2 SESSION BINDING

**Date:** 2026-11-06 · **CUT30 physical owner Access verified** · CUT31 verified in LAB code/CI **NOT DEPLOYED** · PROD **NO-GO**.

## Ground truth: CUT30 physical Access
Work's evidence `JARVIS_CUT30_ESTADO_REAL_2026-11-06.json` in Library `libfile_c35628e1db1481918e10b976ec740b6b` confirms that **Zero Trust Free ($0/month)** and a new single-Worker Access application are configured. The live LAB endpoint:
`https://cerebro-jarvis-lab-eu.carlosj-munozcabeza.workers.dev/__jarvis/owner-check`
returned `ACCESS_OWNER_VERIFIED`, while requests without authentication returned Access login and a forbidden GET route returned the handler 404.

**Not certified yet:** rejection of a second real authenticated user; authenticated POST denial; actual rollback exercise. Access limited to **one Worker and exact owner email**; secrets `JARVIS_ACCESS_AUD` and `JARVIS_OWNER_EMAIL` stored by Cloudflare and values not extracted. B2/B3/Gateway remain OFF. Access identity alone is **NOT** the B2 enrollment or a B3 grant.

## CUT31 code: reuse existing contracts, NOT another server
- `core/jarvis-access-b2-session-verifier.mjs`: strict, default-OFF LAB verifier accepting **only** direct Worker `ctx.access`, exact Access AUD and owner email held in Worker Secrets, server-only ownerId, Cloudflare Access identity UUID and issued-at. Uses Workers-compatible WebCrypto HMAC-SHA256 using a secret key supplied only by a future protected environment. Queries `jarvis_lab_session_binding_v0` only through existing `core/jarvis-d1-session-store.mjs`. Rejects missing/non-matching/revoked/expired sessions, malformed identity and DB outage. No session auto-enrollment and no IAM role if binding absent.
- A test initially identified JS RegExp's coercion of undefined ownerId; fixed to reject non-string ID before D1 read. Confirmed full CI.
- `cloudflare-lab/worker-b2-read-probe.mjs` adds only GET `/__jarvis/b2-status` to the **same** candidate Worker runtime, preserving `/__jarvis/owner-check`. Response on a pre-enrolled active B2 binding indicates `B2_SESSION_VERIFIED_NO_B3_GRANTS`; no owner identifiers, hashes, tokens, email or data records are returned.
- `wrangler-b2-read-probe.candidate.lab.jsonc` binds only the existing EU D1 `988b11e1-21aa-4cf9-8b9d-110319df7ccc`, sets ALL new B2/B3/Gateway toggles to **false**, keeps `workers_dev:false`, `routes:[]`, no Observability and NO secrets in Git. **A dry-run bundle is not a deployed Worker**.
- B3 remains OFF, zero authorized grants. Existing source App/CRM/Workers remain unchanged.

### Physical identity caveat
Cloudflare `ctx.access.getIdentity()` provides an authenticated user identity including UUID and login time. The proposed HMAC binds owner+uuid+iat, **but no independent proof yet shows these distinguish two actual device sessions**. If the same Access login issued-at is reused on devices, revocation could be shared. Before using B2 in any real mission, validate session uniqueness on two devices and, if needed, use a signed Access JWT session identifier validated against Cloudflare JWKS. Never trust an unvalidated `Cf-Access-Jwt-Assertion` header, nor forward `ctx.access` through Service Bindings. Source: https://developers.cloudflare.com/workers/configuration/cloudflare-access/ and https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/ .

## CI proof
CUT31 functional SHA `fbb2c41bb3161f03ec7fddc2c119ef9b7d518343`. Five workflows SUCCESS: Universal Core `42195229797` **721 tests PASS / 0 fail**, physical ephemeral PostgreSQL CUT15+CUT17 gates PASS, Wrangler D1 LOCAL + CUT31 Access B2 candidate build `42195230008` SUCCESS, B4 `42195229795`, B7 `42195229791`, Governed `42195229782`. No promotion.

## Next secure and limited physical step
1. Continue **same** protected LAB Worker, no new subscriptions or extra long-running servers. Before updating it, snapshot current deployed version, Access policy and Worker secrets; preserve rollback.
2. Verify real unauthorized Access identity and authenticated POST through the browser session without extracting tokens; failure to complete = partial CUT30, not necessarily a PROD safety proof.
3. Add one-time *trusted administrative* enrollment with human approval for OWNER_ROOT (HIGH_RISK), separate from the public Worker request path. Bind real session HMAC in EU D1 only after verifying issuer identity, user uuid, issued-at and session uniqueness. Never auto-enroll solely because email matches.
4. If session uniqueness and credential handling pass, stage CUT31 candidate OFF, verify Access remains active before toggling B2 status on; confirm absent/revoked binding denies. B3 and Gateway remain OFF.
5. Then B3 minimal `MISSION_INSPECT` grant, audit and read-only Gateway, two physical devices, OLD/NEW, rollback, B10 independent, voice JARVIS V2 and DeepSeek replacement thereafter.

**Protect:** App Fénix and ANA, CRM, PROD, Supabase, Trading, SEO, DNS, main, two old Workers, source and restore EU D1 data, VOICE-001 PR24. All secrets remain outside the repository. **Cut31 did not modify Cloudflare live.**
