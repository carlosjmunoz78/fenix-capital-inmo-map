# CEREBRO TECH_SCOUT — Governed LAB Candidate Intake

Date: 2026-10-19
Status: LAB_CANDIDATES_ONLY
Production: FORBIDDEN
External code execution: FORBIDDEN in this intake
External installation: FORBIDDEN in this intake
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
- PROD promotion is outside this dossier and requires the existing governed promotion path.

## Consolidated priority shortlist

### Desktop / Windows
- windows-mcp-server — S+ — ADAPT candidate; governance/attestation/audit/kill-switch patterns.
- desk-mcp — S — ADAPT candidate; UIA/CDP/OCR hierarchy, batching and differential snapshots.
- Touchpoint — S — ADAPT candidate; cross-platform accessibility + CDP.
- windows-gui-mcp — S- — benchmark for trace -> stable deterministic script generation.
- Munim Computer Use — S — benchmark for accessibility-first desktop control.

### Browser
- gsd-browser — S+ — ADAPT candidate; sessions, versioned refs, batching, evidence and human takeover.
- Microsoft Playwright MCP — S — REUSE/WRAP candidate; deterministic accessibility-based browser control.
- CEREBRO Browser Bridge — BASELINE OLD; do not replace without OLD-vs-NEW evidence.

### Android / mobile
- android-use — S — benchmark/ADAPT candidate.
- NeuralBridge — S — benchmark/ADAPT candidate.
- Maestro — S — ADAPT/QA candidate.
- Appium — S — WRAP/QA candidate.
- scrcpy — S — complementary visual/control infrastructure.
- MobileRun MCP — HOLD/BENCHMARK pending deeper license/security review; preserve stale-handle invalidation pattern.

### Public web acquisition / extraction
- Crawlee Python — S — ADAPT/REUSE candidate.
- Crawl4AI — S — ADAPT candidate for web-to-knowledge transformation.
- turbo-surf — S- — benchmark Rust fast-path; upstream performance claims unverified.
- Other Rust challengers (webclaw, Essence, Crawlberg, fastCRW) — benchmark only; avoid redundant adoption.

### Document intelligence
- Xberg — S+ — REUSE candidate for broad document intelligence.
- docparse-rs — S — REUSE/benchmark candidate for deterministic, provenance-preserving fast path.

### Social operations
- BrightBean Studio — S — LAB candidate; official APIs/self-host/multi-workspace claims require source/license/security verification before adoption.
- Pendpost — S- — preferred governance pattern: local-first, fail-closed and separated human approval.
- Other social schedulers remain comparators/HOLD unless they demonstrate material advantage.

### Observability / replay / evaluation
- mcp-tape — S — REUSE/WRAP candidate for MCP trace recording/replay with secret redaction.
- Lookspan — S — REUSE/WRAP candidate for traces, datasets, OLD-vs-NEW and evaluation.
- OpenReplay — S — WRAP/LAB candidate for session replay and UI evidence.
- OpenTelemetry + otlp-mcp — A+/S- pattern; standard telemetry path, localhost-only unless independently secured.

## LAB benchmark gates

### Desktop gate
Compare current Browser Bridge / existing desktop path vs windows-mcp-server, desk-mcp, Touchpoint and windows-gui-mcp on authorized Windows targets. Measure p50/p95 latency, task success, round-trips, tokens, background execution, authenticated Chrome, Win32/WPF/Electron coverage, frozen-window recovery, multi-monitor behavior, auditability, human abort and skillification.

### Browser gate
Compare Browser Bridge vs gsd-browser vs Playwright MCP. Measure success rate, latency, token volume, stale-reference handling, session persistence, evidence quality, recovery and deterministic replay. Exclude stealth/anti-detection features from evaluation.

### Mobile gate
Compare android-use, NeuralBridge, Maestro and Appium on the same authorized physical device/tasks. Measure setup, p50/p95 action latency, E2E task time, model calls, tokens, success/recovery, stability, resource consumption, permissions/revocation and batching. scrcpy remains complementary.

### Web gate
Use a representative public corpus. Compare Crawlee/Crawl4AI baseline with challengers on pages/minute, CPU/RAM, Markdown quality, structured extraction, link recall, JS correctness, recovery, robots/rate-limit compliance and cost per 1,000 pages. No CAPTCHA or anti-abuse bypass testing.

### Document gate
Use anonymized/synthetic representative FEIN, payroll, employment-history, bank-statement, appraisal, land-registry, IBI and contract documents. Compare Xberg and docparse-rs on field accuracy, tables, reading order, provenance/bounding boxes, reproducibility, OCR fallback, RAM, time/page, error recovery and suspicious-content handling. Critical financial fields require independent validation.

### Social gate
Compare current SOC-001 baseline, BrightBean Studio and Pendpost only through official/public APIs or authorized accounts. Measure platform coverage, approval separation, idempotency, retries, audit trail, RBAC/workspace isolation, token/secret handling, analytics/inbox value and incremental cost. No cookie/session scraping or unofficial private APIs.

### Observability gate
Evaluate mcp-tape + OpenTelemetry/otlp-mcp + Lookspan/OpenReplay as separable layers: intent/tool calls, runtime telemetry, UI outcome, replay/evaluation. Require secret redaction, bounded retention and no external egress by default.

## Promotion rule

A candidate may move beyond LAB only when all are true:
1. License and security review pass.
2. FREE_PARITY_GATE passes.
3. No new mandatory spend.
4. Measured OLD-vs-NEW shows material benefit.
5. Reliability and rollback are demonstrated.
6. Privacy/secrets controls pass.
7. QA/Tribunal passes.
8. Governed promotion explicitly authorizes the change.

Until then: CANDIDATE != INTEGRATED != PRODUCTION.
