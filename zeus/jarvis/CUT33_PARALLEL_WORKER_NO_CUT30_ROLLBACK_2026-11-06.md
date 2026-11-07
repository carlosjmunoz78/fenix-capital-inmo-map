# JARVIS · CUT33 · PARALLEL CUT32 LAB · UNBLOCK WITHOUT ROLLING BACK CUT30

**2026-11-06 · Status: code and tests HECHO; parallel cloud Worker NOT CREATED. PROD NO-GO.**

## The actual blocker and why it can be avoided
Work reported the existing CUT30 Worker version `25e98edd-55a8-4222-b834-92f9d5b4bc21` active and access working, but no executable immediate rollback action confirmed, so Work correctly refused to overwrite it. This chat independently opened Cloudflare's real **Implementaciones** dashboard and saw that version active at **100% traffic**, with 4 earlier versions and a `More options` menu on each row. Cloudflare's official docs provide **Deployments → ... → Rollback** and `wrangler rollback <VERSION_ID> --name <worker>`, limited to the 100 latest versions. This proves a documented recovery mechanism exists, **not that it has been tested in this account**.

**Safer plan**: stop trying to overwrite CUT30 for a first physical CUT32 test. Run CUT32 in a **new and different Worker** with its own narrowly scoped Access app; keep the old Worker and exact URL untouched. A failed experiment can be taken offline by disabling **only the new Worker's** `workers.dev` URL. Preserve the D1 source and audit.

## Already implemented and certified
- `core/jarvis-b2-approved-lab-origins.mjs`: exact explicit allowlist for the old `cerebro-jarvis-lab-eu` origin and the new `cerebro-jarvis-cut32-lab-eu` origin. No wildcard, suffix trick, attacker domain or HTTP allowed.
- `core/jarvis-b2-device-enrollment.mjs`: accepts POST only when `request.url.origin` is an approved LAB hostname, the `Origin` header matches the **same** host and the Access identity and administrative time window are valid. Maintains B3/Gateway OFF.
- `core/jarvis-b2-device-setup.mjs`: mobile owner button now serves its page on either **exact LAB hostname** under Access, no tokens or cookies embedded.
- `cloudflare-lab/wrangler-b2-parallel.staging.lab.jsonc`: **distinct Worker name** `cerebro-jarvis-cut32-lab-eu`, `workers_dev:false`, `routes:[]`, all flags false, D1 binding only to EU `988b11e1-21aa-4cf9-8b9d-110319df7ccc`. NOT a deployable public configuration. Avoid overwriting the existing Worker with the same name.
- `core/jarvis-cut33-parallel-stage.test.mjs`: 4 extra tests including real JS handler semantics for staging URL. Total **750/750 PASS**; five workflows green at functional SHA `770936f79073fa04813460d20c60b55ffe7cfe74`, Wrangler parallel Worker **dry-run only** PASS. No remote changes.

## ONE safe administrative operation later, if Work budget permits
1. Inventario read-only Cloudflare: verify Workers Free still has capacity (Cloudflare documents 100 Workers/Free account), no new monthly subscription, current CUT30 and its Access and current URL unchanged.
2. Create a NEW Worker named **`cerebro-jarvis-cut32-lab-eu`** from the PR #25 candidate bundle **with `workers_dev:false` and all switches false**. Don't overwrite or select `cerebro-jarvis-lab-eu`. No DNS, routes, cron, or new D1 creation.
3. Attach a NEW, Worker-scoped Cloudflare Access app (type `worker`) to **only the new Worker** with an allow policy for **the exact approved owner identity**. No `all_workers`, email domain, bypass, or sharing the old app's audience. Access has to be checked in the dashboard before any public URL is enabled.
4. Bind new Worker Secrets `JARVIS_OWNER_EMAIL` and `JARVIS_ACCESS_AUD` for the new Access app **without printing them**. Do not copy old secret values through chat. Set `JARVIS_ACCESS_PROBE_ENABLED=true` only after Access is confirmed. Keep `JARVIS_B2_DEVICE_ENABLED=false`, `JARVIS_B2_ENROLLMENT_ENABLED=false`, `JARVIS_B2_B3_LIVE_ENABLED=false`, `JARVIS_GATEWAY_ENABLED=false`.
5. Only then enable the **new** `workers.dev` hostname, verify **unauthenticated is blocked**, owner GET `/__jarvis/owner-check` returns `ACCESS_OWNER_VERIFIED`, owner authenticated POST returns **405**, and B2 routes remain OFF. In parallel verify old CUT30 still returns its owner-check as before.
6. If any assertion fails, turn off **new** `workers.dev` and leave old CUT30 untouched. **No B2 enrollments yet** during first mission. Do not claim two devices, B10, B3, Gateway or PROD.
7. Later (independent approval and physical PC/mobile presence): create fresh HMAC Secret for new Worker, verify secure D1 0006 and controlled admin enrollment, 10 min and two-device revocation. Close enrollment immediately. Cost measured and rollback new Worker tested.

Cloudflare's official Worker Access policy on **one Worker** protects its `workers.dev`, previews and domains. It is not a good future solution for voice WebSockets: worker-level Access currently returns 403 on WebSocket upgrades. Voice JARVIS V2 later will need hostname-level Access or separate streaming-compatible route. **No modification to ANA or App Fénix.**

## Exact physical Cloudflare evidence
`https://dash.cloudflare.com/e39a57e1ac42650ca5a6d5307cf0ac8e/workers/services/view/cerebro-jarvis-lab-eu/production/deployments` lists old CUT30 current 100% `25e98edd`; older versions `e0964441`, `696ab34b`, `afeb9af8`, `726addb9`. No menu opened and no rollback attempted.

## Constraints
PR #25 remains **DRAFT, no main merge**. No Worker or Access policy was deployed in this CUT33 action. All App/CRM, ANA, Trading, DNS, Supabase, SEO, old Workers, D1 source and two restore databases untouched. No subscriptions or DeepSeek API usage. **PROD NO-GO**.

Refs:
- https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/workers/platform/limits/
