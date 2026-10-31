# FACT-001 Certified Repair Worker Factory V1 · Dependency Map

Date: 2026-10-31

Status: **DEFINED / BRANCH ONLY / NOT LIVE**

## Dependency chain

```text
FACT-001
  -> engine-registry.v1.json
  -> certified-repair-worker-profiles.v1.json
      -> AUTO-001
          -> auto001-preprod-patch-planner-v0.mjs
          -> certified patch transform
          -> QA repair validator
          -> independent repair tribunal
          -> existing AUTO-001 PREPROD patch executor workflow
              -> governed promotion path (separate authority)
```

## V1 physical binding

```text
profile AUTO001_APP_HCI_AUTH_SHELL_ROLE_MAIN_V1
  company_id=fenix
  repair_engine=AUTO-001
  owner_engine=HCI-001
  target_engine=APP-001
  transform=APP_AUTH_SHELL_ROLE_MAIN_V0
  allowed_file=src/App.tsx
  repo_write_concurrency=1
```

## Preserved systems

The factory does not replace or mutate the ownership model of:

- App Fénix / APP-001
- CRM / CRM-001
- Supabase transactional core
- WordPress / SEO
- Notion
- Training
- existing automations
- Trading LAB

No direct dependency on Supabase, Make, paid AI, a new server or a new scheduler is introduced.

## Authority boundaries

FACT-001 may validate and package a certified repair profile. It may not in V1:

- dispatch the repair;
- create a canonical engine identity;
- expand permissions;
- merge a PR;
- promote to PROD;
- write PROD/customer data;
- access Trading;
- spend money.

## Failure routing

Contract/identity drift -> `POLICY_CONFLICT`.
Unsafe authority/concurrency expansion -> `HIGH_RISK`.
Additional spend -> `MONEY_LIMIT`.
Security incident -> `SECURITY_INCIDENT`.

Only canonical HUMAN_REQUIRED reasons are permitted.

## Rebuild sources

A repair-worker bundle is rebuildable from the canonical engine registry, repair profile registry, factory runtime and the referenced existing governed repair files. Generated bundles are evidence artifacts, not source-of-truth state.
