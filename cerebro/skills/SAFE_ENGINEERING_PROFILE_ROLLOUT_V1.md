# CEREBRO 184 · Safe Engineering Profile rollout block

Covers rollout items 25-37 after the skill-evolution foundation (items 1-12) is physically GREEN and integrated.

Target: one transversal CEREBRO Safe Engineering Profile, not separate agent silos.

## Live candidate audit · 2026-10-13

| Item | Candidate / capability | Live finding | Disposition |
|---:|---|---|---|
| 25 | OpenCode | Current active upstream is `anomalyco/opencode` (MIT). The older `opencode-ai/opencode` repository is archived and must not be selected as the maintained source. | REUSE/WRAP current upstream only; no separate engine. |
| 26 | Superpowers | `obra/superpowers` is active and MIT; provides planning, TDD, systematic debugging, worktrees, code review and finish-branch workflows. | EXTRACT/WRAP unique workflow value into the common profile. |
| 27 | Addy Osmani Agent Skills | `addyosmani/agent-skills` is MIT and defines a production engineering lifecycle (define/plan/build/verify/review/ship) with portable skill contracts. | REUSE compatible skills; dedupe against Superpowers. |
| 28 | Karpathy Skills | The useful public packages are third-party distillations of Karpathy's published practices, not official Karpathy skills. | PATTERNS_ONLY until exact upstream/license/provenance is pinned; no attribution overclaim. |
| 29 | Ponytail | Maintained public skill emphasizes YAGNI/reuse/stdlib/platform/installed-dependency/minimum-code ladder. | EXTRACT anti-overengineering gate; verify exact license before any source-code reuse. |
| 30 | Agency Agents | `msitarzewski/agency-agents` is MIT and a large role/agent catalogue. | ROLE-SPEC SOURCE only; do not create hundreds of agents/servers. |
| 31 | e2e patterns | CEREBRO already has QA/E2E and verification gates. | EXTEND existing QA-001; no new engine/dependency unless a measured gap remains. |
| 32 | Git worktrees/sandboxes | Native Git isolation plus existing branch/PR gates already fit CEREBRO. | ADOPT as execution policy; no new engine. |
| 33 | OpenClaw | Candidate identity/source still requires exact upstream verification before code reuse. | HOLD_SOURCE_IDENTITY; patterns only until verified. |
| 34 | Hermes Agent | `NousResearch/hermes-agent` is MIT and current; persistent memory/tools/skills/cron/MCP are useful reference capabilities. | BENCHMARK/WRAP unique capabilities only; do not replace CEREBRO runtime. |
| 35 | AbacusAI Bot OSS | `abacusai/abacusai-bot` is MIT/free desktop software with standing bots, routines, connectors and local/provider routing, but is an application rather than a stable SDK/runtime contract. | BENCHMARK patterns; no core dependency. |
| 36 | Claude-Mem | `thedotmack/claude-mem` open core is Apache-2.0; memory engine/server/CLI/SDK/adapters/MCP are permissive while hosted/private areas are reserved. | LAB memory capability; preserve CEREBRO source-of-truth rules. |
| 37 | Evolver | `EvoMap/evolver` states GPL-3.0-or-later for current open releases and a transition toward source-available for future releases. | PATTERNS/BENCHMARK only unless legal/license gate explicitly clears reuse. |

## Integration rules

1. No candidate is installed merely because it exists.
2. Each candidate must pass overlap, license, cost, security, provenance and OLD-vs-NEW review.
3. Unique value is wrapped into existing FACT/Digital Build/QA/Runtime/Memory/LRN capabilities.
4. Duplicate value is rejected or catalogued, not installed twice.
5. No new engine is created for any item 25-37 by default.
6. No paid model/provider is required for acceptance.
7. External telemetry is disabled where the upstream supports disabling it and is not required for the capability.
8. Git worktree/sandbox isolation is the default mutation boundary for engineering work.
9. Evidence-before-claims, regression tests, rollback and rebuild remain mandatory.
10. PROD promotion remains separate from integration; Trading stays isolated.

## Current state

- Items 1-12: GREEN PREPROD / integrated foundation.
- Items 25-37: ACTIVE_AUDIT_COMPLETE_FOR_MOST_CANDIDATES; runtime integration not yet GREEN.
- Outstanding source verification before runtime integration: OpenClaw exact upstream; exact Karpathy/Ponytail source-license pinning.
- Next action: build one deterministic `CEREBRO_SAFE_ENGINEERING_PROFILE_V1` contract that composes only the accepted behaviors, then run overlap + adversarial + regression + OLD-vs-NEW gates before merge/promotion.
