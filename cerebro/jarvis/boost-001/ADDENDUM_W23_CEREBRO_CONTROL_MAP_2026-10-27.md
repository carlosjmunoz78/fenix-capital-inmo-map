# CEREBRO OS · JARVIS BOOST 001 · ADDENDUM W23 · CEREBRO CONTROL MAP

Status: DEFINIDO / REQUIRED_FOR_BOOST
Owner authority: CARLOS_OWNER_ROOT
Environment: additive indexing layer only; no existing paths are moved as part of W23.

This addendum extends W00-W22. Its purpose is to make the whole CEREBRO codebase and operating system easy for humans, Jarvis, DeepSeek and CEREBRO agents to locate, understand, audit, repair and evolve without rediscovering the repository on every task.

## W23 · CEREBRO CONTROL MAP / ROUTE REGISTRY

### Core principle
Do NOT reorganize or move existing CEREBRO code merely to make the repository look cleaner.

Create an additive canonical navigation/index layer over the existing system first.

Rule:
CONSERVAR -> INDEXAR -> RESOLVER -> VERIFICAR -> only then propose migrations if evidence justifies them.

### Target owner experience
Jarvis, DeepSeek or any authorised agent should be able to resolve questions such as:
- where is the Browser runtime?
- where are its contracts, tests, configs and rollback procedures?
- what depends on Console View 0?
- which files implement SEO Director?
- which agents/subagents belong to Facebook?
- where is APPFACT-001?
- where is the current production entrypoint for a capability?
- what must be tested if this file changes?

without scanning the entire repository from scratch.

### Proposed canonical additive structure
Create, after W00 verifies actual paths, a root navigation layer such as:

`cerebro/_map/`

with generated/versioned artifacts including at minimum:

- `README.md` — human/Jarvis entrypoint and navigation instructions.
- `routes.v1.json` — machine-readable canonical route registry.
- `systems.v1.json` — systems/departments/capabilities catalogue.
- `interfaces.v1.json` — JARVIS, Work, Neural, App Fenix and other surfaces.
- `agents.v1.json` — agents/subagents and ownership/departments.
- `engines.v1.json` — links to canonical Engine Registry rather than duplicating it.
- `dependencies.v1.json` — directed dependency graph.
- `contracts.v1.json` — contract locations and versions.
- `tests.v1.json` — test suites/gates by capability.
- `environments.v1.json` — LAB/PREPROD/PROD anchors and deploy ownership.
- `data.v1.json` — data stores/contracts by company/system, without secrets.
- `integrations.v1.json` — external services/connectors/browser procedures.
- `runbooks.v1.json` — operational/runbook index.
- `ownership.v1.json` — company/department/capability ownership and authority.
- `aliases.v1.json` — old names, human names and canonical IDs.
- `change-impact.v1.json` — reverse dependency / likely-impact index where deterministically derivable.
- `CEREBRO_MAP.md` — concise human-readable generated overview.

Names may be adjusted after W00 if an equivalent canonical location already exists; do not create a duplicate registry unnecessarily.

### Route record minimum contract
Every route/capability record should contain, where applicable:
- `id`;
- `name`;
- `type`;
- `company_scope`;
- `department`;
- `environment`;
- `status` (HECHO / EXISTENTE / PARCIAL / DEFINIDO / PLANIFICADO / POR_AUDITAR);
- `canonical_path`;
- `entrypoints`;
- `config_paths`;
- `contract_paths`;
- `test_paths`;
- `runbook_paths`;
- `data_contracts`;
- `depends_on`;
- `used_by` or reverse-dependency reference;
- `interfaces`;
- `agents` / `engines` / `skills` links;
- `deployment_anchor` where applicable;
- `rollback_anchor`;
- `owner`;
- `last_verified_commit`;
- `last_verified_at`;
- `evidence`;
- `notes`.

No passwords, API keys, session tokens or secret values may ever be stored in this map. Secret references/IDs only.

### Resolver capability
Create a deterministic resolver capability, provisionally `MAP-001` or equivalent if one already exists, able to answer machine requests such as:

- `resolve capability browser.runtime`
- `resolve interface jarvis.view0`
- `resolve agent seo.technical`
- `impact path cerebro/.../file.ts`
- `dependencies capability appfact-001`
- `tests capability social.facebook`

Output should be structured JSON plus optional human-readable explanation.

Jarvis and APPFACT-001 should use the resolver before broad repository search when the requested item is known to the map.

### Auto-generation, not manual rot
The map must not become a stale hand-written document.

W23 must design a generator/scanner that derives as much as possible from:
- repository tree;
- Engine Registry;
- manifests;
- package/workspace metadata;
- imports/references where safely derivable;
- test naming/contracts;
- deployment configs;
- existing docs/runbooks;
- agent/capability manifests;
- explicit curated overrides only for facts that cannot be derived reliably.

Generated output must be deterministic and version-controlled.

### Drift protection
Add validation so a PR cannot silently leave the map pointing to missing critical paths.

At minimum detect:
- canonical path missing;
- contract/test link missing after a move;
- duplicate canonical IDs;
- broken aliases;
- invalid environment labels;
- company isolation violations in metadata;
- capability marked HECHO without required evidence anchors;
- stale generated map when source manifests changed.

Where safe, CI should regenerate and compare the map; otherwise fail with an actionable drift report.

### Dependency/impact graph
W23 should generate a graph consumable by:
- DeepSeek audit;
- change-impact analysis;
- Tribunal/EVA;
- APPFACT-001;
- JARVIS technical drill-down;
- Neural visual interface.

This graph must allow forward and reverse navigation:
`component -> dependencies` and `component -> dependants`.

### Neural integration
The Neural interface should render the canonical Control Map rather than invent a separate client graph.

Possible filters:
- company;
- department;
- environment;
- agent/subagent;
- engine/capability;
- interface;
- active job;
- status;
- dependency/impact path;
- health/gate state.

Selecting a node should expose its canonical route, contracts, tests, evidence and related jobs where authorised.

### JARVIS integration
From JARVIS View 0 Carlos should be able to ask naturally:
- `¿Dónde está el navegador de CEREBRO?`
- `Enséñame todo lo que depende de SEO.`
- `¿Qué tocarías para corregir Work?`
- `Abre el mapa de APPFACT.`
- `Qué pruebas pasan si modificamos esta parte?`

Jarvis resolves through MAP-001 and can open the relevant Work/Neural/technical view.

### DeepSeek audit use tomorrow
W00 must feed W23.

DeepSeek should NOT manufacture paths from memory. It must:
1. inventory actual repository/live paths;
2. classify canonical vs legacy/alias paths;
3. build the first route/dependency map;
4. identify orphaned/unmapped components;
5. identify duplicate routes and conflicting sources of truth;
6. propose mappings before any structural migration;
7. use the map as navigation input for subsequent W01-W22 work;
8. update/validate the map as changes are made.

### Migration policy
W23 does not authorise moving directories or renaming modules.

If the audit finds genuinely harmful structure, create a separate migration candidate with:
- dependency map;
- snapshot/backup;
- behavior tests;
- compatibility aliases/wrappers;
- PREPROD;
- OLD-vs-NEW;
- rollback;
- gradual promotion.

### Acceptance criteria
W23 is GREEN only when:
1. all major CEREBRO systems in W00 are mapped;
2. every mapped major capability has canonical route + contract/test anchors where they exist;
3. resolver returns deterministic paths;
4. forward/reverse dependency graph is queryable;
5. orphan/unmapped report exists;
6. map generation is reproducible;
7. drift validation exists;
8. no secrets are stored;
9. JARVIS can query the map;
10. Neural can consume the same canonical graph;
11. APPFACT-001 can locate its own build/test/deploy assets through the map;
12. at least one real repair task demonstrates reduced discovery work using MAP-001.

### Success principle
The goal is not a prettier directory tree.

The goal is a CEREBRO that knows where every important part of itself lives, what it depends on, what depends on it, how it is tested, how it is operated and how to reach it safely.