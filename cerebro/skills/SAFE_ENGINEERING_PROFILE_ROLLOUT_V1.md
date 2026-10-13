# CEREBRO 184 · Safe Engineering Profile rollout block

Covers rollout items 25-37 after the skill-evolution foundation (items 1-12) is physically GREEN and integrated.

Target: one transversal CEREBRO Safe Engineering Profile, not separate agent silos.

## Live candidate audit · 2026-10-13

| Item | Candidate / capability | Live finding | Disposition |
|---:|---|---|---|
| 25 | OpenCode | Current active upstream is `anomalyco/opencode` (MIT). The older `opencode-ai/opencode` repository is archived and must not be selected as the maintained source. | REUSE/WRAP current upstream only; no separate engine. |
| 26 | Superpowers | `obra/superpowers` is active and MIT; provides planning, TDD, systematic debugging, worktrees, code review and finish-branch workflows. | EXTRACT/WRAP unique workflow value into the common profile. |
| 27 | Addy Osmani Agent Skills | `addyosmani/agent-skills` is MIT and defines a production engineering lifecycle (define/plan/build/verify/review/ship) with portable skill contracts. | REUSE compatible skills; dedupe against Superpowers. |
| 28 | Karpathy Skills | `multica-ai/andrej-karpathy-skills` is the pinned community upstream used for this rollout; it is MIT but remains a third-party distillation of Karpathy's published practices, not official Karpathy-authored skills. | EXTRACT four behavioral guardrails with attribution preserved; no official-source overclaim. |
| 29 | Ponytail | `DietrichGebert/ponytail` is the pinned maintained upstream and MIT; it provides a YAGNI/reuse/stdlib/platform/installed-dependency/minimum-code ladder. | EXTRACT anti-overengineering gate into the common profile. |
| 30 | Agency Agents | `msitarzewski/agency-agents` is MIT and a large role/agent catalogue. | ROLE-SPEC SOURCE only; do not create hundreds of agents/servers. |
| 31 | e2e patterns | CEREBRO already has QA/E2E and verification gates. | EXTEND existing QA-001; no new engine/dependency unless a measured gap remains. |
| 32 | Git worktrees/sandboxes | Native Git isolation plus existing branch/PR gates already fit CEREBRO. Superpowers also carries worktree discipline. | ADOPT as execution policy; no new engine. |
| 33 | OpenClaw | Exact upstream pinned as `openclaw/openclaw`, MIT. It has a self-hosted gateway, skills, tools, sessions, model/provider policy and external coding-harness support. | BENCHMARK/WRAP only unique gateway/harness patterns; do not replace CEREBRO Gateway/runtime. |
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
- Items 25-37: **HECHO / INTEGRATED_MAIN_VALIDATED** como `CEREBRO_SAFE_ENGINEERING_PROFILE_V1`.
- Feature PR `#637` merged in `main` at `6db0cdd4dea493bacacd7d877558509efbd838fe`.
- Post-merge gate hardening PR `#652` merged at `30db184b8e3fac433af9dbad7f2f96f88594eda1`.
- Post-merge Safe Engineering run `38473230754`: focused contract, AUTO-001, Skill Evolution, Evaluation Tribunal, full CEREBRO y main baseline = PASS con Node 24.
- Runtime smoke sobre el mismo HEAD de `main` = PASS; `PROD Live Deploy` = SKIPPED y no forma parte de la autorización de este bloque.
- OLD vs NEW: NEW_BETTER por añadir la capacidad requerida sin regresión observable de tests, seguridad, política, coste, autoridad PROD o Trading.
- Registro de provenance/licencia/estado: `cerebro/registry/safe-engineering-profile.v1.json`.
- Evidencia, rollback y rebuild: `cerebro/docs/CEREBRO_SAFE_ENGINEERING_PROFILE_V1_2026-10-13.md`.
- External source identity/license blockers: ninguno para las disposiciones seleccionadas.
- Evolver permanece patterns-only por política; Claude-Mem permanece LAB memory only; no se instala ninguna dependencia de pago.
- Autoridad permanece limitada: `prod_authorized=false`, `prod_write_authorized=false`, `trading_access=false`.
- Siguiente bloque autorizado: items 38-50.
