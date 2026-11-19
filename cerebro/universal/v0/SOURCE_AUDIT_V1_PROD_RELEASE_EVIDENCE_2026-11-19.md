# CEREBRO OS · OPERATIVA V3 · SOURCE AUDIT V1 · RELEASE EVIDENCE

Date: 2026-11-19 (Europe/Madrid)
Scope: **only** deterministic build identity / physical source audit. No database, auth, permissions, CRM, DNS, Cloudflare, or content changes.

## Baseline and exact source
- Previous PROD commit: `3de1c9ac006dd3f295df4887cc38fb4df495a1f6`
- Previous PROD deployment (rollback available, READY): `dpl_CLD332nSYdiWArpYfM9FKEFg3quk`
- New physical PROD commit: `914144a5d83d5ec79d1b8c77367a60f7c15d756f`
- New physical PROD deployment READY: `dpl_EXDsPFMDd5J7mD1WqpVasUsV6mvf`
- Vercel team: `team_qnh6u1Ofy2WPp0MGEKlyMA50`
- Vercel project: `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV`
- Active verified alias: `app.fenixcapital.es` -> new deployment
- Git compare from old production source: one commit, four changed files; no app UI or runtime code modified.
- Fix: generate `dist/PROD_SOURCE_SHA.txt` at build, fail closed for malformed/conflicting/missing provenance.

## Physical gates
- 5/5 Node.js source stamp unit tests PASS (local isolated test; Node 22).
- Vercel Git preview candidate `dpl_FMyU34dqdyUUuDXvDkKrDvjytLdw` READY; exact SHA file confirmed via authenticated Opera browser.
- LAB alias rollback drill: alias from new preview -> previous READY production deploy -> back to preview, both mappings confirmed.
- Production-target Vercel build: `dpl_EXDsPFMDd5J7mD1WqpVasUsV6mvf` READY; build log includes `SOURCE_STAMP_EMITTED_SHA_VALID`.
- Physical PROD `https://app.fenixcapital.es/PROD_SOURCE_SHA.txt` confirmed from Opera browser with exact SHA `914144a5d83d5ec79d1b8c77367a60f7c15d756f`.
- Physical PROD OPERATIVA V3 loaded in authenticated Opera: 2506 source-linked profiles and 179 registered motors visible.
- GitHub `CEREBRO PROD Source Audit V1` rerun #44481227840 job 135740845672: SUCCESS, read/verification, artifact upload and summary SUCCESS. Artifact `cerebro-prod-source-audit-44481227840`, ID 14555079252, SHA256 digest `6d1aa21113b0afb3579716945a7622aa43a3ebaba3dc43fda43c93dd6bc5da22`.
- Historical run #44393772348 rerun job 135741372531: SUCCESS, verification/artifact/summary SUCCESS.
- Vercel recent runtime-errors query: none returned within a 20-minute window; not a complete E2E or security certification.

## Known remaining gates (explicitly NOT green)
- OPERATIVA V3 universal autonomous controls are not certified; 2477 profiles still lack runtime verification.
- PR #81 is DRAFT/unmerged and has broader QA/CERT/CONSOLE controls. This deployment did **not** promote PR #81 or activate FACT/UMS.
- The production fix is on the exact-baseline release branch, **not merged into the divergent main**. Future releases must explicitly carry forward `scripts/emit-prod-source-stamp.mjs`; never roll back to main blindly.
- This doc-only follow-up commit (if any) is **not** the physical production commit. Only `914144...` is deployed.

## Rollback
If any application regression is observed, confirm the custom domain's currently assigned deployment, then reassign or request rollback to `dpl_CLD332nSYdiWArpYfM9FKEFg3quk`, confirm domain mapping and /cerebro functionality; the older build lacks the Source Audit stamp, so the audit will turn red after rollback. LAB alias switch/reversal was physically rehearsed; PROD rollback was not invoked because post-deploy checks passed.

## Policy
CEREBRO factory-first; no false full green. Backups/rollbacks and exact source identity are part of release gate. Cost: no new subscriptions, marginal platform usage not measured.
