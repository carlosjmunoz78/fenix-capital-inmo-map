# CEREBRO Human Operator LAB V0

Status: `DEFINED / ISOLATED_BRANCH / NO_RUNTIME_BINDING`

This package prepares a persistent human-like operator for Google Chrome without modifying the live Browser Bridge, IAM-001, ROUTE-001, FACT-001, Skill Supply Chain, LRN/RSI, App/CRM/Supabase/WordPress PROD or Trading.

## Goal

Allow CEREBRO to operate an authorized dedicated Chrome profile as a human user for long-running QA and business-surface validation:

- navigate App Fénix and approved web surfaces;
- click, type, upload/download when policy allows;
- use authenticated sessions and credential references without exposing raw secrets;
- converse adaptively with CEREBRO/ChatGPT and other approved chat surfaces;
- run unattended for hours with checkpoints, retries, watchdog and kill switch;
- collect reproducible evidence and route verified defects to the existing QA/LRN pipeline only after the current shared-runtime/Skills work is stable.

## Preserve-first dependencies

Reuse, do not replace:

- `QA-001` Continuous Human QA;
- CEREBRO Human Intelligence / synthetic-human population and conversation gym;
- `IAM-001` identity/credential reference broker;
- `IAM-001` credential/session lifecycle;
- authorized execution/device profile 38-50;
- Playwright already present in the repository;
- existing Browser Bridge, currently partial until fresh physical attestation.

## Target architecture

```text
ChatGPT / CEREBRO Console
        |
        v
CEREBRO Gateway / Orchestrator
        |
        v
Human Operator Runtime
        |
        +--> CredentialRef / Session Profile Router
        |
        +--> Browser Adapter
                |
                +--> Playwright + Google Chrome (baseline)
                +--> agent-browser (candidate)
                +--> Browser Harness (candidate)
                +--> real-browser-mcp (fallback candidate)
        |
        v
Dedicated Chrome profiles
        |
        +--> CEREBRO FENIX
        +--> CEREBRO LAB
```

## Hard isolation while Skills are in flight

Until the active Skills/Capability Evolution work is closed, this branch may only add files below `cerebro/human-operator/` and must not modify shared runtime or registries.

Forbidden in this phase:

- edits to `FACT-001` / Skill Supply Chain;
- edits to `capability-evolution-loop`;
- edits to canonical `IAM-001`, `ROUTE-001`, `LRN-001`, `RSI`, Browser Bridge;
- PROD writes or deployment;
- Trading access;
- paid dependencies.

## Chrome profiles

- `Chrome Carlos`: personal, excluded from automation.
- `Chrome CEREBRO FENIX`: authorized persistent work sessions.
- `Chrome CEREBRO LAB`: synthetic/stress testing.

## Acceptance ladder

1. `STATIC_CONTRACT_GREEN`
2. `CHROME_LAB_CONNECT_GREEN`
3. `CREDENTIAL_SESSION_REUSE_GREEN`
4. `30_MIN_SOAK_GREEN`
5. `2_HOUR_SOAK_GREEN`
6. `FULL_NIGHT_SOAK_GREEN`
7. `MULTI_ROLE_APP_E2E_GREEN`
8. `ADAPTIVE_CONVERSATION_GREEN`
9. `CRASH_RECOVERY_GREEN`
10. `PREPROD_TRIBUNAL_GREEN`

Passing any structural step does not imply physical or PROD autonomy.

## Cost

Additional subscription target: `0 EUR`.

## Human exception reasons

Only the canonical set is valid:

- `LEGAL_REQUIRED`
- `SIGNATURE_REQUIRED`
- `LOW_CONFIDENCE`
- `HIGH_RISK`
- `POLICY_CONFLICT`
- `SECURITY_INCIDENT`
- `MONEY_LIMIT`
- `CUSTOMER_HUMAN_REQUEST`
