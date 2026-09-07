-- RLS-001 PREPROD CANDIDATE ONLY
-- Purpose: test defense-in-depth without changing grants, policies, RPCs or application code.
-- DO NOT APPLY TO PROD without representative PREPROD tests, OLD vs NEW comparison and rollback proof.

alter table fenix_prod.special_cases enable row level security;
alter table fenix_prod.special_case_people enable row level security;
alter table fenix_prod.expediente_stage_history enable row level security;
