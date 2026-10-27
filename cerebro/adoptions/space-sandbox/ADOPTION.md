# SPACE sandbox candidate — governed adoption

Status: CANDIDATE / HOLD-RUNTIME
Date: 2026-10-27
Upstream: https://github.com/perplexityai/space
License: Apache-2.0 (verify again at promotion time)
Classification: ADAPT / WRAP; do not vendor or execute upstream code in this candidate.

## Why this exists
SPACE adds a distinct isolation primitive to CEREBRO's existing sandbox/security work: an untrusted-agent sandbox built around a Firecracker microVM boundary, with a daemon/CLI control plane and explicit host↔guest separation. It is a candidate for workloads where container/process isolation is not a sufficient boundary.

This adoption intentionally does **not** replace OpenShell, DefenseClaw, the CEREBRO Gatekeeper, IAM, FINOPS, Evidence Ledger, rollback, or subsystem-specific environment policy. It adds a possible stronger execution backend behind those contracts.

## Zero-cost / safety constraints
- No paid service or cloud dependency is introduced.
- No raw upstream code, install script, binary, package, image, or dependency is executed by this change.
- No credential is copied into a guest image.
- Default network policy is deny; network access requires a separately governed capability grant.
- Trading real remains out of scope.
- PROD is forbidden until platform compatibility, license, upstream provenance, isolation, rollback, resource ceilings and evidence gates pass.
- PREPROD is not assumed globally; the owning subsystem selects its environment.

## Candidate contract
A SPACE-compatible backend MUST implement `contracts/sandbox_backend_contract.json` and pass `tests/acceptance.md`. The contract is intentionally implementation-neutral so CEREBRO can benchmark SPACE against existing backends without lock-in.

## OLD vs NEW hypothesis
OLD: current sandbox backends provide the existing CEREBRO isolation envelope.
NEW candidate: selected high-risk untrusted workloads may receive an additional microVM boundary without widening IAM/network/secret authority.

Promotion requires evidence that NEW improves isolation for the selected workload class without regression in: IAM scope, network deny-by-default, secret mediation, FINOPS ceilings, deterministic teardown, evidence capture, rollback or host integrity.

## Integration target
`Mission -> Gatekeeper -> policy/DefenseClaw -> SandboxBackend contract -> SPACE candidate -> worker -> provenance/evidence -> verifier`

SPACE is therefore an execution backend, never the policy authority.

## Rollback
Rollback is registry-level: set candidate state to DISABLED and route the workload class to the previous approved backend. No migration of mission semantics or credentials is permitted as part of enabling SPACE.
