# CEREBRO VOICE-001 · Release record · 2026-10-01

Status before physical acceptance: PARCIAL / RELEASE_CANDIDATE.

## Scope
- CEREBRO Console mobile + PC.
- Zero-additional-cost browser-native voice V0.
- Continuous conversation loop: listen -> transcript -> same CEREBRO Gateway -> spoken/text response -> resume listening.
- Keyboard fallback preserved.
- Spanish speech synthesis when available.
- No change to Gateway authorization, pending_action, read_context, Policy or HUMAN_REQUIRED contracts.

## Safety invariants
- Queries do not confirm actions.
- Sensitive actions keep exact proposal + explicit confirmation.
- Low or unknown confidence speech cannot confirm a pending action.
- The frontend confirmation vocabulary is deterministically checked against the exact vocabulary accepted by CEREBRO Gateway.
- Voice never expands permissions.

## Evidence before release
- PR #451: VOICE-001 V0.
- PR #452: fail closed on empty social context.
- PR #453: continuous one-button conversation.
- PR #454: close spoken confirmation safety gap.
- PR #455: deterministic voice/Gateway confirmation parity guard.
- CEREBRO Session Context Regression Guard #112: SUCCESS.
- App Restoration Build Gate #365: SUCCESS.
- Existing CEREBRO authenticated SPA Console route: SUCCESS inside Build Gate #365.
- Existing social/email/contact/SEO regression corpus remains covered.
- PROD Gateway observed ACTIVE: cerebro-console-gateway-v0 version 24.
- Live frontend rollback source before this promotion: 098d7b00ea3e70c99e9df0173248545abc1d2718.

## Promotion
This record accompanies the explicit production promotion trigger for the current main snapshot.

## Rollback
If physical UX validation fails, restore the prior frontend source snapshot:
098d7b00ea3e70c99e9df0173248545abc1d2718

Do not roll back the already validated Gateway unless independent backend evidence requires it.

## Physical acceptance still required
1. Open CEREBRO Console as CARLOS-ADMIN on a supported Chrome/Android or desktop browser.
2. Start “Hablar con CEREBRO”.
3. Say: “Cuál es la próxima publicación de Facebook”.
4. Verify spoken + visible response and automatic resume.
5. Say: “Mandásela a Belén”.
6. Verify contact selection/proposal; no send yet.
7. Test a low-confidence confirmation path; it must fail closed.
8. Confirm once clearly and verify exact result/evidence only when intentionally executing.
9. Verify ending voice session stops listening and speech.
10. Verify keyboard remains usable.

Do not mark CONFIRMED_OPERATIONAL until physical acceptance succeeds.
