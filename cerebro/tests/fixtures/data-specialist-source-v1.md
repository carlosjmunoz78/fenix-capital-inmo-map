# Data engineering reference

PostgreSQL / Supabase database engineering is read-first. Inspect schema and SQL query/index evidence under explicit tenant scope and Row Level Security (RLS). A mutation plan requires backup and rollback/restore evidence before migration. Never disable RLS or write production data. Heavy training/log workloads are offloaded from the transactional core.
