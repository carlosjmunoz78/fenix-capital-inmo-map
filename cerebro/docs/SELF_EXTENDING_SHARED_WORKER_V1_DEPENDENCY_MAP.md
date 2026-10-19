# SELF-EXTENDING SHARED WORKER V1 · DEPENDENCY MAP

## Status

`CANDIDATE_PREPROD_AWAITING_EXACT_HEAD_CI`

## Preserved dependencies

- `FACT-001`: owns legacy184 reopening and build/wrap decisions.
- `JOB-001`: owns durable queue, leases, retries, idempotency, checkpoint/resume and worker execution.
- `TECH_SCOUT`: remains the search/compare authority before FACT builds a substitute.
- `QA/EVA`: own evidence validation and independent Tribunal.
- `LRN-001`: existing RSI auto-host remains the persistent shared host; it is extended, not replaced.

## Exact chain

`buildLegacy184SelfExtendingDispatchBatch`
→ `enqueueSelfExtendingDispatchBatch`
→ `DurableJobRuntimeV1`
→ `DurableWorkerRunnerV1`
→ `runSelfExtendingCapabilityLoop`
→ evidence-bound `verify_and_resume`
→ `tribunalDecision`
→ `RESUMED_GREEN` only after independent PASS.

## Persistence

The journal lives under the already existing RSI host company root as `job001-self-extending.v1.journal` and uses `AtomicV8Journal`. GitHub-hosted CI is only verification; no cross-run CI persistence is claimed.

## No replacements

No App, CRM, Supabase, WordPress, SEO, Notion, Training, social runtime or Trading dependency is replaced. No new server is introduced.

## External/physical dependencies kept separate

- EVT74 journal permission grant: external governed policy surface.
- Android physical install/attestation/render: authorized device.
- Browser Bridge/vault physical binding: execution-time attestation.
- Multimedia binaries on actual persistent runtime: execution-time inventory.
- Core Guard schema marker: repaired separately in STAGING.
