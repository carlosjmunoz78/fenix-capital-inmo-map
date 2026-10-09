# CEREBRO Skills Email + Human Approval V0

Issue: #547

Status: DEFINED / implementation branch only

Scope: finish the executive skills email agreed with Carlos and prepare safe human approval from email without touching PROD or Trading.

## Executive email contract

The email body must prioritize business meaning over technical internals.

Required top summary:
- What new capability CEREBRO gained.
- What is advancing.
- What was discarded or parked.
- Whether Carlos needs to do anything.
- Incremental cost, when known.

Only changes since the previous report should occupy the main body. Unchanged skills should be collapsed into a count.

For each relevant skill:
- What it really is.
- Why CEREBRO wants it.
- Real example in Fénix/CEREBRO.
- Human-friendly state: TERMINADA / EN PRUEBAS SEGURAS / EN CONSTRUCCIÓN / APARCADA / NECESITA A CARLOS.
- What changed since the previous report.
- What is still missing.
- What CEREBRO will be able to do when finished.
- Where it will be used.
- Measured or explicitly unknown impact on time, quality and cost.
- Next automatic step.
- Carlos: NO ACTION or the exact required action.
- Decision: INTEGRAR / SEGUIR PROBANDO / APARCAR / DESCARTAR.

Technical details (engine IDs, versions, commits, tests, SHAs, logs) remain available for audit but must not dominate the email.

## Human approval CTA contract

Only show action buttons for a real HUMAN_REQUIRED reason:
LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST.

Preferred actions:
- AUTORIZAR
- RECHAZAR
- EXPLÍCAME
- APARCAR

Security requirements:
- GET/opening the email or link MUST NOT authorize anything.
- Link scanners/prefetchers MUST NOT be able to approve.
- Authorization must resolve to the authenticated CEREBRO/App session and execute as POST.
- The request must be scoped to one exact action and environment.
- Single-use + idempotency required.
- Expiry required.
- Audit record required: actor, action, scope, environment, timestamp, decision, reason/reference.
- Existing Gateway/approval mechanisms must be wrapped, not duplicated.
- No expansion of PROD permissions from this feature.

## Environment rule

Implementation and validation start in LAB/PREPROD. PROD stays unchanged until explicit promotion gates pass.
