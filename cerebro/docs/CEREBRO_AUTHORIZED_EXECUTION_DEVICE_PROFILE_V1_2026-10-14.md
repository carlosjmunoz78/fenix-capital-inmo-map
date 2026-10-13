# CEREBRO Authorized Execution & Device Profile V1

Date: 2026-10-14  
Scope: block 38-50  
Environment: PREPROD/LAB policy only  
Additional cost target: 0 EUR  
PROD write: not authorized  
Trading: isolated / not authorized

## Decision

Block 38-50 is implemented as one transversal policy profile, not as thirteen new engines. Existing IAM-001 and ROUTE-001 remain canonical. The new profile wraps their contracts and adds only the missing fine-grained execution/device ladders, source dispositions and safety gates.

This follows CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR. No existing App, CRM, Supabase, WordPress, SEO, Training, Trading, PROD or connector runtime is replaced.

## Inventory and current-state reconciliation

- IAM identities, service accounts and scopes: EXISTENTE in `identity-credential-broker.mjs` and its registries.
- Secret handling: PARCIAL by design. CEREBRO stores symbolic/external secret references and metadata, not raw credential material. No new paid vault is required.
- Standing permissions: EXISTENTE as fail-closed company/environment/consumer scopes.
- Session/token lifecycle: EXISTENTE as lifecycle metadata, expiry health and consumer-local HOLD behavior. Raw tokens are not accepted by lifecycle state.
- Execution router: EXISTENTE. ROUTE-001 remains the canonical resource/model router. The profile adds the required explicit order `OFFICIAL_API -> AUTHORIZED_MCP -> LOCAL_SCRIPT -> BROWSER_BRIDGE -> COMPUTER_USE -> VISION_FALLBACK` without replacing ROUTE-001.
- Browser Bridge: PARCIAL. The repository already has fresh-attestation semantics (`paired`, `online`, kill switch, transport, browser running, bounded age), but a real physical session must present fresh execution-time evidence. Missing/stale evidence is HOLD, not a fabricated human exception.
- Android Device Worker: DEFINIDO as a logical worker contract using shared runtime principles. Route order is `ANDROID_INTENT_API -> ACCESSIBILITY_SEMANTIC -> DEVICE_BRIDGE -> DETERMINISTIC_REPLAY -> VISION_FALLBACK`. No dedicated new server is introduced.

## Human-exception boundary

The only top-level `HUMAN_REQUIRED` reasons remain:

`LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

Routine MFA, login, CAPTCHA, expired-session and consent challenges are represented as `ACTION_REQUIRED`/HOLD with bypass disabled. They are never silently renamed to an unrelated human-exception reason. MFA/CAPTCHA/security controls must not be bypassed.

## External source dispositions

External projects are not installed and do not become production dependencies in V1.

- 44 GenericAgent: `lsdefine/GenericAgent`, MIT. LAB benchmark for minimal tool loop, local computer control, ADB and skill crystallization patterns only.
- 45 Camoufox: `daijro/camoufox`. Browser core MPL-2.0, launchers MIT. Runtime integration is HOLD. It may be studied only for authorized compatibility/testing. Anti-abuse evasion, CAPTCHA bypass, MFA bypass or consent circumvention are forbidden.
- 46 NeuralAgent: `withneural/neuralagent`, MIT. Watch & Learn / Replay / computer-use supervision patterns only.
- 49 Open Jarvis: `tokenarc/open-jarvis`, MIT. Android accessibility/local-first/intent and device-agent patterns only.
- 50 ArCHer: `YifeiZhou02/ArCHer`, MIT. Research benchmark for hierarchical multi-turn agent training/evaluation only; it is not a device-control runtime dependency.

No external source code is executed by this profile. Future import requires provenance, license, security, cost, impact analysis, tests, evaluation and OLD-vs-NEW.

## Safety invariants

- additional cost = 0 EUR;
- no automatic paid fallback;
- no plaintext/raw secret persistence;
- no secret values in registry/profile payloads;
- company/environment scoping is mandatory;
- browser and computer-use remain fallback paths;
- browser/device execution is LAB/PREPROD only in V1;
- fresh browser attestation is required for browser/computer-use routes;
- PROD authority remains false;
- PROD write authority remains false;
- Trading access remains false;
- external source execution remains false.

## Dependency map

Preserved unchanged:

- `cerebro/governance/identity-credential-broker.mjs`
- `cerebro/governance/identity-session-lifecycle.mjs`
- `cerebro/router/execution-model-router.mjs`
- `cerebro/runtime/continuous-improvement-contract.mjs`

Added overlay:

- `cerebro/runtime/authorized-execution-device-profile-v1.mjs`
- `cerebro/tests/authorized-execution-device-profile-v1.test.mjs`
- `cerebro/registry/authorized-execution-device-profile.v1.json`
- `.github/workflows/cerebro-authorized-execution-device-profile-v1.yml`

No canonical module is deleted or replaced.

## Verification gate

Candidate promotion requires Node 24 and all of the following GREEN on the exact candidate head:

1. Authorized Execution & Device Profile focused tests.
2. IAM credential broker regression tests.
3. IAM session lifecycle regression tests.
4. Execution model router regression tests.
5. Full `cerebro/tests/*.test.mjs` candidate suite.
6. Full main/base suite for OLD-vs-NEW comparison.
7. Security/policy/cost review showing no authority, Trading, secret or cost regression.
8. Post-merge main verification.

Until those gates are evidenced, registry state remains `CANDIDATE_PREPROD`; operational/physical Browser Bridge or Android capability is not claimed merely from the policy profile.

## Rollback and rebuild

Rollback: revert the profile PR/commits. IAM-001 and ROUTE-001 are preserved, so rollback does not require reconstructing the pre-existing control plane.

Rebuild: recreate the profile from the registry, runtime contract, tests and this document, then re-run the same Node 24 gates. No external paid service, new secret store or external agent code is required.
