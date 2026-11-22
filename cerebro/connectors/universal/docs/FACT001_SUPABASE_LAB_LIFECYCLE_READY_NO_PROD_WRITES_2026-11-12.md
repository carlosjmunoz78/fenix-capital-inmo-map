# FACT-001 · Supabase connector · SAFE LAB management adapter, pending real isolated runtime

Date: 2026-11-12. Branch: CEREBRO FACT-001 LAB DRAFT. Does **not** deploy or call Supabase.

The owner approved verification of **CEREBRO's** independent management capability (not merely the ChatGPT connector). Existing own Management PAT is held in Vault as `cerebro_supabase_management_pat_v1`; the current shared broker remains read-only. This module is **not imported into a deployed service**, and cannot acquire or disclose Vault credentials by itself.

Discovery via official Supabase connector on Nov 12:
- Only two active projects: `cluhljgonannaafpmblx` (App/CRM PROD), `hnqlnvakzaywtafeiybt` (other existing dependencies and SEO). Neither is disposable.
- Prod branch listing contains only the default `main`, not an isolated preview project. The map project has no branches.
- No zero-cost isolated preview project reference could be verified. Do not create a potentially billed project/branch.
- A new Edge slug on a production project's default branch still changes that project, even if labelled `-lab`; this is **not a separate isolated LAB**.

New helper: `supabase-mgmt-edge-deployment-lab.mjs`.
- Requires server-side approved LAB project *different from BOTH protected refs*, signed CEREBRO principal, cost 0, and server-held management PAT.
- Frozen target `cerebro-fact001-sb-mgmt-canary-lab`, no user-selected URLs, body, SQL, Auth, Storage, project IDs or credentials.
- One lifecycle: GET absent → deploy inert code v1 (verify_jwt true, always 404) → provider GET → deploy inert v2 → GET → restore exact v1 source → compare bundle SHA → DELETE only owned synthetic canary → GET absent.
- No retries after uncertain errors; reconcile manually. Anonymous user cannot invoke canary functionality.
- Tests simulate HTTP but **do not demonstrate a physical provider call**. The own-identity CEREBRO management writer is **NOT DEPLOYED**, CEREBRO independent create/update **NOT VERIFIED**.

Current production constraints, high-risk SEO RLS findings and previous data flows are unchanged. No client data, App, CRM, DNS, token or subscription modified; no project/branch/function created.

**Next block:** verify an actually isolated preview Supabase project and documented zero additional cost, then put the adapter behind CEREBRO OIDC + Vault within the approved LAB runtime, run physical lifecycle and register provider evidence. Without that, Supabase scoped lifecycle remains PARTIAL. **Never claim 5/5 FULL from CI only.**
