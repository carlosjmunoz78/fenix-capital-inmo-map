# SEO-001 runtime snapshot

This directory is a rebuild/audit snapshot for the existing live SEO-001 components. It does not replace WordPress, Make, Notion or Supabase as their runtime owners.

- Measurement runner observed/deployed: fenix-seo-cerebro-preprod v11 (fbc83e7ff680f0d53d7cc1eb11f0a37cc50f4b4026734bf5cbd0f7a333fee416)
- Legacy PREPROD draft executor observed/deployed: fenix-seo-executor-preprod v8 (9d5e93eda0884951d14075b609ec65e3f34849c827f45fd120d8e9cb880822a5)
- Canonical low-risk repair execution is WordPress-native `fenix-seo-cerebro` + Core Guard. The legacy Supabase draft executor is fail-closed while its old WordPress application credential is stale and is not required for autonomous PROD.
- Google measurement uses official APIs first and the already-owned Make OAuth path as zero-new-cost fallback.
- No secrets are stored in this repository snapshot.

Rebuild order: schema migrations → measurement runner → validate company fail-closed → fresh measurement → WordPress STAGING canary → Core Guard inventory batches.
