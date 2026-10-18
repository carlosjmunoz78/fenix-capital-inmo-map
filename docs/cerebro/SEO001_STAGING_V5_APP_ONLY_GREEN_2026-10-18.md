# SEO-001 · STAGING V5 · APP_ONLY_GREEN

- company_id: `fenix`
- engine_id: `SEO-001`
- environment: `STAGING`
- version: `V5`
- status: `STAGING_V5_APP_ONLY_GREEN`
- production_change_allowed: `false`
- production_touched: `false`
- accepted_at_utc: `2026-10-18T22:44:53Z`

## Acceptance evidence

Canonical acceptance head: `30b1dac802c710db23f243207bce20493ece58ee`.

GitHub Actions run: `39173418605` · `CEREBRO Fenix STAGING V5 Acceptance` · conclusion `success`.

Playwright summary:
- tests_total: `85`
- passed: `61`
- failed: `0`
- intentionally skipped by viewport/single-run design: `24`

The responsive matrix covers HOME, LOCAL B2C core, LOCAL B2C duplicate cluster, LOCAL B2B, PROFILE, PRODUCT, PROCESS, RESOURCE, ARTICLE, CONTACT and LEGAL at 320, 390, 768, 1024 and 1440 px.

## H1 · Jaén

Status: `GREEN`.

Three fresh loads passed with:
- zero page errors,
- no `elementorFrontendConfig is not defined`,
- no accidental Elementor frontend on the non-Elementor Jaén page,
- CEREBRO native-form runtime/config present,
- form popover opened and rendered 10 controls on each load.

Human visual verification: accepted by operator in this session: Jaén loads and displays correctly.

## H2 · Complianz / consent

Status: `GREEN` for STAGING acceptance.

- CI verified no analytics/pixel requests before consent.
- GitHub Actions region did not receive the geo-targeted banner; this is recorded explicitly in the QA annotation rather than treated as a false failure.
- Operator in Spain confirmed the cookie banner is visible and works correctly.

No direct database/options bypass was used.

## H3 · final STAGING acceptance

Status: `GREEN`.

All five final workflow jobs succeeded: visual/responsive/consent plus four Lighthouse jobs.

Current Lighthouse baselines:

| Target | Performance | Accessibility | SEO* | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|
| Home desktop | 99 | 93 | 66 | 601 ms | 0.0004 | 66.5 ms |
| Home mobile | 99 | 93 | 66 | 1865 ms | 0 | 0 ms |
| Córdoba local mobile | 97 | 98 | 66 | 2487 ms | 0 | 35 ms |
| Montilla B2B mobile | 93 | 93 | 66 | 3062 ms | 0 | 5 ms |

\* STAGING intentionally discourages indexing. Live verification: `robots.txt` contains `User-agent: *` + `Disallow: /`, and WordPress reports `discourage_search_engines=true`. Therefore the STAGING Lighthouse SEO score must not be interpreted as the intended PROD indexability score.

## Header / menu

Status: `GREEN`.

The requested oversized-menu review is closed by automated and visual evidence:
- mobile content starts at 93 px,
- desktop content starts at 104.109375 px,
- acceptance threshold is <= 220 px,
- mobile and desktop screenshots show a compact header/menu.

No live menu correction was applied because the current header/menu already passes and changing it would violate the one-causal-variable / preserve-existing rule without evidence of a defect.

## Runtime and rollback

Preserved:
- CEREBRO Universal Operator `0.1.7-rc8` active.
- Core Guard `1.0.0-rc12` preserved.
- CEREBRO Pro-Free Compatibility V0 `0.1.4-preprod` restored to the expected active state after drift was detected.

Backup before restoring Pro-Free:
- SHA256: `f8207346163f79db572bc54bccf06dad6a42efc112cba9e4f9a487972d0a6ceb`

A final SEO CEREBRO canary passed with `fixed_verified` and snapshot evidence after the acceptance run preparation.

## Contract / dependency delta

No existing App, CRM, Supabase, Notion, WordPress PROD, SEO production content, Training, automation or trading dependency was removed or replaced.

H1 remains an additive PREPROD compatibility fix around the existing Universal runtime. The expected Pro-Free compatibility layer remains active in STAGING. PROD was not touched.

## Existing canonical evidence retained

Per the anti-loop contract, already accepted canonical L01–L25 / Gold / CITY COMPLETE evidence from the handoff was not re-audited merely to regenerate the same evidence. The final V5 run is the post-fix regression gate layered on top of that accepted baseline.

## Autonomy / promotion state

- STAGING application acceptance: `GREEN`.
- Autonomous PROD promotion: `NOT_AUTHORIZED` by this mission.
- Human exception: `NONE` remaining for STAGING V5 closure.
- next_block: `CITY_LONGFORM_SUBBLOCKS_V4` / subsequent SEO plan, while PROD remains unchanged until a separately authorized promotion gate.

## Changelog

1. Installed and verified the independent H1 dependency wrapper in STAGING.
2. Restored expected Pro-Free compatibility layer after detected drift, with backup first.
3. Corrected QA assertions to follow the actual live native-form popover contract.
4. Made consent acceptance geo-aware without weakening the pre-consent privacy gate.
5. Added and passed an explicit mobile/desktop menu/header size gate.
6. Closed final V5 regression with 0 failed tests and all Lighthouse jobs successful.

## Rebuild note

Rebuild must preserve the canonical branch test files, H1 wrapper source/artifact, Universal `0.1.7-rc8`, Pro-Free `0.1.4-preprod`, Core Guard, Complianz configuration, STAGING noindex/disallow policy and the final acceptance workflow. Re-run V5 acceptance before any future promotion.