# PREPROD gaps · CEREBRO bootstrap

## RLS-001 representative database

Read-only audit of the configured PREPROD Supabase project `hnqlnvakzaywtafeiybt` found no `fenix_prod.special_cases`, `fenix_prod.special_case_people` or `fenix_prod.expediente_stage_history` tables.

Therefore that project is **not representative enough** to validate the RLS-001 enable-only candidate against the live PROD contract.

### Decision

- Do **not** apply the candidate to PROD.
- Do **not** create duplicate PROD-like tables ad hoc in the existing PREPROD project.
- Do **not** create a paid Supabase branch by default; zero-additional-cost policy applies.
- Keep the SQL candidate versioned and unit-constrained.
- RLS-001 stays `CONTROLLED_GAP_PREPROD_VALIDATION_REQUIRED` until a representative zero-cost test environment exists or a cost exception is explicitly justified.

### Current mitigating evidence

- no `anon` or `authenticated` table grants on the three affected PROD tables;
- relevant RPCs grant EXECUTE only to `postgres` and `service_role`;
- those RPCs are `SECURITY DEFINER`;
- `postgres` and `service_role` have `BYPASSRLS`;
- current App caller path goes through authenticated Edge functions and server RPCs.

This reduces immediate exposure but does not erase the defense-in-depth finding.
