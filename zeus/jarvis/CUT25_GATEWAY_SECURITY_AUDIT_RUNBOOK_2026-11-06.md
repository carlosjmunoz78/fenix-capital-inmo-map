# JARVIS V2 · CUT25 · Gateway denial audit & cloud readiness

**Environment:** LAB ONLY · **PR:** #25 DRAFT · **PROD:** NO-GO  
**Certified code:** `0642a39ab2d598d6d776cfcd3c2ecfbe3b812bfd`  
**Core:** 664 PASS / 0 FAIL (run `42130273800`)  
**D1 Wrangler:** SUCCESS (run `42130273818`) — **LOCAL, not Cloudflare remote**  
**B4:** `42130273954` SUCCESS · **B7:** `42130273764` SUCCESS · **Governed:** `42130273783` SUCCESS, promotion NOT RUN.

## 1. Preserved assets and dependencies
No deletion, replacement, schema changes or deploy to Fénix App, CRM, Supabase PROD/alternate, Cloudflare existing Workers, DNS, ANA, Trading, `main` or WordPress. D1 `cerebro-jarvis-lab-cut21` (UUID `a859fde1-126b-4c40-bc0d-aec2f8839f7b`) still exists, **jurisdiction NONE**; never enrol real OWNER_ROOT there. Proposed new `cerebro-jarvis-lab-eu` remains uncreated.

## 2. CUT25 components: HECHO LAB
- `cloudflare-lab/0004_jarvis_d1_gateway_denial_audit_lab.sql` is additive, D1-only and append-only. Fixed `stage=GATEWAY`, finite classes and HTTP status, timestamp; no dynamic token, IP, user agent, URL, company, owner or session columns.
- `core/jarvis-gateway-denial-audit.mjs`: two **OFF-by-default** components. `createJarvisD1GatewayDenialAudit` stores minimal fixed metadata. `createJarvisGatewayDenialAuditWrapper` wraps the existing final gateway and records denials including those rejected by perimeter or B2 before B3 is called. No mutation route is enabled.
- Injected `quotaGuard` is MANDATORY when enabling; quota failures fail closed, but are **not logged in D1** (prevent write storm when quota exhausted). This is only a contract; distributed quota enforcement is still not implemented or measured in remote Cloudflare.
- Fail closed if database audit recording fails; valid 2xx responses are passed unchanged and rely on B3's existing immutable authorization log.
- `core/jarvis-gateway-denial-audit.test.mjs`: pre-B3 denial captured with real existing gateway components under synthetic authentication, deny classifications, no-token-leak, immutable D1 record, budget exhaustion, audit outage, successful owner read without double-counting. +10 automated tests.
- Official Wrangler workflow migrates 0004 to **LOCAL** D1, inserts synthetic denial, confirms rejection of DELETE, exports and independently restores record. All verified.

## 3. HECHO vs still not proved
**HECHO:** 664/664 Node tests + five workflows green. D1 local durability, B2/B3 synthetic tests and early denial auditing candidate.
**PARCIAL:** Gateway denial audit is not connected to deployed Worker. There is no trusted remote quota guard, actual Cloudflare runtime, server-side Vault secret, real B2/B3 identity or human-device continuity verified.
**PENDIENTE:** dedicated EU-jurisdiction D1; remote backup, restore, migration, Worker/Gateway read-only binding and security evidence; OWNER_ROOT live enrolment and minimal grants; two physical devices; OLD vs NEW; independent Tribunal B10.
**IMPORTANT:** D1/SQLite does **not** provide PostgreSQL RLS. The system cannot automatically become PROD due to green CI.

## 4. Next execution order
1. Inspect Cloudflare for `cerebro-jarvis-lab-eu`, **create only if absent**, jurisdiction `eu` at creation and within 0€ subscription. No existing D1 mutation or deletion.
2. Establish authenticated Cloudflare *write-capable* interface or narrowly-scoped secret in a secure vault (never chat, code, logs). Current Opera connector only reads/navigates; no actions for form submission.
3. Capture Cloudflare inventory, UUID, jurisdiction, usage, backup; run 0001–0004 migrations in isolated new LAB with synthetic data and validate remote export + independently restored EU LAB DB. Verify rollback and quotas.
4. Bind trusted B2 session verification, B3 grant and D1 audit under kill switch OFF. Add distributed quota limiter, replay tests, access-denied smoke tests, two physical devices, explicit rate/cost budget.
5. Evidence/Tribunal B10 + OLD/NEW comparison. Only then seek separate promotion decision.

## 5. Rebuild and rollback
All CUT25 changes live on PR #25 DRAFT. Revert CUT25 commits if needed; **no remote D1/Worker/DNS** change exists to roll back for this cut. A deployed future Worker must be disabled first and preserve D1 backup before schema rollback.

## 6. References
- PR: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/25
- Core CI: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42130273800
- Wrangler local: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42130273818
