# CEREBRO OS · UMS001 Universal Runtime Broker · LAB E2E 2026-11-12

## Verified
- One shared Worker `cerebro-ums001-universal-runtime-broker-lab-eu` without public subdomain; no Worker per engine.
- FACT LAB central Gateway `cerebro-fact001-gateway-lab-eu-20261109` has additive RPC methods `universalImageCapability`, `universalImageRequest`, `universalImageStatus`, `universalImagePrivateJPEG`, all gated by `CEREBRO_RUNTIME_CALLER_TOKEN`, a private Cloudflare Service Binding and a separate `GATEWAY_CALLER_TOKEN`. Existing public/fetch and read/search queue behavior remains as before; general `GATEWAY_ENABLED=false`, `ALLOW_MUTATIONS=false`, `CLOUDFLARE_API_ENABLED=false`.
- Broker uses private Service Binding `UMS001_PROVISIONER` with `UMS001_RUNTIME_BROKER_TOKEN`; provisioner reuses previously proved Ed25519 signer/registry and emits to original registered-image executor queue. Secrets only in encrypted Cloudflare Worker bindings.
- The broker dynamically accepts any engine with `ACTIVE` key in the signed FACT Vault; it does not hardcode a per-engine adapter. Identity from the central CEREBRO workload is still a **trust requirement**: the Gateway must authenticate the upstream caller; the engine_id cannot be accepted from untrusted public JSON without it.
- Real private canary from the FACT Gateway Queue via the shared Service Binding: `UMS001-LAB-CENTRAL-20261112-01`, motor `FACT-OIDC-LAB-E2E-001`, image 1024×1024 JPEG 633388 bytes, SHA256 `8e0149691f0e7615bd0cf2a7bf8b417937b6cbfcba3dfe9c472e05dfef9e9075`, Factory `PRIVATE_READY`, FACT inbox `PRIVATE_ASSET_RECEIVED`, broker `privateJPEG` actually read bytes and verified SHA in the gateway. No publication. All one-time queue canary branches removed after completion.
- Discovery positive: `FACT-OIDC-LAB-E2E-001` -> `READY_AUTHENTICATED`; negative: `SEO-001` -> `PENDING_FACTORY_IAM`. One-time discovery queue branch removed.
- Real signed Vault currently holds only **3 active TEST motors**, not 177 production motors. Canonical master lists 177 documentary engine IDs; it does not prove runtime installation.

## Operational boundary
Existing GitHub OIDC GitOps path also works across registered FACT branch engines; real workflow run https://github.com/carlosjmunoz78/capital-mapa-pro/actions/runs/43259579088 produces a private JPEG and receipt. This new broker extends the same image factory to **Cloudflare private service-bound runtimes** via FACT central gateway, once per runtime, without per-engine Workers.
**NOT CERTIFIED:** App, CRM, WordPress, SEO, marketing engines outside these runtimes, or 177 logical engines automatically requesting media, because their shared IAM runtimes have not been enrolled/connected. Do not bypass global PROD controls or mark them green.
Other companies not enabled (fenix LAB only). Visual and brand QA, commercial usage and billing verification remain PENDING; no publication.

## Rollback
1. `UNIVERSAL_IMAGE_RUNTIME_ENABLED=false` on FACT LAB Gateway (leaves read/search media and GitOps intact).
2. `BROKER_ENABLED=false` on the new universal runtime broker.
3. Restore backup sources at `.../backups/cerebro-fact001-gateway-lab-eu-20261109/` and `.../backups/cerebro-fact001-ums001-issuer-provisioner-lab-eu/` if code rollback required; preserve existing signed registry, queues and encrypted key vault.
4. No deletion of any existing Workers or changes to App, CRM, Supabase PROD, SEO, WordPress, Facebook/Instagram AUTOQUAL, DNS, Trading or main.
