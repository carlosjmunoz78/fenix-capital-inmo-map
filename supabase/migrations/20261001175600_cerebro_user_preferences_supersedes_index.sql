-- Cover the audit-lineage self FK introduced by CEREBRO Explicit Learning V1.
-- Additive performance hardening; no behavior or permission change.

create index if not exists cerebro_user_preferences_supersedes_idx
  on fenix_prod.cerebro_user_preferences(supersedes)
  where supersedes is not null;
