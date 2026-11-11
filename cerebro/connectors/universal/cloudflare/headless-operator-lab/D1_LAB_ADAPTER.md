# CEREBRO FACT001 Cloudflare D1 logical engine LAB

Physical D1 Free databases at capacity 10/10. This adapter performs create/update/rollback/logical-delete only in its own additive LAB table, with D1 bound to the existing private Worker and an independent idempotent queue. No new D1, no deletion of database, no schema mutation beyond the three explicitly prefixed tables, no App/CRM/PROD access. Single job per cron with owner/scope verified on every operation and durable readback. No independent D1-create at 10/10 capacity. Current signed service intake covers Workers/Pages, D1 new command ingress remains to be separately certified.

## Physical pre-DDL snapshot · 2026-11-11

Recovery D1 UUID `1305f791-7c44-47f9-946b-f330a09c88aa`, bookmark **`0000015a-00000004-00005120-bed2e83bb78ad84f1f0f0ee0468ec756`**, before new `fact001_cf_d1_*` tables: none existed. Worker `cerebro-fact001-headless-operator-lab-20261111` at `72e6fd58-a306-49aa-b5df-92a7fa6f8d4a`, 3 bindings (`CF_WORKERS_TOKEN`, `CF_PAGES_TOKEN` as secrets, `RECOVERY_DB` D1), `*/5 * * * *`, private, 14 Workers. Only pre-existing Pages project `fenix-capital-inmo-map`. NEVER restore entire shared D1 using bookmark. Rollback D1 only via isolated own values and code version.
