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
