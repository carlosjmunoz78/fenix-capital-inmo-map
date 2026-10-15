# Human Operator Physical Cutover Checklist V0

Status: `DEFINED / DO_NOT_EXECUTE_YET`

This checklist is the exact boundary between design-only work and physical Windows/Chrome execution.

## Gate A · shared work clear

- [ ] active Skills/Capability Evolution changes on shared runtime are closed or stable;
- [ ] no concurrent change to canonical IAM/ROUTE/QA/LRN/FACT files used by this rollout;
- [ ] fresh `main` inventory captured;
- [ ] branch rebased/reconciled without dropping existing behavior;
- [ ] OLD baseline recorded.

Failure => remain `DEFINED_NOT_BOUND`.

## Gate B · Windows isolation

- [ ] dedicated Windows execution identity selected;
- [ ] Chrome Carlos personal profile explicitly excluded;
- [ ] `CEREBRO_LAB` profile path created;
- [ ] `CEREBRO_FENIX` work profile path reserved;
- [ ] filesystem permissions checked;
- [ ] workstation sleep/hibernate policy compatible with requested night run;
- [ ] local kill switch reachable without browser automation.

Failure => `HOLD_WINDOWS_ISOLATION`.

## Gate C · credential vault

- [ ] chosen backend documented (Windows Credential Manager / DPAPI user-scope / existing provider store);
- [ ] synthetic write/read/delete passed;
- [ ] same-user restart passed;
- [ ] unauthorized-user read denied;
- [ ] log/evidence redaction passed;
- [ ] kill switch passed;
- [ ] recovery/backup path tested;
- [ ] no unique irreplaceable secret stored solely in an untested DPAPI blob.

Failure => `HOLD_VAULT_ACCEPTANCE`.

## Gate D · browser adapter

- [ ] Playwright baseline available;
- [ ] fresh Browser Bridge/adapter attestation collected;
- [ ] Chrome launch/attach works on dedicated profile;
- [ ] tabs can be enumerated and pinned;
- [ ] click/type/fill/navigation/screenshot work;
- [ ] controller restart recovery works;
- [ ] Chrome restart recovery works;
- [ ] personal-profile cross-attach test fails closed.

Failure => `HOLD_BROWSER_PHYSICAL_BINDING`.

## Gate E · session autonomy

- [ ] one authorized LAB/PREPROD account authenticated;
- [ ] controller restart reuses session;
- [ ] Chrome restart reuses session where provider permits;
- [ ] forced session expiry triggers credential resolver;
- [ ] reauthentication succeeds without secret leakage;
- [ ] MFA/TOTP path behaves according to provider policy;
- [ ] CAPTCHA/anti-abuse controls are not bypassed.

Failure => `HOLD_SESSION_AUTONOMY`.

## Gate F · Human Operator runtime

- [ ] durable job state available;
- [ ] checkpoint integrity validated;
- [ ] watchdog validated;
- [ ] bounded retries validated;
- [ ] repeated-state circuit breaker validated;
- [ ] evidence contract validated;
- [ ] MorningReport truth rules validated;
- [ ] finding routing validated;
- [ ] canonical HUMAN_REQUIRED set exact.

Failure => `HOLD_OPERATOR_RUNTIME`.

## Gate G · soak

- [ ] 30-minute soak GREEN;
- [ ] 2-hour soak GREEN;
- [ ] controlled tab-close recovery GREEN;
- [ ] controlled controller-restart recovery GREEN;
- [ ] controlled Chrome-crash recovery GREEN;
- [ ] full-night 6-10 hour soak GREEN;
- [ ] morning report generated from measured evidence.

Failure => no full-night readiness claim.

## Gate H · conversational QA

- [ ] evaluator and CEREBRO system-under-test are distinct;
- [ ] browser transports the real response;
- [ ] next evaluator turn can depend on prior real answer;
- [ ] long-context tests executed;
- [ ] case/role/company isolation tested;
- [ ] false premise and contradiction tests executed;
- [ ] no fixed application-level conversation turn cap;
- [ ] duration/loop limits remain active.

Failure => `HOLD_ADAPTIVE_CONVERSATION`.

## Gate I · App Fénix PREPROD

- [ ] synthetic accounts/data only for mutation tests;
- [ ] Carlos/Admin scenario;
- [ ] Belén/operational scenario;
- [ ] Financiero scenario;
- [ ] Visitador scenario;
- [ ] novice/stress/adversarial population scenarios;
- [ ] permissions validated;
- [ ] state persistence validated;
- [ ] document upload/download test validated when authorized;
- [ ] cleanup/rollback validated.

Failure => `HOLD_MULTI_ROLE_APP_E2E`.

## Gate J · tribunal

- [ ] OLD vs NEW;
- [ ] independent EVA/JDG;
- [ ] regression tests;
- [ ] observability;
- [ ] measured cost;
- [ ] backup/rebuild;
- [ ] rollback rehearsal;
- [ ] security/credential review;
- [ ] no regression in existing App/CRM/Supabase/WordPress/Skills;
- [ ] PROD remains separate promotion decision.

Only then may status become `PREPROD_HUMAN_OPERATOR_READY`.
