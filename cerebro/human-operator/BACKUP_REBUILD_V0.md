# Human Operator Backup / Rollback / Rebuild V0

Status: `DEFINED / NO_PHYSICAL_STATE_CREATED`

## Source of truth

Versioned contracts and runbooks under `cerebro/human-operator/` plus preserved canonical dependencies on `main`.

## What is versioned

- Human Operator job/evidence/night-runner/conversation/report contracts;
- browser adapter decision record;
- scenario suite;
- dependency map and runbook;
- acceptance criteria.

## What must never be versioned

- passwords;
- access/refresh tokens;
- JWT values;
- TOTP seeds or OTPs;
- cookie values;
- recovery codes;
- private keys;
- raw browser profile contents containing authenticated session material.

## Future local-state backup classes

1. **Contracts/config**: Git branch/repository.
2. **Night Runner durable job state**: encrypted/local durable store with checksum and atomic writes.
3. **Evidence artifacts**: external/local evidence store with refs in control plane.
4. **Chrome profile**: protected workstation backup strategy; do not copy authenticated profile casually across machines.
5. **Vault secrets**: provider-supported export/recovery or dedicated encrypted backup; DPAPI-only data must have a proven recovery route before becoming sole copy.

## Rollback before merge

Delete/abandon isolated branch. `main` remains unchanged.

## Rollback after future integration

- disable Human Operator kill switch first;
- stop Night Runner service/worker;
- revert integration commit/PR;
- restore previous adapter selection;
- keep IAM/ROUTE/QA/LRN canonical systems intact;
- revoke newly introduced credential refs if compromise suspected;
- preserve evidence/history.

## Rebuild target

On a clean Windows LAB host:

1. install/use approved existing runtimes;
2. restore Human Operator versioned package;
3. recreate dedicated Chrome CEREBRO profiles;
4. restore credential refs and encrypted vault through approved recovery process;
5. reconnect Browser Bridge/selected adapter;
6. run static contract gate;
7. run synthetic vault gate;
8. run Chrome LAB connect gate;
9. run session reuse gate;
10. run 30-minute soak before longer tests.

## Rebuild success

Rebuild is not GREEN until:
- same contract version is loaded;
- secret leakage tests pass;
- kill switch passes;
- Chrome LAB connect passes;
- credential/session reuse passes;
- checkpoint recovery passes;
- evidence hashes/refs are valid;
- no PROD/Trading authority exists unexpectedly.

## Current rollback proof

Because this phase only adds an isolated branch and issues, rollback is currently branch abandonment/deletion. No runtime, browser, vault, App, database or PROD state has been changed by this package.
