# FACT-001 · D1 compare-and-swap content checkpoint · CANDIDATE ONLY

The original D1 `cerebro-fact001-recovery-lab-eu` is shared with other FACT-001 LAB processes. No schema mutation is allowed until a **current, independently retained SQL snapshot**, dependency inventory, regression/rollback and OLD/NEW acceptance are verified.

Cloudflare D1 original database UUID `1305f791-7c44-47f9-946b-f330a09c88aa`, jurisdiction EU. Read-only inventory on 2026-11-11: 9 tables plus `_cf_KV` and 2 indexes, 2 legacy audit triggers. Time Travel bookmark `000000a6-00000002-0000511f-03a9492600e8e978aef555ea5b45fc2a`. Native D1 SQL export API reported `status=complete`, **but the signed export URL was not independently downloaded and hashed**. This does NOT pass the mandatory independent backup gate.

The new files only define a separate `fact001_notion_content_checkpoint_v1` table, append-only audit and atomic CAS `UPDATE ... WHERE ... AND content_next_offset=:prior AND cas_version=:old ... RETURNING`. A complete, remote readback-verified archive is required before increment. First 25-page archive is verified in Drive: `1sGt2mXOLwK0AJCxfRNr8fY-dYVHjrR5p`, SHA256 `e38acdbaea08a7e79ca7e74636fb2781b39b483db346f1bc3d6fa5509c7e2f65`.

Run `python3 -m unittest discover -s tests -p test_cas.py` in this directory. This is a **local SQLite test**, not a successful D1 deployment, and not a physical Notion restore. Existing D1 remains unmodified. Do not apply migration or advance checkpoint to 50 without verified contents, external SHA readback and separate D1 backup gate.