# Expedientes · publicación controlada 2026-11-09

Release source baseline: `10efb154840e32bde4f3cf527c88a417d4526d42`
Current live deployment snapshot (expected): `01650c6fb728aa9d41dc4877dd4bee243372be68`.
Backup branch: `backup/gh-pages-before-expedientes-20261109`.
Scope: exactly 4 production source files (DetailShell, ExpedienteManualPhaseGuard, and 2 CSS); no other application modules, DNS, users, tables, or CRM data.
Checks before release: two isolated Playwright tests green, TypeScript and Vite build green on release source.
Database: additive allowed-stage migration applied and RLS enabled on three tables with original definitions in the PR #41.
Publish gate checks previous gh-pages ref using force-with-lease and otherwise fails closed.
Live smoke and rollback availability to be verified after publish. 
