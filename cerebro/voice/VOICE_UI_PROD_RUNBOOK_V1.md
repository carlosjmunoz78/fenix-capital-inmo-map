# VOICE-001 · Browser Voice UI · PROD Runbook V1

## Canonical surfaces

- Ana: `/ana` → existing `OperationalShellV2` + `AnaVoiceQueryBlock` → `fenix-app-gateway:/v2/ana/knowledge/answer`.
- CEREBRO Console: `/cerebro` → `RouteAccessGuard` → existing `CerebroConsoleShell` → `cerebro-console-gateway-v0:/chat`.
- Internal persistent App chat (`AnaChatBlock`) is a different capability and must not be converted into Ana intelligent conversation.

## Safety

- No audio persistence by default.
- Voice transcription does not grant authority.
- Low confidence is held for review.
- Sensitive confirmation must remain behind the existing action/policy gate.
- Console remains owner-only; backend revalidates identity.
- No service-role credential in browser UI.
- No Trading access.

## Production evidence · 2026-10-13

- PR #607 delivered Ana Voice and accidentally duplicated an already-existing Console Voice UI.
- Post-deploy audit detected the duplication before closure.
- PR #608 removed only the duplicate Console implementation, preserved the canonical `CerebroConsoleShell`, kept Ana Voice and passed exact-head VOICE-001 E2E, App Restoration, Session Context, Continuous Human QA and Governed Integration.
- PROD deployment source after deduplication: `c07e493d9d15f347d99c09dc8dd18505105550eb`.
- PROD Live Deploy: green.
- PROD Runtime Smoke: green.
- `gh-pages/PROD_SOURCE_SHA.txt` matches `c07e493d9d15f347d99c09dc8dd18505105550eb`.

## Rollback

The UI change has no database or backend migration.

If a production regression appears:

1. select the previously known good deployed source SHA;
2. republish the canonical PROD static snapshot using the existing deployment workflow;
3. verify root, bundle SHA, Console gateway health and anonymous fail-closed behavior;
4. Ana/Console backends remain unchanged throughout the rollback.

Known pre-voice-ui baseline retained during rollout: `77e0a9ec4065b8c2174bb9203f0e8081bf9f4513`.

## Device-level physical acceptance

CI/E2E proves the browser speech contract with deterministic synthetic SpeechRecognition. A real microphone additionally depends on an authenticated browser session and browser/OS microphone permission. Do not claim that a specific physical device permission was accepted unless that user/browser session has been exercised. Denial of microphone permission must leave text usable.

## Adding another channel

Do not create another conversational core. Add an adapter only after:

1. identifying the existing authoritative text/action contract;
2. mapping identity/RBAC/company scope;
3. defining audio retention policy;
4. proving low-confidence and confirmation behavior;
5. proving context/memory/learning reuse;
6. E2E + rollback + observability;
7. gradual activation.
