# Human Operator Dependency Map V0

Status: `DEFINED / ISOLATED / NO_SHARED_RUNTIME_CHANGE`

## Canonical dependencies to preserve

| Dependency | State used by Human Operator | Rule |
|---|---|---|
| `QA-001` | EXISTENTE | Human Operator emits physical evidence into QA; never duplicates QA ownership. |
| `QAB-001` / `REG-001` | EXISTENTE | Existing process/regression ownership remains canonical. |
| CEREBRO Human Intelligence / `SIM-001` | EXISTENTE | Reuse synthetic population and conversation gym; no second persona engine. |
| `HCI-001` | EXISTENTE/PARCIAL by surface | Owns human experience/conversation-quality findings. |
| `IAM-001` credential broker | EXISTENTE | Authorize credential refs; local vault resolver sits behind it later. |
| `IAM-001` lifecycle | EXISTENTE | Reuse health/expiry/kill-switch/browser attestation. |
| `ROUTE-001` | EXISTENTE | Preserve route selection; Human Operator is an execution adapter, not a new router. |
| Browser Bridge | PARCIAL | Do not claim live until fresh physical attestation. |
| Playwright | EXISTENTE | Deterministic Chrome baseline. |
| agent-browser Skill wrapper | EXISTENTE advisory | Reuse evaluation knowledge; do not execute upstream skill code through current synthetic wrapper. |
| `VOICE-001` | EXISTENTE/PARCIAL physical by path | Reuse for later voice testing; do not create voice runtime. |
| `LRN-001` / RSI | EXISTENTE | Verified findings may enter existing learning loop only through canonical QA/LRN path. |
| `EVA-001` / `JDG-001` | EXISTENTE | Required before promotion. |

## New logical components in this package

These are logical/adaptor components, not new engine IDs:

- `HumanOperatorJobV0`
- `HumanOperatorEvidenceV0`
- `NightRunnerV0`
- `AdaptiveConversationLabV0`
- `MorningReportV0`
- Browser Adapter selection layer
- future Local Secret Resolver adapter behind IAM-001

## Data flow

```text
Mission / Job
  -> IAM/ROUTE policy
  -> Human Operator
  -> Browser Adapter
  -> Chrome dedicated profile
  -> App/Web/Chat/Voice surface
  -> Evidence
  -> QA-001
  -> owner engine / REG/QAB
  -> LRN-001 only when verified
  -> EVA/JDG / OLD vs NEW
  -> promotion only when authorized
```

## Secret flow

```text
credential_ref
  -> IAM-001 authorization
  -> Secret Resolver
  -> encrypted backend
  -> in-memory lease
  -> login/refresh
```

No secret value is allowed to flow into job JSON, evidence, morning report, Git, telemetry or conversation transcript.

## Collision guard while Skills are active

Allowed changes now: only new files under `cerebro/human-operator/`.

Frozen until shared work stabilizes:
- `cerebro/skills/**`
- `FACT-001`
- capability evolution runtime
- canonical IAM/ROUTE files
- QA/LRN shared runtime
- Browser Bridge live implementation
- App/CRM/Supabase/WordPress PROD
- Trading

## Cost boundary

Additional cost target: `0 EUR`.
