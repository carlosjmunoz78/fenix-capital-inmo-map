# CEREBRO OS · GitHub Copilot Repository Instructions

## Mission
Work on CEREBRO OS as a multi-company, human-by-exception operating platform. Preserve existing behavior and produce evidence before promoting changes.

## Non-negotiable change rule
Always apply:

`CONSERVAR -> ENTENDER -> INVENTARIAR -> MAPEAR DEPENDENCIAS -> BACKUP -> ENVOLVER -> PROBAR -> MEJORAR -> PREPROD -> OLD vs NEW -> ROLLBACK -> PROMOCION GRADUAL`

Never use:

`BORRAR -> REHACER -> ESPERAR QUE FUNCIONE`

Do not delete, replace, archive, merge away, disable, or migrate an existing service, workflow, database, integration, repository, branch, endpoint, automation, or production behavior merely because a new implementation appears better.

## Environments and authority
- Treat PROD as closed unless the task contains explicit production authority and the relevant gates are green.
- Prefer LAB/PREPROD for implementation and evaluation.
- Never weaken RBAC/RLS, tests, policy, authentication, signatures, audit, or security controls just to make a test pass.
- Never expose secrets in code, prompts, logs, artifacts, issues, PRs, comments, or test output.
- Trading LAB is isolated from App/CRM/CEREBRO PROD credentials and execution.

## Human exception model
Normal safe/reversible work should continue automatically. Escalate only for these canonical reasons:
- LEGAL_REQUIRED
- SIGNATURE_REQUIRED
- LOW_CONFIDENCE
- HIGH_RISK
- POLICY_CONFLICT
- SECURITY_INCIDENT
- MONEY_LIMIT
- CUSTOMER_HUMAN_REQUEST

## Factory-first and reuse-first
- FACT-001 is the canonical factory path for engines/capabilities.
- Before creating a new engine, capability, service, repo, worker, table, integration, or dependency, search for an existing equivalent and prefer reuse/wrapping.
- A logical engine is not a dedicated server. Share runtimes, workers, events, observability, storage, and tooling when safe.
- Every multi-company-capable implementation must preserve `company_id`, `engine_id` or `capability_id`, `environment`, and `version` scope, or explicitly document why it is GLOBAL_ONLY.

## Cost policy
Default additional recurring cost target is 0 EUR.
Preference order:
1. deterministic SQL/Python/TypeScript/rules;
2. existing code and services;
3. local/open-source/self-hosted;
4. already-paid capacity;
5. free tier;
6. new paid service only when required and policy/ROI permits.

Do not treat Copilot or any other AI as mandatory runtime infrastructure. A CEREBRO engine may use normal code, APIs, databases, queues, tools, models, or other engines.

## GitHub Actions policy
Use GitHub Actions aggressively for work that is naturally finite and reproducible: CI/CD, tests, builds, generation, audits, evaluation, scheduled batch work, repository automation, packaging, and evidence collection.

Do NOT turn GitHub Actions into the permanent transactional runtime for customer-facing APIs, databases, always-on queues, durable application servers, or other stateful production services.

Parallelize only independent work. Prefer dynamic matrices and sharding over spawning empty jobs. One matrix must stay within GitHub's 256-job matrix limit. Concurrency is a ceiling, not a target.

## Copilot work product
When Copilot changes code:
- work on an isolated branch;
- keep changes scoped;
- add/update tests;
- state assumptions explicitly;
- compare OLD vs NEW behavior;
- provide rollback/revert path;
- leave a concise evidence trail;
- prefer a draft PR until CI/evaluation is green;
- do not merge autonomously into production branches unless an explicit governed policy already authorizes it.

## Quality and anti-loop
For failures use:

`LEER EVIDENCIA -> CLASIFICAR CAUSA -> CAMBIAR UNA VARIABLE -> PROBAR -> DOCUMENTAR -> CONTINUAR`

If the same failure family repeats three times, stop patching variants of the same approach and reassess the architecture/layer causing the failure.

## State vocabulary
Use these status labels precisely when documenting work:
- HECHO
- EXISTENTE
- PARCIAL
- DEFINIDO
- PLANIFICADO
- POR AUDITAR
- CONFIRMED_OPERATIONAL
- HUMAN_REQUIRED

Never claim `CONFIRMED_OPERATIONAL` from CI alone when physical/runtime evidence is required.

## Priority of evidence
Live repository state, current CI, current PREPROD/PROD observations, current contracts, and reproducible tests outrank historical handoff text. Historical documents are inputs, not proof of current operation.
