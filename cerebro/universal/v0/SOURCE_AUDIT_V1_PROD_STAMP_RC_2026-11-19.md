# OPERATIVA V3 · SOURCE AUDIT V1 exact-baseline release candidate

- Baseline: physically assigned app.fenixcapital.es deployment dpl_CLD332nSYdiWArpYfM9FKEFg3quk, source SHA 3de1c9ac006dd3f295df4887cc38fb4df495a1f6
- Purpose: generate an exact 40-hex source stamp after existing Vite build; no other functionality changed
- Origin: isolated RC branch created from deployed **commit**, not main or OPERATIVA PR #81
- Constraints: no DNS, App/CRM database, auth, worker, Secret, or other PROD changes; no checkout of unrelated main, no merge of PR #81
- Required before promotion: inspect preview same commit; verify exact text/plain /PROD_SOURCE_SHA.txt, Git SHA, current app UI, 2506 profiles, auth, core App/CRM; prove alias rollback; only if all gates pass use the reviewed production release mechanism; preserve old deployment ID
- Source audit GitHub workflow is unmodified and will only return GREEN once new physical artifact is serving its exact SHA
- State: CANDIDATE, never autonomously label PROD READY without evidence
