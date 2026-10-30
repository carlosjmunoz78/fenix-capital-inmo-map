# CEREBRO OS · Enterprise Global Fanout V1

Date: 2026-10-31
Status: PREPROD_CANDIDATE

## Objective
Use the maximum physically verified GitHub Enterprise Actions capacity for useful, independent CEREBRO work while preserving governance, fair-share and rollback.

## Verified live state
GitHub support confirmed the company-wide simultaneous-job limit has been raised to **360**, the maximum applied to the current plan, including up to **50 simultaneous macOS jobs**.

CEREBRO therefore records:
- `live_enterprise_runner_limit=360`;
- `effective_physical_cap=360`;
- `macos_live_cap=50`;
- documented Enterprise topology ceiling remains 500;
- `global_500_topology_prepared=true`;
- `global_500_fanout_enabled=false` because the live entitlement is 360, not 500.

## Fair-share topology
The live pool is deliberately shared so one campaign cannot monopolize Enterprise:
- **250** concurrent portfolio jobs across W00-W24;
- **100** concurrent NEURONAL jobs;
- **10** slots reserved for planning, acceptance and control;
- total target = **360**.

The portfolio uses **25 fronts × 10 distinct shards = 250** potential jobs. Shards partition different repository paths, and CEREBRO never creates empty jobs merely to occupy capacity.

## macOS
The entitlement permits up to 50 simultaneous macOS jobs. These slots are used only for work that genuinely requires macOS/iOS/Safari or Apple-specific tooling. No empty macOS jobs are fabricated.

## Existing components reused
- JOB-001/control-plane governance;
- NEURONAL 6,449-submission campaign;
- W00-W24 multi-front worker;
- JARVIS Project Registry;
- Mission DAG and FACT-001 bridges where applicable.

No second queue, scheduler or daemon is introduced.

## Safety boundaries
- PREPROD only for this acceleration layer.
- PROD write: false.
- Trading access: false.
- DeepSeek: explicit opt-in only, max 8 concurrent, no automatic recharge.
- Only independent work is parallelized.
- Existing App Fénix, CRM, Supabase, Notion, WordPress, SEO, Training and automations are preserved.

## 500-job topology
GitHub documentation exposes a higher Enterprise ceiling in some configurations, and CEREBRO keeps the 500 topology prepared. It remains fail-closed until the organization receives and verifies a live entitlement of 500 or higher.

## Rollback
If CI, PREPROD or physical evidence shows regression, revert the fair-share workflow/policy changes to the last green revision. Do not remove the previous path until equivalence or improvement is demonstrated.
