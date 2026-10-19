# CEREBRO TECH_SCOUT — Governed LAB Candidate Intake

Date: 2026-10-20
Status: LAB_CANDIDATES_ONLY
Production: FORBIDDEN UNTIL GREEN PROMOTION GATE
External code execution: FORBIDDEN in scout intake
External installation: FORBIDDEN in scout intake
Paid services: FORBIDDEN unless separately approved

## Purpose

This dossier records external open-source candidates discovered by TECH_SCOUT. Inclusion here is NOT integration, installation, approval for production, or evidence that a project works with CEREBRO. Every candidate must pass license/security review, FREE_PARITY_GATE, isolated LAB evaluation, OLD-vs-NEW evidence, QA/Tribunal and governed promotion before use outside LAB.

## Mandatory evaluation contract

For every candidate capture: upstream repository, pinned commit/tag, license, maintenance/activity, community/maturity, security posture, privacy/data egress, self-host/local capability, dependencies, incremental monetary cost, language/stack, integration effort, performance evidence, reliability evidence, compatibility, advantage over current CEREBRO baseline, risks, use cases, possible derived product, and disposition REUSE / WRAP / ADAPT / HOLD / REJECT.

Rules:
- Public data or explicitly authorized access only.
- Never bypass authentication, CAPTCHA, paywalls, rate limits, privacy controls or anti-abuse systems.
- No upstream performance claim counts as CEREBRO evidence until reproduced in LAB.
- Prefer API/HTTP, structured DOM/accessibility and deterministic execution before vision/pixel automation.
- Prefer local/self-host and zero incremental cost where capability parity is adequate.
- Secrets must never be returned to models or persisted in scout evidence.
- Fail closed on uncertain authorization or safety state.
- PROD promotion requires the existing governed promotion path and real GREEN evidence.

## Consolidated priority shortlist

### APP FACTORY — P0
- Flutter — S++ — REUSE candidate. BSD-3-Clause ecosystem; one codebase targets Android, iOS, web, Windows, macOS and Linux. Security policy covers stable branch. Preferred universal employee/client/mobile/tablet application baseline. FREE_PARITY: PASS pending CEREBRO build/E2E evidence.
- Tauri — S++ — REUSE/ADAPT candidate. MIT/Apache-2.0 where applicable; Rust + web frontend; Windows/macOS/Linux plus Android/iOS. Preferred specialist desktop/control-center challenger where native OS integration and small runtime matter. FREE_PARITY: PASS pending CEREBRO build/E2E evidence.
- Expo / React Native — S+ — BENCHMARK challenger only until OLD-vs-NEW proves material advantage over Flutter for CEREBRO use cases.
- Pipecat — S+ — BENCHMARK challenger for realtime multimodal agent pipeline; no promotion merely from upstream claims.

### HUMAN COMMUNICATION — P0
- LiveKit Server + LiveKit Agents — S++ — REUSE/WRAP candidate. Server Apache-2.0; Agents Apache-2.0, with separate LiveKit Model License applying to turn-detection models. Self-host path exists. Supports realtime audio/video/data, SIP telephony, SDKs including Flutter/React Native, and MCP in Agents. Any STT/LLM/TTS/provider dependency must be explicitly inventoried; no paid inference is permitted by default. Preferred realtime human↔CEREBRO benchmark.
- Novu — S++ functional candidate, WRAP/HOLD pending exact open-core boundary review. Core is MIT while enterprise paths/features use a commercial license. Unified in-app/email/SMS/push/chat workflow model is valuable, but CEREBRO must not depend on enterprise-only code or paid providers to pass FREE_PARITY.
- ntfy — S — REUSE candidate for simple self-hosted HTTP→push fallback. Treat as low-complexity notification channel, not a replacement for workflow orchestration.

### Desktop / Windows
- windows-mcp-server — S+ — ADAPT candidate; governance/attestation/audit/kill-switch patterns.
- Zavora Computer Use MCP — S+ — BENCHMARK/ADAPT candidate for cross-platform native computer-use.
- OpenControl — S — BENCHMARK candidate for minimum native Windows runtime.
- desk-mcp — S — ADAPT candidate; UIA/CDP/OCR hierarchy, batching and differential snapshots.
- Touchpoint — S — ADAPT candidate; cross-platform accessibility + CDP.
- windows-gui-mcp — S- — benchmark for trace -> stable deterministic script generation.
- Munim Computer Use — S — benchmark for accessibility-first desktop control.

### Browser
- gsd-browser — S+ — ADAPT candidate; sessions, versioned refs, batching, evidence and human takeover.
- Microsoft Playwright MCP — S — REUSE/WRAP candidate; deterministic accessibility-based browser control.
- Cereon Browser Operator — S — ADAPT/BENCHMARK for authenticated Chrome/CDP bridge patterns.
- CEREBRO Browser Bridge — BASELINE OLD; do not replace without OLD-vs-NEW evidence.

### Android / mobile / QA
- Maestro — S — ADAPT/QA candidate.
- maestro-mcp — S+ — BENCHMARK/ADAPT candidate for agentic generation/execution/diagnosis of Maestro E2E flows; must be source/license/security verified before LAB install.
- android-use — S — benchmark/ADAPT candidate.
- NeuralBridge — S — benchmark/ADAPT candidate.
- Appium — S — WRAP/QA candidate.
- scrcpy — S — complementary visual/control infrastructure.
- DroidPilot — A — benchmark Accessibility-Service architecture.
- Open Mobile MCP — A — benchmark for combined UI state + logs + screen evidence.

### Public web acquisition / extraction
- Crawlee Python — S — ADAPT/REUSE candidate.
- Crawl4AI — S — ADAPT candidate for web-to-knowledge transformation.
- turbo-surf — S- — benchmark Rust fast-path; upstream performance claims unverified.

### SEO / research
- OpenSERP — S+ candidate subject to current repository/license verification and ToS-compliant use only.
- Crawlie — S candidate subject to current repository/license verification; technical SEO/GEO QA role.
- thatseoagent-mcp — S candidate subject to source/license verification; GSC/GA4/PageSpeed operational layer.
- gocrawl — A HOLD/BENCHMARK; avoid redundant adoption unless it beats the selected stack.

### Document intelligence
- Xberg — S+ — REUSE candidate for broad document intelligence.
- docparse-rs — S — REUSE/benchmark candidate for deterministic, provenance-preserving fast path.

### Social operations
- Pendpost — S — preferred governance candidate if current source/license verification confirms prior findings.
- BrightBean Studio — S — LAB candidate; official APIs/self-host/multi-workspace claims require source/license/security verification.
- PostSider — S functional challenger but AGPL boundary makes WRAP/HOLD preferable for proprietary productization.
- TryPost — A+ HOLD/BENCHMARK; avoid expanding social stack without material measured advantage.

### Observability / replay / evaluation
- Lookspan — S — REUSE/WRAP candidate for traces, datasets, OLD-vs-NEW and evaluation, subject to source verification.
- OpenReplay — S — WRAP/LAB candidate for session replay and UI evidence.
- OpenTelemetry + local collector — preferred standards-based telemetry path.
- mcp-tape — A/HOLD experimental challenger; small community means it is not a primary production dependency without stronger evidence.

## P0 APP FACTORY gate

A universal-app candidate must be tested on a minimal CEREBRO reference application containing authentication boundary mocks, navigation, forms, local state, API client abstraction, notification hook, accessibility labels and failure/recovery states. Required evidence:
1. Reproducible clean build from pinned upstream/toolchain versions.
2. Static analysis/lint and unit tests GREEN.
3. Android build + E2E; Windows build + E2E. iOS/macOS require an authorized macOS runner and are not to be simulated.
4. Tablet/responsive layout test.
5. Offline/network-loss/retry behavior.
6. Secret scan and dependency/license inventory.
7. Artifact provenance/checksum and rollback procedure.
8. OLD-vs-NEW comparison: implementation time, build time, artifact size, runtime memory/CPU where measurable, testability, native integration effort and maintenance complexity.
9. Tribunal decision before PREPROD/PROD.

Flutter is default universal baseline; Tauri is evaluated as desktop-specialist, not forced into a false one-winner comparison.

## P0 HUMAN COMMUNICATION gate

No real customer or employee contact is allowed during LAB tests. Use synthetic identities/endpoints or explicitly authorized test recipients only.

LiveKit gate:
1. Pin Server + Agents versions/commits and inventory all licenses including model/plugin licenses.
2. Self-host/local transport test with no mandatory cloud spend.
3. Synthetic audio loop: connect → receive audio → agent turn → tool invocation mock → response → disconnect.
4. Interruption/timeout/reconnect tests.
5. Authentication/authorization and room isolation tests.
6. No transcript/audio retention by default; retention must be explicit and bounded.
7. Secrets never enter prompts/logs/evidence.
8. Measure end-to-end latency, reconnect success and resource use.

Novu gate:
1. Verify exact MIT/open-core boundary at pinned revision.
2. Self-host core only; enterprise/commercial paths excluded unless separately approved.
3. Use local/synthetic notification provider first; no paid SMS/email provider required for gate.
4. Test idempotency, preferences, retries, escalation, auditability and tenant/workspace isolation.
5. Prove CEREBRO can issue a channel-agnostic CONTACT intent without exposing provider credentials.

ntfy gate:
1. Self-host/local only for baseline.
2. Authenticated topic, non-sensitive synthetic payload.
3. Delivery/retry/offline test and bounded retention.
4. Never use public topics for CEREBRO operational data.

## Existing benchmark gates

### Desktop gate
Compare current desktop path vs selected challengers on authorized targets. Measure p50/p95 latency, task success, round-trips, tokens, background execution, authenticated Chrome, Win32/WPF/Electron coverage, recovery, multi-monitor behavior, auditability, human abort and skillification.

### Browser gate
Compare Browser Bridge vs gsd-browser vs Playwright MCP. Measure success rate, latency, token volume, stale-reference handling, session persistence, evidence quality, recovery and deterministic replay. Exclude stealth/anti-detection features.

### Mobile gate
Compare selected mobile adapters on the same authorized device/tasks. Measure setup, p50/p95 action latency, E2E time, model calls, tokens, success/recovery, stability, resource consumption, permissions/revocation and batching.

### Web gate
Use a representative public corpus. Measure pages/minute, CPU/RAM, Markdown quality, structured extraction, link recall, JS correctness, recovery, robots/rate-limit compliance and cost per 1,000 pages. No CAPTCHA or anti-abuse bypass testing.

### Document gate
Use anonymized/synthetic representative financial/real-estate documents. Measure field accuracy, tables, reading order, provenance, reproducibility, OCR fallback, RAM, time/page, error recovery and suspicious-content handling. Critical financial fields require independent validation.

### Social gate
Use official/public APIs or authorized accounts only. Measure coverage, approval separation, idempotency, retries, audit, RBAC/workspace isolation, token/secret handling, analytics/inbox value and incremental cost. No cookie/session scraping or unofficial private APIs.

### Observability gate
Separate intent/tool traces, runtime telemetry, UI outcome and replay/evaluation. Require secret redaction, bounded retention and no external egress by default.

## Promotion rule

A candidate may move LAB → PREPROD → PROD only when all are true:
1. License and security review pass on pinned revision.
2. FREE_PARITY_GATE passes.
3. No new mandatory spend.
4. Measured OLD-vs-NEW shows material benefit or a clearly new required capability.
5. Reliability, failure recovery and rollback are demonstrated.
6. Privacy/secrets controls pass.
7. QA/Tribunal passes with real evidence.
8. Governed promotion mechanism authorizes and records the change.

A deadline never overrides a red gate. Until then: CANDIDATE != INTEGRATED != PRODUCTION.
