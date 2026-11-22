# SEO-001 · Checklist V2 · Live evidence / 2026-11-06
**Scope:** Fénix Capital `company_id=fenix` · `engine_id=SEO-001` · `environment=PREPROD`. **Status:** PARCIAL; no physical delivery or production promotion.

## Confirmed
- Handoff PR #22 `519cefb5e9fac393b87814c2d2d729c2458832fa` was exact branch head when resumed; PR open, DRAFT, unmerged. All current code added exclusively to this branch.
- PDF V2 pulled from ChatGPT Library: `FENIX_CHECKLIST_VISITA_CORDOBA_MARCA_V2_PREPROD.pdf`, 113703 bytes, 2 pages, 33 interactive fields, SHA256 `82a96dc9b1c64bf8972e44358cd5bdc121182a09aa3832b71162efc7bea7e660`. Both pages rendered/inspected; content and corporate branding retained; editorial/legal signoff not given.
- PDF V1 remains unmodified: SHA256 `59e6fb100d82eb1bf90193d9bfabb0bdc581382f60c5996c4c29d30e04a372f6`; existing V1 runtime, ledger, test suite and original PDF untouched.
- V2 manifest, separate signed-event validator (server HMAC, no client boolean), 5 new Node tests, V2-only SQL ledger and CI workflow committed.
- V2 CI `42179134087` SUCCESS 5/5, and after SQL least-privilege correction `42179572667` SUCCESS. [CI](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42179572667)
- PREPROD `hnqlnvakzaywtafeiybt`: new `public.cerebro_seo_checklist_delivery_v2` installed, V1 left untouched; migrations `seo_checklist_delivery_v2_parallel_private_20261106` and `seo_checklist_v2_restrict_service_role_permissions_20261106` successful.
- V2 RLS=on, public/anon/auth no table grants, service_role explicit SELECT/INSERT/UPDATE only (DELETE grant removed after discovery). SQL transactional insert/replay/invalid-hash test PASS then ROLLBACK; final V1 and V2 ledger row count zero.
- Storage `seo-preprod-assets` verified private, 5MiB limit, zero objects. V2 PDF not uploaded.
- WordPress `wp_get_post(52656)` on official site returned `status=draft`, modified `2026-11-05 17:32:30`, no WordPress write.

## NOT CONFIRMED / fail closed
- No authenticated file upload tool to Supabase Storage is exposed through connected server connector; no browser file-picker/control tool available in this chat. PDF V2 **not** uploaded, no file hash downloaded from bucket. Do not fabricate `storage.objects` entries or use public Adobe workaround.
- Existing live `fenix-web-lead` does not yet sign V2 HMAC event; verification **contract** is tested, real event origin is NOT connected. No secure secret provisioned by this task.
- No authenticated V2 runtime connected to actual service_role ledger writer, no Brevo 201 receipt or authorized inbox confirmation. Zero customer emails, zero commercial subscriptions. B2B/B2C & 2 newsletters only logical contracts, not physical end-to-end.
- Editorial QA, independent tribunal, backup of live integration, physical rollback and publication approval pending. No PR merge, no post publication, no modification to App/CRM/PROD/DNS/Trading.

## Rollback & preservation
- V2 is additive, does not route traffic, and has no live sender: **behavioral rollback = leave V2 disabled**. V1 keeps its pinned hash, table and code. Do NOT drop the V2 table in this task merely to claim a rollback test.
- Before activation: verify exact private storage bytes/hash + server HMAC provenance + ledger idempotence + one allowlisted test recipient and receipt, then independent QA/tribunal/backup/rollback with company-scoped permissions.
- **Next block:** supported private binary upload of exact V2 file to `fenix/seo-001/checklist-visita-vivienda-cordoba/v2/FENIX_CHECKLIST_VISITA_CORDOBA_MARCA_V2_PREPROD.pdf` with `upsert=false`, validate bytes/SHA from download; only then connect verified source event to V2 ledger and trial Brevo transactional inbox.
- **New subscriptions:** none. **Total provider cost:** not inferred from zero new subscription; Actions minutes count toward existing quota.
