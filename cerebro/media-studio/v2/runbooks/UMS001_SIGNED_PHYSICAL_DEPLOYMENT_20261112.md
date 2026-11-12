# UMS001 · Physical Cloudflare Ed25519 LAB deployment · 2026-11-12

STATUS: DEPLOYED_AND_ONE_SHOT_ARMED / SIGNED_E2E_PENDING.

## Current physically verified
- Account: `e39a57e1ac42650ca5a6d5307cf0ac8e`.
- Two existing isolated LAB Workers were NOT recreated.
- `cerebro-ums001-signed-orchestrator-lab-eu`: new source version `f024c03d-2a4f-4ae6-accc-ffa0c5bf2ff4`, deployment `6b6f0415-2b97-4fc4-bc6a-3b50e1ec523c`.
- `cerebro-ums001-signed-qa-receiver-lab-eu`: new source version `288f0236-e535-4691-abf8-f919c274bfbf`, deployment `59b8335b-0d04-4f4a-b9be-5891e8f9ef67`.
- All 5 signer and 8 receiver bindings were preserved via versioned `type:inherit` and `bindings_inherit=strict` (verified version GET).
- Signer has `ORCH_SIGNER_PRIVATE_PKCS8_BASE64` secret; receiver has `ORCH_PUBLIC_SPKI_BASE64` secret and `ORCH_PUBLIC_SPKI_SHA256` nonsecret pin. No key values exposed, read or logged.
- New receiver queue consumer `f7e5d436c1c949e09f8921c2c48c1231` added ONLY to `cerebro-ums001-image-signed-command-lab-eu` queue `39d92161f2ac429791bbcc3dfd25c6b8`, batch=1, concurrency=1, retries=1.
- Signer schedule `* * * * *` temporarily armed at 2026-11-12T09:30:54Z. Code performs only ONE archived LinkedIn QA metadata order; `ONCE_KV` one-shot and deadline 2026-11-13T00:00Z. Model payment, publication, PROD and video all FALSE.
- At 2026-11-12T09:34:29Z: signed Queue backlog 0; **no signer ONCE claim and no E2E signed receipt confirmed yet**. Cloudflare cron propagation may be delayed. DO NOT claim green before physical KV and QA readback.
- Original Gateway, App/CRM, WordPress and main have not been modified in this operation.
- GitHub CI shared image/video Ed25519 standalone contract: [run 43187055214](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43187055214) 146/146 pass. The deployed canary remains image-only. Video runtime signature integration remains separately pending.
- Cost: no paid model invocation, no new subscription. Cloudflare Free limits not exceeded by evidence in this gate.

## AUTOMATIC SAFETY FOLLOW-UP / CLEANUP
One-time automation created: `Automation_81b092a956c48191a582732cbfab57bf`, scheduled 2026-11-12T10:53:56+01:00.
It MUST inspect issuer KV 475ba0abb99640848b0bfacfb5431f70 and receiver replay KV 561e0d5ce2be437085144c16eae5f712, QA Queue and physical receipt, THEN **always set signer cron []**, and delete ONLY newly created consumer from signed Queue when safe; avoid duplicate deliveries, report outcome.

## ROLLBACK IDs
Signer previously deployed `cb89d988-ec0f-432d-a429-18176a2c6120`.
Receiver previously deployed `0ebb532e-77a9-4fab-8885-8719799c00fd`.
Re-deploy exactly those versions if the new code violates contract, after stopping cron and consumer. No public routes or DNS changes.

## OPEN GATES
1. Truly signed successful single real Queue command and independent public fingerprint verification (not yet observed).
2. Receiver replay KV + final QA Queue delivery and audit readback.
3. Automatic image creation/edit/quality/rights and paid budget meter for real artifacts.
4. Per-platform social publishing connector authorization and SEO media WordPress integrations.
5. Video-specific runtime and scoped `media.video.qa.metadata` integration using same key material but no extra key pair.

Principle: DO NOT promote merely due to CI green. User authorized expenses and PROD, but policies require technical, rights, cost and rollback gates. Avoid unbounded retries.
