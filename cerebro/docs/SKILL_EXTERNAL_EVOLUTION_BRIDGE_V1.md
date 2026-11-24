# Skill Evolution Bridge V1 (candidate)
Additive adapter to existing FACT-001 / LRN-001 and skill capability evolution; no new runtime or scheduler.
- Ingress: authenticated host adapter supplies tenant/source and trusted private release catalog; proposal includes only IDs and content/evidence hashes. Baseline and revised SKILL.md remain in private storage; no chats, private documents or secrets in GitHub.
- prepareExternalSkillProposal validates scope, base release, hashes, identity and creates deterministic candidate receipt/event. It never executes instructions. Deduplicate by proposal_id in the existing outbox; consumer still has to verify evidence and admission.
- Feed candidate into existing skill admission/evaluation and skill-rsi-shadow-bridge; verify actual semantic improvement using same fixtures, tribunal and supervisor. Do not treat producer-supplied scores/gates as evidence. LRN persistence uses existing governed ingestion only.
- planExternalSkillDistribution is a pure planning function accepting gate receipts from trusted consumers, not a security boundary or publisher. Actual host authentication, private artifact storage, trusted gate-receipt verification, existing outbox/ledger binding, release update and JARVIS deployment remain pending.
- Baseline/rollback: existing skill release stays immutable during evaluation. Do not merge or enable until integration and real OLD vs NEW evidence; revert by dropping isolated branch; no deployed resources created.
- Run node --test cerebro/skills/skill-chatgpt-evolution-bridge-v1.test.mjs. Synthetic tests only, no claim of live E2E.
- Budget 0 additional; production, spend, external effects and Trading forbidden.
