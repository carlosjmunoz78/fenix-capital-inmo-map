-- SEO-001 CHECKLIST V2 ONLY. Parallel ledger; never relax V1 SHA/asset constraints.
-- TARGET: Supabase PREPROD hnqlnvakzaywtafeiybt. No customer rows; no plaintext emails.
create table if not exists public.cerebro_seo_checklist_delivery_v2 (
 idempotency_key text primary key check (idempotency_key ~ '^[0-9a-f]{48}$'),
 company_id text not null default 'fenix' check (company_id = 'fenix'),
 engine_id text not null default 'SEO-001' check (engine_id = 'SEO-001'),
 environment text not null default 'PREPROD' check (environment = 'PREPROD'),
 asset_id text not null default 'SEO-MAGNET-52656-CHECKLIST-V2'
  check (asset_id = 'SEO-MAGNET-52656-CHECKLIST-V2'),
 lead_event_id uuid not null, request_id uuid not null unique,
 recipient_sha256 text not null check (recipient_sha256 ~ '^[0-9a-f]{64}$'),
 attachment_sha256 text not null
  check (attachment_sha256 = '82a96dc9b1c64bf8972e44358cd5bdc121182a09aa3832b71162efc7bea7e660'),
 consent_privacy_at timestamptz not null,privacy_notice_version text not null
  check (length(privacy_notice_version)<=80),
 consent_marketing boolean not null default false,
 status text not null default 'RESERVED' check (status in ('RESERVED','ACCEPTED','UNKNOWN')),
 message_id_sha256 text check(message_id_sha256 is null or message_id_sha256 ~ '^[0-9a-f]{64}$'),
 last_error_code text check (last_error_code is null or length(last_error_code)<=100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 completed_at timestamptz,
 constraint seo_v2_unique_event_asset unique(lead_event_id,asset_id),
 constraint seo_v2_accepted_receipt check(status<>'ACCEPTED' or(message_id_sha256 is not null and completed_at is not null)),
 constraint seo_v2_privacy_time check(consent_privacy_at <= created_at + interval '5 minutes')
);
alter table public.cerebro_seo_checklist_delivery_v2 enable row level security;
revoke all on public.cerebro_seo_checklist_delivery_v2 from PUBLIC,anon,authenticated;
revoke all on public.cerebro_seo_checklist_delivery_v2 from service_role;
grant select,insert,update on public.cerebro_seo_checklist_delivery_v2 to service_role;
-- No anon/auth policies by design. No DELETE for service_role.
