# CEREBRO · Registry migration 177 → 178 · BRANDBOOT-001

Date: 2026-10-05  
Status: **STAGED_IN_DRAFT_PR / NOT_MAIN / NOT_PROD**  
PR: #485  
Branch: `cerebro/brandboot-001-lab-v0`

## Purpose

Stage the deliberate addition of `BRANDBOOT-001 · Brand Bootstrap & Brand Manual Engine` to the canonical engine registry without changing PROD or silently rewriting the existing 177-engine contract.

## CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR

### CONSERVAR

The exact 177-engine seed that existed before this migration is preserved at:

`cerebro/evidence/registry-migrations/2026-10-05/engine-registry.seed.177.snapshot.json`

No legacy engine ID is deleted or renamed.

### ENTENDER

Architecture review found that the existing onboarding engines do not own the cross-cutting brand contract. `BRANDBOOT-001` produces independently versioned outputs consumed by web, app, social, email and documents: `brand.json`, design tokens, CSS, asset inventory, voice rules and brand manual.

### ENVOLVER

`BRANDBOOT-001` is added only in the isolated migration branch. Its canonical scaffold remains `SCAFFOLD`, disabled and deny-by-default. The local LAB candidate remains evidence, not proof of PROD autonomy.

### PROBAR

Required migration checks:

- registry count = 178;
- unique IDs = 178;
- every one of the previous 177 IDs is still present;
- the only addition is `BRANDBOOT-001`;
- FACT-001 generates 178 complete skeletons;
- BRANDBOOT generated config is disabled;
- BRANDBOOT permissions remain deny-by-default and cross-company access denied;
- no autonomous PROD flag;
- generation remains deterministic and idempotent;
- PR CI green before any merge.

### MEJORAR

After registry acceptance, replace the generic scaffold fields for `BRANDBOOT-001` with its full manifest/contracts/policies/events/jobs/evaluation/tribunal/observability/backup/rollback/rebuild definitions through FACT-001-compatible versioning. Do not promote directly from LAB.

### MIGRAR

Migration to `main` is allowed only after GOV-001/FACT-001 review and green CI. Merge is not automatic.

## OLD vs NEW contract

| Property | OLD | NEW staged |
|---|---:|---:|
| canonical count | 177 | 178 |
| removed legacy IDs | 0 | 0 |
| renamed legacy IDs | 0 | 0 |
| new IDs | 0 | 1 (`BRANDBOOT-001`) |
| default environment | SCAFFOLD | SCAFFOLD |
| autonomous PROD | false | false |
| additional mandatory paid AI | 0 | 0 |
| additional mandatory paid design SaaS | 0 | 0 |

## Rollback

Rollback is explicit and testable:

1. Do not merge PR #485, or revert the migration commit if already merged.
2. Restore `cerebro/registry/engine-registry.seed.json` from the preserved 177 snapshot.
3. Restore `CANONICAL_COUNT = 177` in `cerebro/factory.mjs`.
4. Restore factory tests/workflow assertions to 177.
5. Run `npm run validate`, `npm test`, and FACT-001 generation.
6. Require generated `engine_count === 177` and zero repository diff.

The candidate file and ADR may remain as historical evidence; they do not activate an engine.

## AION domain note

The existing AION website/domain is **`aionoperator.com`**. This migration does not purchase, replace, redirect or modify that domain. Domain ownership/availability is not the current blocker. Any remaining naming gate concerns trademark/sign clearance for public brand use, not domain acquisition.

## Promotion state

- Git branch: HECHO
- OLD snapshot: HECHO
- migration contract: HECHO
- OLD vs NEW regression tests: HECHO
- registry 178 in branch: HECHO
- CI: REQUIRED_GREEN
- merge to main: BLOCKED UNTIL GREEN + GOVERNANCE DECISION
- PROD activation: BLOCKED
