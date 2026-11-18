# OPERATIVA · Reproducible profile evidence audit · 2026-11-18
The 2506 known logical profiles are sourced from pinned files already present in GitHub. The provider snapshot `cerebro/registry/operativa-provider-discovery-20261118.v1.json` is a point-in-time, read-only inventory of 45 Cloudflare Workers and 118 Supabase Edge Functions. Worker settings include `ENGINE_ID` only for eight deployed Workers; nothing establishes role-specific runtime identity or execution.

`build-operativa-2506-audit.mjs` builds a deterministic `jsonl` record for every source-backed role with family, profile id, declared engines, source URL, parent, runtime evidence status, and candidate associations that require exact `engine_id` equivalence. No free-text matches. No synthetic run IDs. No environment changes. The GitHub Actions workflow writes only the three audit files on the handoff branch and ignores its own generated file paths to avoid loops.

Strict caveat: `ACTIVO` for a Worker or Edge Function does not imply the role is executing. The source evidence is a snapshot, not a live API. This is stage 1 of 2506 accreditation, no production changes.

To extend: collect signed job events with `profile_id + engine_id + company_id + environment + runtime_id + observed_at + result + evidence`, verify permissions and mapping; do not promote roles without exact match and fresh proof.
