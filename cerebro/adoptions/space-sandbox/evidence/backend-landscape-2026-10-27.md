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

### vartiainen1/agent-sandbox
Security-first Linux sandbox with namespaces, filesystem/proc/dev/sys boundaries, network deny-by-construction, `no_new_privs`, capability reduction, seccomp, rlimits, cgroup v2 resource enforcement, environment/credential/socket isolation, bounded output, process-tree cleanup, CLI and MCP. Its HARDENED mode explicitly refuses to start when required cgroup-v2 delegation/resource enforcement cannot be proven instead of silently degrading.

Decision: `HOLD_AS_SECURITY_REFERENCE`. The fail-closed substrate verification and cleanup/read-back requirements are valuable acceptance-test patterns for `cerebro.sandbox_backend.v1`, but adopting this runtime would duplicate OpenShell/policy work and remains a container/namespace boundary rather than the microVM class currently being evaluated. Extract test invariants only; no dependency adoption and no code execution.

### nagaozen/sandbox
Apache-2.0 LLM-first MCP abstraction over isolated Docker runtimes. Distinct design ideas are a deliberately small eight-tool semantic surface, progressive capability disclosure, one `/workspace`, explicit lifecycle, first-class artifacts, runtime-independent protocol, orphan reclamation, loopback-only human desktop/VS Code interfaces, dropped Linux capabilities, `no-new-privileges`, resource limits and optional network disable.

Decision: `ADAPT_CONTRACT_IDEAS_ONLY`. The semantic MCP surface and lifecycle/artifact model may improve a future CEREBRO sandbox adapter API, but Docker isolation is not a stronger boundary than the active SPACE microVM candidate and the project is currently very young. Do not add runtime dependency. Any human-observation interface must remain behind authenticated CEREBRO routes rather than exposing loopback assumptions as authorization.

### qosikz/andbo
Policy-controlled Docker/Podman sandbox for coding agents with default network deny/allowlist, secret redaction, audited sessions, MCP/skill surfaces and diff-oriented outputs. It explicitly prevents harness-facing skill/MCP surfaces from reaching unsafe modes.

Decision: `HOLD_AS_POLICY_REFERENCE`. Useful negative-test patterns for egress, secret leakage/redaction and harness non-escalation, but functionally overlaps Gatekeeper/DefenseClaw/OpenShell plus the existing sandbox contract. No new runtime dependency.

### Ephemeral-AI-Lab/ephemeral-sandbox
Self-hosted sandbox infrastructure focused on parallel coding agents, isolated workspaces, MCP/CLI control, observability and atomic publication.

Decision: `HOLD_PARALLEL_WORKSPACE_REFERENCE`. Atomic publication and parallel isolated workspace semantics may be useful later for App/Skill Factory fan-out, but they do not justify weakening or replacing the current isolation boundary. Revisit only if parallel-workspace publication becomes a measured gap.

## Dedup conclusion

No second sandbox implementation should be incorporated merely because it is capable. The neutral `cerebro.sandbox_backend.v1` contract is the reusable asset. SPACE remains the only active backend candidate in this branch; other runtimes are recorded as alternatives or sources of test/contract invariants without dependency adoption.

The new scan strengthens three contract/test requirements without adding a runtime: (1) fail closed when the substrate cannot prove required resource controls, (2) verify cleanup/process-tree teardown and enforcement read-back, and (3) ensure harness-facing MCP/skill surfaces cannot escalate into unsafe modes. These requirements belong in CEREBRO's acceptance matrix independent of backend.

## Promotion invariant

A backend may replace or join SPACE only through the same OLD-vs-NEW test matrix and must preserve or improve isolation, IAM mediation, FINOPS limits, evidence, deterministic teardown and rollback. Feature advantage alone is insufficient.
