# MAKE-001 · GSC direct access unblock

Status: BLOCKED BY GOOGLE SEARCH CONSOLE PERMISSION

Live diagnostic 2026-09-28:
- OAuth/JWT token creation from the existing service account: PASS (HTTP 200)
- Search Console sites.list: PASS but returns zero sites for the service account
- searchAnalytics.query for https://fenixcapital.es/: HTTP 403
- Google error: service account lacks permission to the Search Console property

Service account that must be granted Search Console access:
`fenix-cerebro-preprod@fenix-capital-455809.iam.gserviceaccount.com`

This is not a credential problem and not a Supabase problem. The account authenticates
correctly; it simply has no permission on the property.

Prepared replacement:
- Edge Function `cerebro-gsc-notion-sync-preprod` ACTIVE v1
- defaults to dry_run=true
- custom CEREBRO cron-secret auth
- direct GSC Search Analytics page metrics
- compares against Notion data source SEO · Inventario y Control de URLs
- writes only Clics GSC, Impresiones GSC, CTR GSC, Posición media and Fecha última captura
  when explicitly invoked with dry_run=false
- no AI/model call

Current dry-run intentionally stops at GSC with HTTP 403. Once the service account is
added as a Search Console user, rerun the same dry-run; no code/config change should be
required.

Make scenarios kept until parity:
- 9694039 Google bridge: KEEP, because SEO-001 currently uses it as fallback.
- 9597710 GSC 30d -> Inventario Notion: KEEP until direct replacement passes OLD-vs-NEW.

Redundant standalone reads already disabled, not deleted:
- 9538231 GA4 páginas 30d · Vigilancia semanal
- 9550706 Search Console · Vigilancia semanal

Rollback for those reads: reactivate each scenario.

Potential next saving after permission:
- GSC -> Notion recent runs use roughly 142-150 Make credits/week (~600/month order).
- direct CEREBRO path should use existing Google, Supabase and Notion capacity, additional subscription 0 EUR.


## Update after Search Console permission grant

GREEN:
- Service account now appears on Search Console as `siteFullUser`.
- GSC `sites.list` = HTTP 200.
- GSC `searchAnalytics.query` = HTTP 200.
- Direct GSC->Notion dry-run on the exact historical Make window
  2026-08-25..2026-09-22 returned **103 GSC rows**, exactly matching the 103-row
  Make source run from 2026-09-23.
- Current Notion inventory contains 63 rows; 38 matched the historical GSC set,
  65 were GSC-only, and 22 matched rows would change if applied today.
- Differences in individual metrics versus the Sep-23 Make snapshot are not treated as
  a transport mismatch because the direct query was rerun later against Google and Google
  can revise finalized Search Analytics data. Query shape/property/date window are aligned.

STAGED:
- Hostinger master artifact now includes job 24 `seo-gsc-notion-sync` at
  `36 11 * * 3` UTC, preserving the existing Wednesday Make cadence.
- External control row 24 exists fail-closed with enabled=false.
- Gateway v7 can dispatch job 24 internally using service-role auth.
- Make scenario 9597710 remains ACTIVE until the physical Hostinger artifact is refreshed
  and job 24 is proven live.

NEW BLOCKER FOR FULL GOOGLE BRIDGE REMOVAL:
- The same service account still receives HTTP 403 from GA4.
- Effective GA4 property used by SEO-001 is **518454210** (legacy config 484640617 maps to it).
- Because GA4 direct access is missing, `fenix-seo-cerebro-preprod` still falls back to
  Make scenario 9694039. Do not deactivate that bridge yet.
