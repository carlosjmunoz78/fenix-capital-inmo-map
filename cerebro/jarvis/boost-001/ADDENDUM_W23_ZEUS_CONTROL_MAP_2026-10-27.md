# ZEUS · JARVIS BOOST 001 · ADDENDUM W23 · ZEUS CONTROL MAP

Status: DEFINIDO / REQUIRED_FOR_BOOST
Owner authority: CARLOS_OWNER_ROOT
Environment: additive indexing layer only; no existing paths are moved as part of W23.

This addendum supersedes the project-root naming of `ADDENDUM_W23_CEREBRO_CONTROL_MAP_2026-10-27.md` while preserving it as a compatibility reference.

## Canonical hierarchy
- **ZEUS** = project/system umbrella and living master project visible to Carlos.
- **JARVIS** = primary executive human interface to ZEUS.
- **CEREBRO OS** = fundamental operational/intelligence subsystem inside ZEUS, not the whole of ZEUS.
- Business companies, products, interfaces, Browser, APPFACT, Social, SEO, device workers, knowledge, training and future systems are represented as ZEUS domains/subsystems according to their real ownership and dependencies.

## W23 · ZEUS CONTROL MAP / ROUTE REGISTRY

### Mission
Create an additive canonical navigation/index layer over all verified ZEUS assets so humans, Jarvis, DeepSeek and authorised agents can locate, understand, audit, repair and evolve the system without rediscovering repositories and services from scratch.

Do not reorganize or move existing code merely to make the tree prettier.

Rule:
CONSERVAR -> INDEXAR -> RESOLVER -> VERIFICAR -> only then propose migrations if evidence justifies them.

### Scope
W00 must determine the real ZEUS boundary. W23 then indexes at minimum the verified domains relevant to ZEUS, including where present:
- CEREBRO OS core;
- JARVIS interfaces and runtime;
- Console / Work / Neural / technical views;
- Browser Runtime / Browser Bridge / browser profiles;
- APPFACT-001 / digital-build capabilities;
- Social departments and agents/subagents;
- SEO department and agents/subagents;
- App Fenix and other company applications;
- CRM / Supabase / WordPress / Notion integrations;
- knowledge, memory, training and learning/RSI;
- IAM / Vault / standing permissions;
- device workers / PC / mobile;
- companies such as Fenix Capital, AION, CAPTACASA and future companies where they are part of ZEUS-managed scope;
- repositories, branches, deployments, environments and operational runbooks.

### Canonical map root
After W00 verifies actual paths and existing registries, create or reuse a canonical route-map location. A candidate is `zeus/_map/` if repository structure supports it, otherwise retain the safest existing physical location and expose ZEUS as the logical root.

Do not create duplicate registries if equivalent canonical sources already exist.

Generated/versioned artifacts should cover at minimum:
- master overview;
- routes;
- systems/domains;
- interfaces;
- agents/subagents;
- engines/capabilities;
- dependencies and reverse dependencies;
- contracts;
- tests/gates;
- environments/deploy anchors;
- data-contract references without secrets;
- integrations;
- runbooks;
- ownership/authority;
- aliases/legacy names;
- change-impact index;
- health/evidence anchors.

### Minimum route contract
Every mapped component should record where applicable:
`id`, `name`, `type`, `zeus_domain`, `company_scope`, `department`, `environment`, `status`, `canonical_path`, `entrypoints`, `config_paths`, `contract_paths`, `test_paths`, `runbook_paths`, `data_contracts`, `depends_on`, reverse dependencies, related interfaces/agents/engines/skills, deployment/rollback anchors, owner, last verified commit/time, evidence and notes.

No secret values are permitted. Secret references only.

### Resolver
Create or reuse a deterministic resolver capability (`MAP-001` or canonical equivalent) able to resolve natural/system requests such as:
- `resolve zeus`
- `resolve subsystem cerebro`
- `resolve interface jarvis.view0`
- `resolve capability browser.runtime`
- `resolve appfact-001`
- `impact path ...`
- `dependencies seo`
- `tests social.facebook`

Output: structured data plus optional human explanation.

### Generator and drift protection
The map must be generated/validated from real sources as much as possible: repository trees, registries, manifests, package/workspace metadata, imports/references, tests, deployment configs, docs/runbooks, agent/capability manifests and curated overrides only where derivation is unreliable.

CI or an equivalent deterministic gate must detect broken canonical paths, duplicate IDs, invalid aliases, missing critical anchors, environment inconsistencies, stale generated map and unsupported HECHO claims.

### Neural / JARVIS / APPFACT use
- **Neural** renders the same canonical ZEUS graph.
- **JARVIS** uses MAP-001 to navigate and explain ZEUS.
- **APPFACT-001** resolves its build/test/deploy dependencies through the map.
- DeepSeek audits use the map after W00 instead of repeatedly scanning the whole universe.

### Acceptance
W23 is GREEN only when the major verified ZEUS domains are mapped, forward/reverse dependencies are queryable, orphan/unmapped reports exist, generation is reproducible, drift validation exists, no secrets are stored, JARVIS can query it, Neural can render it, APPFACT can consume it, and at least one repair demonstrates reduced discovery work.

### Principle
The goal is not a prettier directory tree. The goal is that **ZEUS knows where every important part of itself lives, including CEREBRO, what it depends on, what depends on it, how it is tested and how to reach it safely**.
