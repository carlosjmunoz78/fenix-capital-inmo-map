# CEREBRO OS · JARVIS BOOST 001 · ADDENDUM W21/W22 · 2026-10-27

Status: DEFINIDO / REQUIRED_FOR_BOOST
Owner authority: CARLOS_OWNER_ROOT
Environment: LAB -> PREPROD; PROD only after canonical promotion gates.

This addendum is binding scope for BOOST-001 and extends `MASTER_SCOPE_2026-10-27.md` without replacing or weakening W00-W20.

## Priority rule
W21 and W22 are SUPER IMPORTANT owner priorities. DeepSeek must audit, design, repair and help implement them after the mandatory live-state freeze/canary and in parallel where dependencies allow. They are not optional polish.

The objective is not to replace CEREBRO with DeepSeek, Codex, Work, Replit, Lovable, Base44, OpenHands or any other external product. CEREBRO owns the interfaces, App Factory, knowledge, execution contracts, tests, artifacts and learning. External models/tools are replaceable accelerators routed by CEREBRO.

---

# W21 · CEREBRO INTERFACE COMPLETION · VISTA 0 = JARVIS

## Canonical identity
The current Console View 0 is renamed and completed as **JARVIS**.

JARVIS View 0 is the primary executive interface for Carlos and must feel like a persistent Work-style operating workspace, not a simple chat page.

The user must be able to arrive with an idea, question, command, file, URL, project or business problem and delegate the work to Jarvis/CEREBRO without having to choose engines manually.

## Preserve all existing interfaces
Do not delete, flatten or replace existing Console surfaces.

Audit and finish every existing interface, including at minimum any currently implemented or partially implemented:
- JARVIS / Console View 0;
- Work/workspace-style interface;
- Neural / highly visual interface;
- technical/engine views;
- history/audit/evidence views;
- any other Console modes discovered in W00.

For every interface classify: HECHO / EXISTENTE / PARCIAL / DEFINIDO / PLANIFICADO / POR AUDITAR.

Default action for an existing interface is KEEP_PENDING_AUDIT.

## JARVIS View 0 required experience
JARVIS View 0 must provide, directly or through progressive disclosure:
- text conversation;
- voice conversation;
- animated/live Jarvis state;
- company selector;
- business/project/context selector;
- file/image/document input;
- URL input;
- task creation and delegation;
- visible plan and execution state;
- active jobs;
- subtask/agent activity where useful;
- artifacts/results;
- preview surfaces for apps/sites/documents where possible;
- browser actions and Browser CEREBRO status;
- PC/mobile/device execution status;
- HUMAN_REQUIRED interruptions;
- notifications;
- cost/budget status;
- history and resumable tasks;
- evidence/audit drill-down;
- rollback/retry/cancel controls when allowed;
- same context/memory across mobile, PC and other Jarvis surfaces.

## Work-style behavior
A user request such as `Hazme una app para X` must create a durable work item, not merely a chat answer.

A work item must have:
- request_id / job_id;
- company_id;
- project/context;
- environment;
- goal;
- acceptance criteria;
- plan;
- tasks/subtasks;
- assigned capabilities/agents;
- current state;
- evidence;
- artifacts;
- cost;
- blockers;
- HUMAN_REQUIRED reason if any;
- final acceptance result.

The user can leave and later reopen the same job without losing state.

## Neural interface
The Neural/visual interface is not decoration. Audit its intended contract and finish it so it can visualize real CEREBRO state such as:
- companies;
- engines/capabilities;
- agents/subagents;
- dependencies;
- active jobs;
- events;
- knowledge/context flows;
- health/status;
- blocked/exception paths;
- selected task execution graph.

It must consume canonical state from Gateway/Registry/Event/Job sources rather than invented client-only state.

## Acceptance
W21 is GREEN only when:
1. existing interface inventory is complete;
2. JARVIS is the canonical name/role of View 0;
3. View 0 can create/resume a durable CEREBRO work item;
4. it can show live execution and artifacts;
5. Work and Neural surfaces are reconciled and finished against their contracts;
6. mobile/desktop responsive behavior is tested;
7. no direct model dependency bypasses CEREBRO Gateway;
8. regression tests preserve current Console behavior.

---

# W22 · APPFACT-001 · CEREBRO AUTONOMOUS APP FACTORY

## Mission
Create a first-class CEREBRO capability able to transform an owner idea into a tested, viewable, controllable and deliverable application.

Owner-level target experience:

`Carlos -> JARVIS: "Hazme una app para ..." -> APPFACT-001 -> finished working product + evidence`.

The final response must not merely be a code scaffold. The target is a completed product to the agreed acceptance criteria.

## Ownership and model independence
APPFACT-001 belongs to CEREBRO OS.

DeepSeek is an optional reasoning/build provider behind Model Router. Removing DeepSeek must not remove App Factory itself.

APPFACT-001 owns:
- workflow;
- manifests;
- product specification;
- architecture decisions/records;
- code/repositories;
- templates/scaffolds;
- sandbox contracts;
- preview/deployment contracts;
- tests;
- browser/visual QA;
- security gates;
- documentation;
- rollback/rebuild;
- knowledge learned from previous builds.

## Reuse existing work first
Before implementing new components, W00/W22 must inventory and contract-test all existing relevant CEREBRO digital-build/App-Factory/Factory/runtime code and prior branches.

Rule: CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR.

No duplicate App Factory is allowed when an existing component can be wrapped/repaired.

## Supported product families
APPFACT-001 must be designed to support, incrementally and through adapters:
- web applications;
- PWA;
- mobile applications;
- desktop applications;
- internal tools/dashboards;
- APIs/backends;
- SaaS products;
- CEREBRO modules/interfaces.

Do not force one framework on all product types. Select stacks through deterministic policy + benchmark/evidence.

## Canonical lifecycle
Every build follows a governed lifecycle:

1. IDEA_INTAKE
2. REQUIREMENTS_DISCOVERY
3. ACCEPTANCE_CONTRACT
4. PRODUCT_SPEC
5. UX_FLOW
6. ARCHITECTURE
7. REPO/BRANCH/ENVIRONMENT_CREATE
8. SCAFFOLD
9. IMPLEMENT
10. BUILD
11. UNIT/CONTRACT/INTEGRATION_TEST
12. SANDBOX_RUN
13. PREVIEW_DEPLOY
14. CEREBRO_BROWSER_VISUAL_AND_FUNCTIONAL_QA
15. SECURITY/PERFORMANCE/ACCESSIBILITY_CHECKS appropriate to product
16. ADVERSARIAL_REVIEW
17. AUTO_REPAIR_LOOP with bounded retries
18. E2E_ACCEPTANCE
19. DOCUMENT/BACKUP/REBUILD/ROLLBACK
20. PREPROD
21. HUMAN_REQUIRED only when canonical exception applies
22. PROD promotion only after canonical gates
23. LRN/FACTORY_PATTERN_CAPTURE

## Multi-agent departments
Preserve CEREBRO's many-agent architecture. APPFACT-001 may coordinate logical specialists/subagents such as:
- Product Director;
- requirements analyst;
- UX researcher;
- UX/UI designer;
- frontend specialists;
- backend/API specialists;
- database/data-contract specialists;
- auth/IAM specialist;
- mobile specialist;
- desktop specialist;
- integration specialist;
- security reviewer;
- QA/test engineer;
- accessibility/performance reviewer;
- Browser QA/visual verifier;
- DevOps/deployment specialist;
- documentation/rebuild specialist;
- adversarial reviewer;
- Tribunal assistant.

Do not collapse proven specialists into a few generic agents merely to simplify architecture. Shared runtime/knowledge/tooling is central; specialization remains logical.

## Build environment
APPFACT-001 requires an isolated disposable or resettable execution environment so generated code cannot damage CEREBRO PROD.

Candidate layers may include existing/local runners, GitHub Actions, Vercel Preview/Sandbox or other zero/low-cost isolated runtimes selected after audit.

Requirements:
- per-job isolation;
- controlled network/credentials;
- dependency installation;
- build/run commands;
- exposed preview port/URL when relevant;
- logs/artifacts;
- snapshots/cache where safe;
- deterministic teardown;
- no production secrets by default.

## Preview and visual control
For UI products, compilation success is insufficient.

APPFACT-001 must be able to:
- deploy/open a real preview;
- use CEREBRO Browser to inspect it visually and through DOM where available;
- interact as a user;
- test desktop/tablet/mobile breakpoints;
- test forms/navigation/auth flows where allowed;
- capture evidence;
- detect functional/visual regressions;
- repair and redeploy;
- repeat until acceptance or a bounded HUMAN_REQUIRED condition.

## Finished-product contract
An app is not `DONE` merely because source code exists.

Minimum delivery evidence where applicable:
- repository/commit/branch;
- reproducible install/build;
- test suite GREEN;
- preview evidence;
- functional E2E GREEN;
- visual QA GREEN;
- security checks;
- environment-variable contract;
- data-contract/migration record;
- rollback/rebuild procedure;
- documentation/runbook;
- cost/runtime footprint;
- known limitations explicitly recorded;
- final acceptance matrix.

## Learning
Every completed/corrected application feeds reusable knowledge back into CEREBRO:
- proven components;
- architecture patterns;
- error/fix pairs;
- tests;
- UX patterns approved by Carlos;
- deployment patterns;
- security patterns;
- stack benchmarks;
- cost/performance measurements.

FACT-001 can convert proven recurring patterns into versioned templates/scaffolds after evaluation. No unverified model output becomes canonical knowledge automatically.

## JARVIS integration
APPFACT-001 must be directly visible and controllable from JARVIS View 0.

JARVIS View 0 must expose for an App Factory job:
- goal/spec;
- current stage;
- task graph;
- agents/subagents active;
- live logs/status in human-readable form;
- current preview;
- screenshots/evidence;
- test results;
- detected issues;
- repair cycles;
- cost;
- final artifacts;
- promotion/rollback status.

Carlos should be able to say:
- `Enséñame cómo va`;
- `Abre la app`;
- `Cambia esto`;
- `Prueba en móvil`;
- `Hazla más sencilla`;
- `Continúa`;
- `Para`;
without leaving JARVIS.

## Infrastructure and cost policy
Do not purchase infrastructure automatically.

Audit current GitHub/Vercel/local/free capabilities first.

Budget separately from DeepSeek:
- AI reasoning/build consumption;
- CI/build minutes;
- sandbox/preview compute;
- hosting;
- domain(s), if useful;
- storage/logging;
- app-store/developer accounts only if/when a real mobile distribution requirement exists.

Prefer existing/free tier until measurable limits block the acceptance contract.

A neutral factory domain such as a dedicated CEREBRO factory domain is OPTIONAL, not a prerequisite. Preview URLs can prove APPFACT-001 first. Any paid domain/plan requires explicit owner approval.

## W22 final acceptance exam
APPFACT-001 is not GREEN until it completes at least one controlled representative application from idea to accepted preview without manual code-writing by Carlos.

The exam must prove:
1. idea intake through JARVIS;
2. durable work item;
3. spec/acceptance contract;
4. code generation/modification;
5. isolated build;
6. automated tests;
7. preview;
8. CEREBRO Browser interaction/visual QA;
9. at least one detected-and-repaired defect or explicit proof no defect exists under the acceptance suite;
10. final evidence package;
11. rebuild/rollback proof;
12. learning/pattern capture;
13. cost report.

---

# Tomorrow execution order amendment
After the existing mandatory preflight, secret/cost canary and W00 evidence freeze:

1. Audit all Console interfaces and locate the real current View 0, Work and Neural implementations/contracts.
2. Freeze their current behavior/tests before edits.
3. Promote **JARVIS View 0** to the canonical owner workspace contract.
4. Inventory existing digital-build/App Factory/Factory components before creating anything new.
5. Produce `APPFACT_CURRENT_STATE`, `APPFACT_DEPENDENCY_MAP`, `APPFACT_BUILD_VS_REUSE_DECISION` and `APPFACT_ACCEPTANCE_MATRIX`.
6. Implement candidates in LAB/PREPROD only.
7. Wire APPFACT-001 into JARVIS View 0.
8. Build and test one representative app end-to-end.
9. Finish/reconcile Work and Neural against real CEREBRO state.
10. Do not promote autonomous production capability until contracts, permissions, tests, evaluation, Tribunal, observability, rollback, backup, rebuild and measured costs are GREEN.

# Definition of tomorrow's success for W21/W22
Success is not `files generated` or `UI mocked`.

Success evidence is progressive:
- EXISTENTE/PARCIAL truth established;
- contracts captured;
- candidates running in LAB/PREPROD;
- visible through JARVIS;
- tests and previews real;
- costs measured;
- remaining blockers explicit.

Do not claim HECHO/operational without live evidence.