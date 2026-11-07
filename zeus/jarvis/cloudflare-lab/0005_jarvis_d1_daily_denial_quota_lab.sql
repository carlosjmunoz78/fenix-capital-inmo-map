-- CUT26 · GLOBAL daily quota for gateway denial audit, LAB only.
-- Uses one atomic SQLite/D1 UPSERT with RETURNING; no owner, session, IP,
-- request, credentials or company details. No default rows are created.
-- One increment + at most one denial audit row per accepted reservation.
CREATE TABLE IF NOT EXISTS jarvis_lab_denial_quota_v0 (
 usage_day TEXT NOT NULL
   CHECK(length(usage_day)=10 AND usage_day GLOB '????-??-??'),
 environment TEXT NOT NULL DEFAULT 'LAB' CHECK(environment='LAB'),
 quota_name TEXT NOT NULL DEFAULT 'GATEWAY_DENIAL'
   CHECK(quota_name='GATEWAY_DENIAL'),
 consumed INTEGER NOT NULL CHECK(consumed BETWEEN 1 AND 1000),
 max_per_day INTEGER NOT NULL CHECK(max_per_day BETWEEN 1 AND 1000),
 PRIMARY KEY (usage_day,environment,quota_name),
 CHECK(consumed <= max_per_day)
);
-- Atomic monotonic counter; no UPDATE/DELETE privilege is exposed to
-- the Gateway's public request surface. Dedicated DB binding is server-only.
-- Retention/compaction is an administrative backup-verified operation,
-- never automatic, and must not erase the active day's quota.
