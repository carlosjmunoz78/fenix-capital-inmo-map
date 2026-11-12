# FACT-001 · CEREBRO Console → ACTGW-001 → Universal Core → Cloudflare E2E LAB

**Scope:** original CEREBRO Gateway V0/ActionGateway V1 code, separate `cerebro` identity and Fénix Capital Cloudflare Account, GitHub Actions isolated branch. ADDITIVE: no change to production Console/Gateway/App/CRM, no Cloudflare mutation, cost increase 0 €.

**Physical test:** dedicated GitHub Actions workflow `.github/workflows/cerebro-actgw-cloudflare-physical-readonly-lab.yml` runs code path `CerebroGatewayV0.execute → bindConsoleToActionGatewayV1 → ActionGatewayV1.execute → makeCerebroAdapter.execute → UniversalConnectorCore.execute → CloudflareOfficialApi.perform` with real Cloudflare credentials stored in GitHub Actions Secret, GET-only D1 and Workers. Identity supplied by CI runtime, no credentials in command/logs. Verify D1 count, Workers count, result, audit at all three layers, mutation count 0.

**Important distinction:** The test physically executes **CEREBRO's control-plane code in isolated GitHub Actions**, not an online CEREBRO PROD Gateway deployment. Live PROD Gateway connection is **still not proven** and requires separate reviewed deployment and signed identity/permissions. Do not call CEREBRO PROD operational solely on success of this test.

**Guardrails:** exact account, one company, LAB core and PREPROD ACTGW contracts; no user-provided URLs, paths, SQL, API endpoints, token or shell. Real requests all GET. Reject arbitrary/trusted-principal mismatches. This does not use the official MCP (403 on previous attempt) and needs no ChatGPT Work or paid services. Rollback: revert isolated files in PR #44, no remote Cloudflare resource to revert.
## Physical acceptance evidence · 2026-11-09

- FIRST real CEREBRO code-path GitHub Actions [#42679609267](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42679609267): SUCCESS; 9/9 gateway tests pass. True D1 count 8, Workers scripts count 6, Facebook D1 exists, 2 CEREBRO command routes, 2 ACTGW actions, 2 FACT-001 audit events, 0 Cloudflare writes. Code executed in isolated GH runner.
- FULL regression + physical repeat [#42680213195](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42680213195): SUCCESS; 9/9 Gateway tests PASS; full universal connector 77/77 PASS, 0 FAIL; 4-dimensional catalog valid with 49 capabilities and 2 clients. Then Cloudflare GET confirmed D1=8 and Workers=6, 0 writes.
- Separate ChatGPT normal path [#42677693830](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42677693830) and repeat [#42678166836](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42678166836): two independently triggered real Cloudflare API GET audits with 14/14 tests each, no ChatGPT Work.
- GitHub Actions secret status verified ACTIVE and Account Resources/Account Detail/Workers API all returned HTTP 200 in [diagnostics #42680043694](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42680043694); this does NOT prove official MCP OAuth validity, which remains HTTP 403 based on [#42674163697](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42674163697).
- Scope gaps remain: R2 and Logpush GET returned PERMISSION_BLOCKED. Do NOT assert full Cloudflare coverage or that those products are missing.
- Supabase deployed function inventory was read-only verified: `cerebro-console-gateway-v0` ACTIVE v33, current deployed source did not include explicit `cloudflare` or `FACT-001` references. Existing PROD function untouched; **this CI execution is NOT proof of a live PROD Gateway hookup**.

## OLD vs NEW and acceptance decision

OLD: existing Console/ACTGW source and dual-client mock tests; no physical CEREBRO→Cloudflare E2E. NEW: additive isolated CI harness reuses OLD modules unmodified, executes actual Cloudflare GET with CEREBRO principal and verifies Console/ACTGW/FACT-001 audit at all layers. **Accept LAB / READ-ONLY ONLY.** Do not promote to PROD or claim all writes enabled. No new subscriptions, App/CRM/DNS/Worker/Instagram changes, or token disclosures.

## Gates for live CEREBRO runtime

1. Inventory and snapshot current deployed CEREBRO Gateway v33; compare stable routes, identity verification, and key dependencies. No in-place replacement.
2. Provide independent trusted CEREBRO gateway principal verification and vault-backed Cloudflare read-only token, no untrusted `authorized:true` as sole proof. Never copy the broad administrator GitHub secret into public clients.
3. Test isolated external LAB runtime or parallel canary with existing signed gateway controls and full 4D context, cost=0; verify real GET and 3-layer audit from the **deployed** runtime.
4. CI 77/77 + physical read gate; log/trace/backup/rollback; OLD vs NEW comparison; user-controlled safe promotion only after all physical gates green.
5. Expand per-service writes only with least-privilege scoped credentials and separate backups, idempotency, rollback and Free-quota proof. No changes in App/CRM or protected main during this phase.

Rollback while PR DRAFT: revert or close the isolated PR branch; no Cloudflare change to undo. The deployed Supabase functions remain untouched.
