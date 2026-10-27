# Sandbox backend landscape — 2026-10-27

Purpose: prevent duplicate adoption while evaluating `cerebro.sandbox_backend.v1`. This is evidence only; it does not authorize installation or runtime activation.

## Existing authority

CEREBRO Gatekeeper / DefenseClaw / OpenShell remain authoritative for IAM, policy, approval and execution governance. A sandbox backend is subordinate to those controls and must not self-grant network, credentials, filesystem authority or paid/cloud fallback.

## Candidates reviewed

### Perplexity SPACE
Current candidate in this branch. Distinct value: Firecracker microVM boundary for selected untrusted workloads. State remains `DISABLED_CANDIDATE` until the mandatory isolation, egress-deny, credential mediation, resource-limit, teardown, escape-negative and rollback gates pass.

### microsandbox — superradcompany/microsandbox
Apache-2.0, local-first programmable microVM runtime/library. Public documentation advertises pause/resume, snapshotting and forking plus MCP lifecycle/filesystem/monitoring tools. This is useful as an alternate implementation of the neutral sandbox contract, especially for snapshot/fork experiments, but substantially overlaps the execution-boundary capability already being evaluated with SPACE.

Decision: `HOLD_AS_ALTERNATE_BACKEND`. Do not add a second runtime dependency now. Re-evaluate only if SPACE fails a mandatory gate or if snapshot/fork portability becomes a measured requirement that SPACE cannot satisfy. No code downloaded or executed.

### FootprintAI/Containarium
Open-source agent runtime with SSH-native access, eBPF egress policy, Kubernetes/LXC backends, GPU passthrough and MCP-native CLI. Useful for shared Linux/GPU environments, but container/LXC isolation is a different security class from the microVM boundary currently under evaluation and overlaps existing infrastructure/runtime concerns.

Decision: `HOLD_SPECIALIZED`. Do not use as a substitute for a microVM isolation boundary. Consider later only for governed GPU/shared-development workloads after a separate threat-model review. No code downloaded or executed.

## Dedup conclusion

No second sandbox implementation should be incorporated merely because it is capable. The neutral `cerebro.sandbox_backend.v1` contract is the reusable asset. SPACE remains the only active backend candidate in this branch; microsandbox and Containarium are recorded as alternatives without dependency adoption.

## Promotion invariant

A backend may replace or join SPACE only through the same OLD-vs-NEW test matrix and must preserve or improve isolation, IAM mediation, FINOPS limits, evidence, deterministic teardown and rollback. Feature advantage alone is insufficient.
