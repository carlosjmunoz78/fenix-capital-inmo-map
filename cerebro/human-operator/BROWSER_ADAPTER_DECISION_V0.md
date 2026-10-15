# Human Operator Browser Adapter Decision V0

Status: `PROVISIONAL / NO_INSTALL / NO_BINDING`
Date: 2026-10-15

## Requirement

The browser layer must support a dedicated Google Chrome profile that can stay authenticated and work for hours unattended, while exposing deterministic actions, screenshots/evidence, recovery and a stable control surface to CEREBRO.

## Existing CEREBRO baseline

- Playwright is already present in the repository.
- QA-001 already uses Playwright for human-like read-only journeys.
- `agent-browser` already has a CEREBRO Skill Supply Chain wrapper, but that wrapper is currently advisory/synthetic and explicitly does not execute upstream code.
- Browser Bridge is canonical but remains `PARCIAL` until a fresh physical binding/attestation exists.

## Candidates

### A. Playwright + dedicated Chrome profile

Strengths:
- already in repository;
- deterministic and test-friendly;
- strong selectors/accessibility/DOM/network tooling;
- simplest baseline for APP/Web QA;
- no new runtime dependency required for first experiments.

Weaknesses:
- Night Runner persistence, session pinning, daemon recovery and durable restore must be built/wrapped by CEREBRO;
- attaching to arbitrary already-open personal Chrome is not the target architecture; dedicated profile is preferred.

Disposition: `PRIMARY_BASELINE`.

### B. vercel-labs/agent-browser

Observed capabilities from current upstream documentation:
- named isolated sessions;
- persistent Chrome profiles;
- `--restore` state persistence with periodic autosave;
- CDP / auto-connect;
- persistent session-to-tab binding and strict `--pin-tab`;
- Windows x64 support;
- session info/daemon state useful for recovery.

Security note: exported state can contain session tokens and must be encrypted at rest; a dedicated persistent profile avoids unnecessary plaintext state-file export.

Disposition: `STRONG_NIGHT_RUNNER_CANDIDATE`.

### C. browser-use/browser-harness

Observed capabilities:
- connects an LLM to a real Chrome browser through CDP;
- persistent daemon/helper layer;
- MCP server over stdio;
- helper primitives for tabs, navigation, click/type/fill, screenshots, waits, JS and CDP;
- self-extending helper workspace.

Strength: high agentic flexibility and direct real-browser control.

Concern for CEREBRO: self-written helpers are useful but require governance/versioning before they can become trusted runtime behavior. Python/uv also adds a second runtime stack beside current Node/Playwright.

Disposition: `AGENTIC_MCP_CANDIDATE`.

### D. real-browser-mcp

Observed capabilities:
- Chrome extension + local MCP server;
- controls the Chrome instance the user already has open;
- preserves existing cookies/SSO/staging state locally;
- does not require a clean automation profile.

Strength: excellent for interactive debugging of the exact tab/session a human already opened.

Concern for CEREBRO Night Runner: extra extension + MCP component, dependence on the existing interactive Chrome instance, and less natural fit for isolated unattended profiles than a dedicated automation profile.

Disposition: `INTERACTIVE_EXISTING_CHROME_FALLBACK`.

## Provisional stack

```text
CEREBRO Human Operator
        |
        +--> Deterministic Browser Adapter: Playwright + Chrome CEREBRO profile
        |
        +--> Night Runner candidate: agent-browser behind CEREBRO adapter
        |
        +--> Agentic/MCP candidate: Browser Harness behind CEREBRO adapter
        |
        +--> Existing-human-tab fallback: real-browser-mcp
```

No candidate may become canonical merely because upstream claims capability. It must pass the CEREBRO acceptance ladder and OLD vs NEW comparison.

## Chrome profile strategy

Use dedicated directories rather than Carlos's normal profile:

- `CEREBRO_FENIX`
- `CEREBRO_LAB`

The operator owns these profiles and may keep their cookies, localStorage, IndexedDB, service workers and authenticated sessions. Credentials needed for re-login are resolved through IAM/Vault by reference, not embedded in scripts.

## Decision gate after Skills close

Run the same controlled scenario with each viable adapter:

1. launch/attach dedicated Chrome;
2. login once through authorized credentials/session;
3. execute 50-step App/Web flow;
4. restart controller;
5. recover same profile/tab/state;
6. restart Chrome;
7. recover session;
8. run 30-minute soak;
9. measure failure rate, recovery, evidence quality, CPU/RAM and operator complexity;
10. OLD vs NEW tribunal.

Winner becomes the default Browser Adapter. Others remain fallback adapters only if they add measured value.

## Sources reviewed

- Playwright documentation: https://playwright.dev/
- agent-browser sessions/auth/CDP: https://github.com/vercel-labs/agent-browser
- Browser Harness README/MCP: https://github.com/browser-use/browser-harness
- real-browser-mcp: https://github.com/ofershap/real-browser-mcp

## Safety

No PROD authorization, no Trading, no paid fallback, no CAPTCHA/anti-abuse bypass, no secret values in logs/evidence, additional cost target 0 EUR.
