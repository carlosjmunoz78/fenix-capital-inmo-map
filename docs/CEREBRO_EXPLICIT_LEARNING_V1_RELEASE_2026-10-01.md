# CEREBRO Explicit Learning V1 · PROD release candidate

Date: 2026-10-01
Company: fenix
Additional recurring cost: 0 EUR

Validated before frontend promotion:
- exact PREPROD migration + rollback GREEN;
- PR #457 gates GREEN and merged;
- PROD additive preference migration GREEN;
- PROD Gateway V25 ACTIVE;
- new preference-surface grants verified fail-closed for anon/authenticated;
- performance-advisor hardening PR #458 gates GREEN and merged.

Promotion remains fail-closed:
- no durable preference without explicit user instruction;
- no permission expansion;
- no bypass of HUMAN_REQUIRED or action confirmation;
- no audio/transcript heavy storage;
- existing CRM/entity memory preserved.

Physical acceptance after deploy:
1. say a supported correction, e.g. «Háblame un poco más despacio»;
2. verify it applies in the active conversation;
3. say «Guárdalo»;
4. reload/open a new session;
5. verify the saved preference is recovered.

Do not mark the end-to-end persistent-learning flow CONFIRMED_OPERATIONAL until this physical acceptance succeeds.


## Deployment result

- PROD Live Deploy #159: SUCCESS.
- PROD Runtime Smoke #302: SUCCESS.
- exact frontend source published: `7fad08ac3225e89cbf3aa5a732674201dc67a8e6`.
- Gateway: V25 ACTIVE.
- persistent preference storage: PROD ACTIVE, initially empty, direct anon/authenticated access denied.

Status: **PARCIAL / PROD deployed**. Physical persistence acceptance remains outstanding.
