# Governed software engineering capability evidence

This first-party PREPROD capability performs software engineering and codebase development inside a worktree sandbox isolation boundary.
It uses deterministic prechecks, unit and targeted tests, static analysis with lint/typecheck, and explicit OLD vs NEW regression comparison.
Every change is a minimal change with bounded files and documented dependency impact.
Rollback and rebuild are mandatory; revert/restore procedures are maintained.
QA code evidence and EVA regression/benchmark evidence are required before acceptance.
No PROD write is authorized, no destructive action is allowed, no secret manipulation is performed, Trading is isolated, and additional cost is zero.
