# VOICE-001 · Narrow React Presentation Port Policy Proposal

Version: 0.2 · 2026-11-16 · STATUS: DRAFT_POLICY_REVIEW · NO PROD PROMOTION.

## Origin
The safeguard in .github/workflows/cerebro-owned-voice-preprod.yml rejects every change to src/CerebroConsoleShell.tsx. It protects speech but blocks the strictly optional UI presentation prop in LAB PR #72 (stacked on PR #71).

This is a policy proposal, not an approved exception. No production promotion or merge is authorized by CI passing.

## Proposed fail-closed rule
- Keep all old VOICE-001 checks: voice/Gateway symbols, ANA, no privileged tokens, no Supabase changes, AnaChat unchanged, unchanged E2E voice contracts and build.
- For Console only: byte-for-byte equality with main OR exactly the three known replacements for the optional React render prop. Any additional text change fails.
- If Console changes, deny changes in voice, Gateway, auth, ANA, human controls, this verifier and this workflow in the same PR.
- Demand JARVIS LAB mode flag and canonical fallback; no legacy Markdown DOM sidecar.
- To prevent self-bypass, the verifier and its workflow may not change in the same PR as Console. This policy requires separate governance approval and promotion before it can apply to PR #72.
- Synthetic Chromium checks cannot establish a physical phone, real owner E2E, voice microphone or remote rollback.

## Evidence and re-build
node --test tests/voice001-render-port-policy.test.mjs
node scripts/voice001-render-port-guard.mjs BASE_MAIN_SHA
VOICE-001 then executes its original owned voice tests, npm build and Playwright. Review GitHub Actions on exact PR head.

## Rollback and governance
Revert proposed VOICE-001 workflow edit and remove the two new source/test files after approval. No Supabase, App PROD, CRM, DNS, secrets or model calls are changed.

company_id: fenix-capital
engine_id: JARVIS
environment: LAB
state: DRAFT_POLICY_REVIEW
human_required: POLICY_CONFLICT
cost: zero new subscriptions; GitHub CI minutes not audited

## Hardening · PR #71/#72 exact candidate
- The **complete 22-path candidate diff** is allowlisted, with no extra or missing paths accepted when Console changes.
- The embedded UI, Markdown parser, view, exception boundary, supporting modules/CSS and isolated workflow are **pinned to Git blob SHA-1 identifiers from PR #72 HEAD `ca45040b04052c1c1ea9edec45bf783f85885be6`**. The filename and blob checks are not sufficient alone as a security review; runtime voice and browser gates remain mandatory.
- A later legitimate change to the candidate will fail closed until a **new independent policy review**. Policy and Console may never be modified in the same promotion PR.
- The policy-only PR #73 is not allowed to prove production readiness by itself. The cross-branch shadow gate must exercise the exact candidate code with the exact updated policy.
