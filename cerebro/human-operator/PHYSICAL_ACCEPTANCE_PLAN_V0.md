# Human Operator Physical Acceptance Plan V0

Status: `PLAN_DEFINED / EXECUTION_BLOCKED_UNTIL_SHARED_SKILLS_WORK_STABLE`

## Purpose

Turn the current Browser Bridge `PARCIAL` state into measured physical evidence for a dedicated Chrome CEREBRO profile without touching PROD or Trading.

## Phase 0 · Preconditions

Required before physical execution:

- current Skills/Capability Evolution work no longer modifying shared IAM/ROUTE/FACT/LRN surfaces;
- dedicated Windows identity/runtime chosen;
- `Chrome CEREBRO LAB` profile directory created;
- `Chrome CEREBRO FENIX` profile directory planned but not used for stress tests;
- Browser Bridge / candidate adapter installation inventory captured;
- kill switch tested before first external action;
- rollback/rebuild documented;
- secret resolver available or test uses synthetic credentials only.

## Phase 1 · Static and local-only

1. Validate Human Operator contracts.
2. Validate no raw-secret fields in jobs/checkpoints/evidence.
3. Validate loop/circuit-breaker policy.
4. Validate canonical HUMAN_REQUIRED reasons only.
5. Validate profile separation (`Carlos` never selected).
6. Validate additional-cost hard cap = 0 EUR.

Expected: `STATIC_CONTRACT_GREEN`.

## Phase 2 · Chrome LAB connection

Use a dedicated local profile and a harmless local/synthetic page.

Prove:
- open Chrome;
- enumerate tabs;
- pin/select intended tab;
- navigate;
- click/type/fill;
- screenshot;
- read DOM/accessibility state;
- close/reopen tab;
- controller restart + tab recovery;
- no cross-tab hijack.

Expected: `CHROME_LAB_CONNECT_GREEN`.

## Phase 3 · Credential/session reuse

With synthetic vault entries first:

- write/read/delete synthetic password;
- ensure logs/evidence contain only refs;
- kill-switch deny;
- restart operator and resolve same ref;
- verify Chrome persistent session survives controller restart.

Then one owner-authorized real account in LAB/PREPROD:

- authenticate once;
- close controller;
- reopen;
- reuse session without owner login;
- expire/clear session intentionally;
- reauthenticate through approved credential resolver;
- verify secret never appears in logs/evidence.

Expected: `CREDENTIAL_SESSION_REUSE_GREEN`.

## Phase 4 · Deterministic App/Web scenario

Run same 50-step synthetic scenario with each viable adapter:

- Playwright + Chrome profile baseline;
- agent-browser candidate;
- Browser Harness candidate;
- real-browser-mcp only if existing-tab control adds measurable value.

Measure:
- successful steps;
- median action latency;
- navigation failure rate;
- wrong-tab events;
- selector/replan failures;
- recovery time;
- CPU/RAM;
- evidence completeness;
- operator complexity;
- session persistence;
- incremental cost.

No candidate wins by upstream claims; only by measured OLD vs NEW.

## Phase 5 · Soak ladder

### 30 minutes
- repeated navigation/action cycles;
- at least one controlled tab close;
- at least one controller restart.

### 2 hours
- session token refresh if site performs one;
- deliberate page timeout;
- bounded recovery;
- checkpoint integrity.

### Full night
- 6-10 hours;
- mixed App/Web/conversation workloads;
- watchdog active;
- controlled Chrome crash/restart rehearsal;
- morning report generated automatically.

Expected sequential gates:
- `30_MIN_SOAK_GREEN`
- `2_HOUR_SOAK_GREEN`
- `FULL_NIGHT_SOAK_GREEN`
- `CRASH_RECOVERY_GREEN`

## Phase 6 · Adaptive conversation

Transport real messages between evaluator chat and real CEREBRO surface.

Prove:
- evaluator asks based on previous real answer;
- actor response provenance verified;
- long context retained;
- case switch does not leak prior case;
- role switch obeys permissions;
- user correction changes future behavior;
- false premise is challenged or uncertainty surfaced;
- HUMAN_REQUIRED occurs only for canonical reasons;
- no fixed application-level turn cap; job duration remains bounded.

Expected: `ADAPTIVE_CONVERSATION_GREEN`.

## Phase 7 · Multi-role App Fénix PREPROD

Roles/personas consume existing Human Intelligence population; no duplicate persona engine.

Cover:
- Carlos/Admin;
- Belén/operational;
- Financiero;
- Visitador;
- novice/confused/stress/adversarial synthetic users.

Prove task completion, permissions, state retention, error recovery and evidence routing.

Expected: `MULTI_ROLE_APP_E2E_GREEN`.

## Phase 8 · Tribunal

Required before any promotion:

- OLD vs NEW;
- independent evaluation;
- regression suite;
- observability;
- measured cost;
- backup/rebuild;
- rollback rehearsal;
- credential/session security review;
- kill switch;
- no shared-runtime regression.

Expected: `PREPROD_TRIBUNAL_GREEN`.

## Promotion boundary

This plan does not authorize PROD autonomy. Production use remains a separate promotion decision with its own permissions, evidence and rollback.
