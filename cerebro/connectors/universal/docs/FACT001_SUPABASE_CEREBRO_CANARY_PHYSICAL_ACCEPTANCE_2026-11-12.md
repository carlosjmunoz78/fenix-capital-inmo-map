# FACT-001 · Supabase · CEREBRO management LAB canary physical acceptance (2026-11-12)

**Scope physically accepted: one NEW temporary synthetic Edge Function only, without using ChatGPT OAuth for execution.** Operator bootstrap via Supabase official connector; actual canary lifecycle via independent CEREBRO service identity, GitHub owner-signed OIDC and its own management PAT kept in Supabase Vault.

### Baseline
- Both existing projects are protected: `cluhljgonannaafpmblx` and `hnqlnvakzaywtafeiybt`. Owner explicitly authorized creation, update, restore and final deletion of a NEW isolated canary in existing project, not alteration of existing resources.
- Operator created only for CEREBRO: `cerebro-fact001-sb-mgmt-owner-lab` v1 ACTIVE, intentionally retained for connector, `verify_jwt=false` at Supabase edge layer because it cryptographically enforces Github OIDC RS256 inside handler. Anonymous and forged OIDC 401; valid signature with PROD order 403. No exposed management PAT; PAT `cerebro_supabase_management_pat_v1` only read server-side from Vault.

### Physical verification
1. First signed workflow #43194779877: negative identity gates passed; read-only preflight returned `ABSENT_VERIFIED`. Runner misread the successful status and aborted **before any canary creation**; no provider mutation.
2. Corrected signed workflow [#43194932955](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43194932955): `preflight=ABSENT_VERIFIED`, `create=CREATE_VERIFIED` (real Management API deploy/readback), `update=UPDATE_VERIFIED`, `restore=RESTORE_SOURCE_DEPLOYED` (v3). User-facing code restored to EXACT v1 source as verified by independent Supabase `get_edge_function`: `Deno.serve` always 404, zero external API calls/data access. Compilation produced a different `ezbr_sha256` than first v1 even though source matches. **Do not claim binary-identical rollback**; runner fail-closed and did not delete automatically.
3. After independent readback confirmed v3, `verify_jwt=true`, exact inert v1 source and SHA `471280452dbce865ab7c38f19ef363a5b36e646f1000bb3e7ba144151604fa05`, scoped owner-signed [cleanup workflow #43195194500](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43195194500) executed `delete=DELETE_VERIFIED` HTTP 200, then `verify_absent=ABSENT_VERIFIED` HTTP 200.
4. Independent provider `list_edge_functions` after cleanup: synthetic slug ABSENT. The new CEREBRO operator v1 ACTIVE, existing provider broker v33 SHA `645ae3995fa0cf478d589871f00f029be2ee6bfe6228b2e1a8ef1645b98022ec` unchanged. [Operator security CI #43195194676](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43195194676) SUCCESS.

### Acceptance and limits
- **VERIFIED_LAB_SCOPED_CAPABILITY:** real CEREBRO identity and real single-synthetic-resource create/update/source restore/delete with physical final cleanup. Cost of new subscriptions 0 €; existing paid usage remains subject to platform billing.
- **NOT UNIVERSAL FULL:** Auth/DB/Storage mutation not tested, broad Edge CRUD forbidden, durable general queue/ownership registry, full-domain backup/recovery and PROD promotion not approved. All five connectors can be classified **functional in their documented scoped LAB capabilities**, not as universal full autonomy.
- **No changes** to App, CRM, pre-existing Edge Functions, SEO security settings, old code, `main`, DNS, Trading or real customer data. PR #44 DRAFT remains unmerged.
- The separate eight-SEO-table RLS issue documented 2026-11-11 remains HIGH_RISK/HUMAN_REQUIRED and was not altered.

**Consequent action:** stop redundant synthetic CRUD testing. Any later broader Supabase management scope requires a distinct ownership contract, policy, backup/rollback and authorization.
