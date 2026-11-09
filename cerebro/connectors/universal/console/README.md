# FACT-001 Owner Console v33 shadow integration · 2026-11-09

DEFINIDO + TESTABLE · OFF by default · PR #44 DRAFT · NOT DEPLOYED.

Source `supabase/functions/cerebro-console-gateway-v0/index.ts` in branch is verified byte-identical to deployed v33. Git blob SHA `44241c6abc3cb89560500336e332f0628219d0fc`.

Pure overlay adds a single `GET cloudflare-inventory` route after existing owner validation, but the compile-time flag `FACT001_CONSOLE_CF_OWNER_ENABLED=false` remains OFF. When eventually gated ON, the old owner JWT is forwarded server-side only to the separate LAB canary, which repeats `CARLOS-ADMIN` role checks and does only fixed GET D1 and Workers. Strict 4D response check, rate limit HTTP 429 fail closed and no retries. No generic Cloudflare write API and no new credentials in the browser.

Golden regression ensures the initial source SHA, old chat/health/engines/contract/preferences routes, exact add-only patch, and byte-identical rollback. It refuses any drift and cannot automatically deploy anything. No App/CRM, DNS, Supabase PROD Gateway, Worker, GitHub main or token modifications.

Owner positive E2E remains blocked: Opera App shows 'Acceso seguro' / 'Entrar' and needs the actual user to sign in. Cloudflare OAuth management of API tokens still denied 403; user-owned dashboard creation of minimal-scope token required. Physical owner canary and scoped token must both pass before any live main-console promotion.
