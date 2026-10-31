# FACT-001 · Certified Repair Worker Factory V1

Date: 2026-10-31

## Status

**HECHO / PREPROD LIVE PHYSICALLY VERIFIED.** La capacidad está integrada en `main` y su ejecución física canónica `41190222649` terminó `success` sobre `e29e669c80658882e171d5ebf6e3b9e8bdcd8dbf`. `PROD Live Deploy` quedó `skipped`, por lo que esta activación no desplegó la App en producción. La fábrica sigue sin autoridad para despachar reparaciones, fusionar cambios o escribir en PROD por sí sola.

## Objective

Convert certified, already-governed repair paths into reusable worker profiles without creating a new engine identity or a dedicated server per repairer.

The factory follows the project rule:

**CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR**

It does not replace AUTO-001, QA-001, HCI-001, APP-001, JOB-001, the existing App/CRM/Supabase relationships, or the current promotion chain.

## Canonical ownership

- Factory owner: `FACT-001`
- Repair execution owner: `AUTO-001`
- Validation: existing QA repair validator
- Independent decision: existing repair tribunal
- Shared runtime: yes
- New canonical engine identity: no
- New server/daemon: no
- Additional subscription cost: `0 €`

## V1 certified profile

V1 contains exactly one physically existing certified repair path:

- profile: `AUTO001_APP_HCI_AUTH_SHELL_ROLE_MAIN_V1`
- company: `fenix`
- repair engine: `AUTO-001`
- owner engine: `HCI-001`
- target engine: `APP-001`
- environment: `PREPROD`
- transform: `APP_AUTH_SHELL_ROLE_MAIN_V0`
- allowed file: `src/App.tsx`
- maximum changed files: `1`
- maximum line delta: `4`
- repository write concurrency: `1`

This is intentionally not multiplied into fake repair workers. More worker profiles may be added only when a real transform, validator, tribunal path and bounded mutation contract exist.

## Mandatory gates

Every accepted profile must declare and preserve:

1. verified source mapping;
2. snapshot-bound base SHA;
3. certified transform;
4. green build;
5. targeted green tests;
6. bounded diff;
7. OLD vs NEW evidence;
8. regression proof;
9. rebuild proof;
10. rollback proof;
11. independent tribunal approval.

FACT-001 itself cannot dispatch the repair workflow in V1. It only validates and packages an existing governed path. Execution authority remains with the existing AUTO-001 workflow and its policies.

## Capacity model

Repair profiles are not equivalent to physical GitHub concurrency. Repository mutation is globally serialized (`repo_write_max_concurrency=1`) to avoid conflicting writes. Read-only analysis, tests and future domain-specific preparation may fan out separately, but mutation authority stays bounded.

This design allows the global 350-useful-job pool to prioritize constructive work as more certified profiles become available, without creating 150 servers or unsafe concurrent repository writes.

## Multi-company contract

Every generated worker keeps:

- `company_id`
- `engine_id`
- `environment`
- `version`

Cross-company access is not granted by the factory.

## HUMAN_REQUIRED

Only the canonical reasons are accepted:

- `LEGAL_REQUIRED`
- `SIGNATURE_REQUIRED`
- `LOW_CONFIDENCE`
- `HIGH_RISK`
- `POLICY_CONFLICT`
- `SECURITY_INCIDENT`
- `MONEY_LIMIT`
- `CUSTOMER_HUMAN_REQUEST`

## Backup / rollback / rebuild

### Backup

The factory is git-backed. The profile registry and factory runtime are versioned files; generated bundles are disposable evidence artifacts. No production state is stored in the bundle.

### Rollback

Rollback is a normal Git revert of the factory/profile changes. No existing engine implementation is deleted or replaced.

### Rebuild

A bundle is reproducible from:

- `cerebro/registry/engine-registry.v1.json`
- `cerebro/registry/certified-repair-worker-profiles.v1.json`
- `cerebro/factory/repair-worker-factory-v1.mjs`
- the referenced existing planner/transform/validator/tribunal/workflow files.

The bundle carries a deterministic SHA-256 fingerprint.

## Observability

The workflow emits:

- worker count;
- bundle SHA-256;
- PREPROD authority state;
- repository write concurrency;
- cost state;
- PROD/Trading denial state;
- inspectable artifact containing the generated bundle and worker profiles.

Physical acceptance evidence for V1: GitHub Actions run `41190222649`, `completed/success`, on `main` SHA `e29e669c80658882e171d5ebf6e3b9e8bdcd8dbf`.

## Promotion rule

The factory capability is now live in PREPROD on `main`. A generated repair profile does not become PROD authority merely because FACT-001 can package it. PROD remains governed by the separate promotion path and policy. The next functional gate is to certify additional repair profiles from physical QA evidence, never from an inferred or invented patch.
