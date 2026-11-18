# V8 -> V9 · Supabase Activity strict CORS, isolated Vercel production-config stage
Date: 2026-11-18. The existing owner-only edge function CEREBRO_CONSOLE_ACTIVITY_V0 on PROD denies browser preflight from Vercel stage `fenix-capital-preprod-eptv5utjp.vercel.app` because the strict `ALLOWED_ORIGINS` set only contains app.fenixcapital.es (+ www).
Do not alter auth, tenant, JWT, read-only verbs, origin policy wildcard, or routes.
V9 candidate adds ONLY the exact controlled stage origin. Deploy after the specific regression test is green; keep `verify_jwt=true` and existing source v8 SHA as immutable rollback artifact.
Stage source is isolated and production-config: `dpl_788PWZ4DJtQsf1bXPjyEPxbfbwT6` from Git SHA `011336cf6be7d01fb2502f5e4ac3360044fbeedd`, deployed with --prod --skip-domain. Public PROD alias remains `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h`.
Success requires observed OPTIONS=204, GET=200 **only for valid authenticated owner** and 401/403 for outsiders; owner CI secret still stale and must not be ignored. Restore index.ts from `backup/cerebro-console-activity-v8-index.ts` if stage source regression appears.
