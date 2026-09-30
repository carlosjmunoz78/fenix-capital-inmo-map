-- Lock down ACTGW / SEO-001 PREPROD tables against direct anon/authenticated API access.
alter table if exists public.seo_cerebro_territories_preprod enable row level security;
alter table if exists public.seo_cerebro_expansion_jobs_preprod enable row level security;
alter table if exists public.seo_cerebro_city_runs_preprod enable row level security;
alter table if exists public.seo_cerebro_city_growth_stack_preprod enable row level security;
alter table if exists public.cerebro_action_requests_preprod enable row level security;

revoke all on table public.seo_cerebro_territories_preprod from anon, authenticated;
revoke all on table public.seo_cerebro_expansion_jobs_preprod from anon, authenticated;
revoke all on table public.seo_cerebro_city_runs_preprod from anon, authenticated;
revoke all on table public.seo_cerebro_city_growth_stack_preprod from anon, authenticated;
revoke all on table public.cerebro_action_requests_preprod from anon, authenticated;
