# FACT001 Pages LAB pre-DDL physical bookmark

Verified Cloudflare Recovery D1 `1305f791-7c44-47f9-946b-f330a09c88aa` snapshot bookmark **`00000156-00000002-00005120-fb09bc7ecaf4db07c39adda366dfcf1b`**, before adding Pages tables. Neither `fact001_cf_pages_jobs_v1` nor `fact001_cf_pages_owned_v1` existed. Existing 14 Workers, private operator `cerebro-fact001-headless-operator-lab-20261111` at version `02698b93-2e22-4855-ac89-65ef22e24d75`, `*/5 * * * *` active, subdomain/preview OFF; bindings `CF_PAGES_TOKEN` secret_text, `CF_WORKERS_TOKEN` secret_text and `RECOVERY_DB` D1. Pages projects list contained only preexisting `fenix-capital-inmo-map`. Target project `cerebro-fact001-managed-pages-lab-a001` absent.

Only create additive LAB tables from `pages-schema.sql`. Never restore the entire shared D1 database for rollback; preserve existing jobs and all Fénix workflows. No DNS or App/CRM changes.
