# Operativa → Universal Gateway · LAB only (phase V0.2)

- No JARVIS frontend build or production migration. Existing Operativa V4 chat, voice, STOP, catalogue, routes and auth unchanged.
- New preview-only read endpoint `api/cerebro-universal-preview.ts`, guarded by `VERCEL_ENV=preview`, hostname allowlist, optional `VERCEL_URL` equality, same-origin restriction and server-verified existing Fénix owner session. **Only five read methods**. No Command Bus execution, audit export, writes or Trading.
- Reads the **same** `UniversalGatewayLabV0` JavaScript implementation via an import, not a second gateway or hardcoded response. Uses verified FACT registry metadata, not live engine runtime.
- LAB panel attaches only to Operativa's Motors catalogue, only when `?section=operativa&visual_lab=cockpit-v3` on allowlisted preview hostname. Default production UI produces no panel and sends no requests to the new API.
- Browser requests carry the existing user Bearer access token over same-origin HTTPS and the public Supabase publishable key; these are not saved/logged by new code. Supabase Auth server endpoint is only a **GET** against the existing owner context.
- **No deployment triggered:** `vercel.json` has `git.deploymentEnabled=false`. The preview route remains unverified in an actual human session until a controlled authorized LAB deployment can be demonstrated.
- Test gates: Node read security tests, existing 16 V0.1 tests, TypeScript/Vite build, host/preview guard, deny without owner, no real writes and leave prod untouched.
- Cost target additional 0 EUR; GitHub CI minutes are usage and require billing reconciliation.

## LAB-only direct Motors panel for physical Browser E2E
The Preview URL accepts `?section=operativa&visual_lab=cockpit-v3&op3_panel=motores` and opens the existing Motors section on first render. This is strictly hostname-and-preview gated. It does not grant permissions or alter production default routing, jobs, or JARVIS. The panel automatically calls the owner-authenticated read-only Gateway when mounted, so Opera can inspect the resulting status without browser click automation.
