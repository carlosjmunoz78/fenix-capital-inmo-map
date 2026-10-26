-- CEREBRO Browser · Workspace login metadata V1
-- Additive and backward-compatible. Existing profiles keep an empty config.
-- Secrets never belong here; only non-secret adapter metadata/selectors/login URLs.

alter table public.cerebro_browser_workspace_profile_v1
  add column if not exists login_config jsonb not null default '{}'::jsonb;

comment on column public.cerebro_browser_workspace_profile_v1.login_config is
  'Non-secret browser login adapter metadata. Credentials remain in the credential broker/vault.';
