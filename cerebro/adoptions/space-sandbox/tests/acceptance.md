# SPACE candidate acceptance tests

These are promotion tests, not claims that the upstream currently passes them.

1. **Platform gate** — prove target host has supported Linux/KVM/Firecracker prerequisites; unsupported hosts remain DISABLED.
2. **Default-deny network** — guest starts with no external egress. A denied destination must remain unreachable even if the worker requests it.
3. **Credential mediation** — worker can perform an explicitly authorized operation without receiving a reusable general secret; guest image/disk snapshot contains no injected long-lived credential.
4. **Filesystem boundary** — guest cannot read arbitrary host paths; only explicitly mounted synthetic fixtures are visible.
5. **Resource ceiling** — enforce CPU, memory, disk and wall-clock limits; exhaustion terminates the workload without destabilizing host/control plane.
6. **Lifecycle** — create/start/stop/destroy is deterministic and idempotent; repeated teardown leaves no live VM/process/mount/network artifact.
7. **Host escape negative suite** — run only governed synthetic/adversarial fixtures; any host-boundary breach is automatic REJECT.
8. **Control-plane authorization** — unauthenticated/unscoped callers cannot create, attach to, reconfigure or destroy another mission's sandbox.
9. **Evidence** — mission id, backend version, image/kernel digest, policy decision, resource envelope, lifecycle timestamps and exit reason are exported without secrets.
10. **Rollback** — disabling the registry entry routes the workload class to the previously approved backend without changing mission semantics.
11. **OLD-vs-NEW** — same synthetic workload and authority envelope. NEW must improve the selected isolation metric and show no regression in IAM, FINOPS, latency ceiling, cleanup or evidence completeness.
12. **No forbidden behavior** — no Trading real; no auth/CAPTCHA/rate-limit/paywall/anti-abuse bypass; no paid/cloud fallback.
13. **Fail-closed substrate proof** — if a required isolation/resource primitive cannot be established and read back from the substrate, startup must refuse. No silent downgrade to a weaker compatibility mode.
14. **Process-tree cleanup verification** — terminate a workload that forks children and opens resources; teardown must prove the complete process tree and backend-owned mounts/network/runtime artifacts are gone.
15. **Enforcement read-back** — configured CPU/memory/PID/network/filesystem limits are not accepted merely because configuration returned success; the evaluator must read back or independently observe effective enforcement.
16. **Harness non-escalation** — MCP/skill/CLI surfaces exposed to a worker cannot select unsafe modes, widen network/filesystem scope, disable redaction/evidence, or bypass Gatekeeper/DefenseClaw policy.
17. **Secret exfiltration negative test** — a synthetic canary secret presented only through the approved mediation path must not appear in guest persistent storage, snapshots, stdout/stderr, audit payloads or unauthorized network requests.

## Promotion result
Only `PASS` on all mandatory gates may move the candidate from `DISABLED_CANDIDATE` to the subsystem-specific evaluation environment. PROD requires a separate governed promotion decision and evidence bundle.
