# CEREBRO 184 · Phase 0 Gap Close V1

Scope: rollout items 1-12 only.

## Already evidenced in live history

- Skill Capability Evolution V0 (#537): idempotent registration, deterministic impact analysis, OLD vs NEW, LRN-001, Supervisor/Tribunal, safe promotion/rollback.
- Auto-hook admitted skills (#539): discovery -> admitted wrapper -> capability evolution -> LRN outbox.
- Continuous learning closeout (#545): durable LRN, OLD vs NEW, tribunal, shadow/canary, rollback/relearn, new skill loop integrated.
- Skill Chain Driver (#577): automatic next-candidate routing across P0/P1/P2 without idle gaps.

## Gap-close rule

Do not reimplement what the above already proves. Close only missing or weaker-than-required elements.

### Item 1 FACT-001
Verify that the current Factory surface can produce/extend the standard capability contract and emits a bounded FACT gap rather than creating duplicate engines. If already present, mark FULL_PREPROD. Otherwise implement only the missing factory hook.

### Items 2-6
Expected to be FULL_PREPROD if exact-head/main evidence confirms #537/#539/#545 are merged and current.

### Items 7-9
External patterns are optional inputs, not mandatory dependencies. FULL means overlap/licence audit completed and any unique value either integrated or explicitly rejected/HOLD with evidence.

### Item 10 QA common
Verify shared QA gates are reused by skill/capability promotion; add only missing contract-level common QA if necessary.

### Item 11 Evaluation/Tribunal
Verify common tribunal is invoked for promotion and cannot be bypassed by discovered skills.

### Item 12 Learning loop
Expected FULL_PREPROD based on #545, subject to current main evidence.

## Acceptance

- no duplicated engine;
- no external skill code execution by default;
- no PROD business write from this phase;
- no Trading;
- additional cost 0 EUR;
- rollback/rebuild evidence retained;
- state is machine-readable and resumable.
