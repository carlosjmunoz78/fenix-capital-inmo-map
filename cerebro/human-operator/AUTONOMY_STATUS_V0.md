# Human Operator Autonomy Status V0

Date: 2026-10-15

## HECHO

- isolated design branch created from `main`;
- Human Operator, Night Runner, adaptive conversation, evidence and morning-report contracts defined;
- existing QA-001, Human Intelligence, IAM-001, ROUTE-001 and Browser execution architecture reconciled;
- dedicated Chrome profile strategy defined;
- persistent credential/session policy defined;
- physical acceptance ladder defined;
- backup/rollback/rebuild plan defined;
- browser candidates classified without installing or replacing runtime.

## EXISTENTE

- Playwright in repository;
- QA-001 Continuous Human QA;
- Human Intelligence synthetic humans/conversation gym;
- IAM-001 metadata/reference broker and lifecycle health;
- authorized execution/device profile;
- Browser Bridge contracts/previous implementation history;
- VOICE-001;
- LRN-001/RSI + evaluation/judge ecosystem.

## PARCIAL

- Browser Bridge physical live binding: requires fresh attestation at execution time;
- secrets/vault: existing provider/GitHub secret stores exist, local persistent Human Operator vault resolver not implemented;
- authenticated browser QA: current canonical QA is largely read-only/public-shell oriented.

## DEFINIDO

- Chrome CEREBRO FENIX and Chrome CEREBRO LAB separation;
- Windows Credential Manager + DPAPI user-scope preferred zero-cost V0 for local secrets, behind IAM-001;
- Playwright as deterministic baseline;
- agent-browser as strong Night Runner candidate;
- Browser Harness as agentic/MCP candidate;
- real-browser-mcp as exact-existing-tab fallback;
- conversation evaluator loop using real CEREBRO responses;
- soak/recovery ladder.

## PLANIFICADO

- physical Chrome LAB probe;
- synthetic vault probe;
- one authorized real account login/session-reuse probe;
- adapter OLD vs NEW benchmark;
- 30-minute / 2-hour / full-night soak;
- multi-role App Fénix PREPROD E2E;
- adaptive project-chat conversation test;
- later VOICE-001 multimodal test.

## POR AUDITAR

- current live Windows Browser Bridge state/version at test time;
- exact Chrome profile paths for dedicated profiles;
- local Windows identity/service account strategy;
- current password manager/browser-stored credentials available for authorized migration;
- physical CPU/RAM stability during full-night run;
- best adapter after measured benchmark;
- provider-specific MFA/recovery limitations.

## Authority

- LAB/PREPROD design only.
- PROD autonomy: `FALSE`.
- PROD writes: `FALSE`.
- Trading: `FALSE`.
- paid fallback: `FALSE`.
- additional cost target: `0 EUR`.

## Current next gate

`WAIT_SHARED_SKILLS_STABILITY -> STATIC_CONTRACT_VALIDATION -> WINDOWS_LOCAL_VAULT_LAB_PROBE -> CHROME_CEREBRO_PROFILE_SESSION_REUSE_PROBE`
