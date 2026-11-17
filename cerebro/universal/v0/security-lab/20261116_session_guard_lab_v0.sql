-- LAB-ONLY: never apply to PROD; project hnqlnvakzaywtafeiybt only.
-- Isolated private-authority session reader. Returns one boolean, no user/session identifiers.
-- The function owner must have read permission on auth.sessions; migration is run as postgres.
-- Never grant direct SELECT on auth.sessions to any role.
create function public.cerebro_operativa_session_guard_lab_v0(
  p_session_id uuid,
  p_user_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_session_id is not null
    and p_user_id is not null
    and exists (
      select 1 from auth.sessions s
      where s.id = p_session_id
        and s.user_id = p_user_id
        and (s.not_after is null or s.not_after > pg_catalog.now())
    );
$$;

-- PostgreSQL grants EXECUTE to PUBLIC for new functions by default.
-- This migration runs transactionally: never expose an intermediate public permission.
revoke all on function public.cerebro_operativa_session_guard_lab_v0(uuid,uuid) from public, anon, authenticated;
grant execute on function public.cerebro_operativa_session_guard_lab_v0(uuid,uuid) to service_role;

comment on function public.cerebro_operativa_session_guard_lab_v0(uuid,uuid)
is 'CEREBRO P0A LAB-only issuer-side boolean session lookup. service_role EXECUTE only. No direct auth.sessions grants.';
